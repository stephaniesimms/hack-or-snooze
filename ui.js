// global currentUser variable
let currentUser = null;

// global storyList variable
let storyList = null;


$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitStoryForm = $("#submit-story-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $favoritedArticles = $("#favorited-articles");
  const $navFavorites = $("#nav-favorites");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $loggedInNav = $("#logged-in-nav");
  const $navSubmitStory = $("#nav-submit-story");

  

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

/**
 * Event listener for submitting new story.
 *  If successful we will add a new story to the story list.
 */
  $submitStoryForm.on("submit", async function(evt){
    evt.preventDefault();
    
    let user = currentUser;
    let author = $("#author").val(); 
    let title = $("#title").val();
    let url = $("#url").val();
    let username = currentUser.username;
    
    let newStory = {
      story: {
        author: author,
        title: title,
        url: url,
        username: username
      }
    };

    newStory = await storyList.addStory(user, newStory);
    
    //HTML prepend story to storylist
    $allStoriesList.prepend(generateStoryHTML(newStory.story));
    // hide form and reset
    resetSubmitStoryForm();

  })

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event Handler for Submitting Story
   */

  $navSubmitStory.on("click", function() {
    //Show the Submit Story Form
    $submitStoryForm.slideToggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * Event handler for Navigation to Favorites page
   */
  $("body").on("click", "#nav-favorites", async function() {
    hideElements();
    await generateFavorites();
    $favoritedArticles.show();
  });

  /**
  * Event handler for updating starred favorites
  */
  $("body").on("click", ".star", async function(evt) {
    if (!currentUser) {
      return null;
    }
    const $star = $(evt.target);
    $star.toggleClass("far fas");
    
    const $storyId = $star.parent().attr('id');

    if ($star.hasClass("fas")) {
      User.postFavoritedStory(currentUser, $storyId);
    } else {
      User.deleteFavoritedStory(currentUser, $storyId);
    }

    // console.log($star.parent().attr('id'))
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

/**
* A rendering function to run to reset and hide the story form
*/

  function resetSubmitStoryForm() {
    // hide the forms for logging in and signing up
    $submitStoryForm.slideToggle();

    // reset form
    $submitStoryForm.trigger("reset");
  }

  /**
   * A rendering function to call the StoryList.getFavorites static method,
   *  which will generate a story list instance. Then render it.
   */

  async function generateFavorites() {
    // get instance of StoryList
    const favoritesStoryList = await StoryList.getFavorites(currentUser);
    //update our global variable
    storyList = favoritesStoryList;
    //empty that part of the page
    $favoritedArticles.empty();

    generateStoryListHTML(storyList, $favoritedArticles);
  }



  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    //first param storyList second param dom parent element to append to
    generateStoryListHTML(storyList, $allStoriesList);
  }


  // loop through all of our stories and generate HTML for them

  async function generateStoryListHTML(storyList, parent) {
    const favoritesList = await StoryList.getFavorites(currentUser);

    const favoritesListIds = [];

    if (favoritesList) {
      for (let story of favoritesList.stories) {
        favoritesListIds.push(story.storyId)
      }
    }

    for (let story of storyList.stories) {
      const isFavorited = favoritesListIds.includes(story.storyId)

      const result = generateStoryHTML(story, isFavorited);
      parent.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, isFavorited) {
    let hostName = getHostName(story.url);

    let starClass = "fa-star star";
    if (isFavorited) {
      starClass = starClass + " fas"
    } else {
      starClass = starClass + " far"
    }

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="${starClass}"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitStoryForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favoritedArticles,
    ];

    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $loggedInNav.removeClass("hidden");
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
