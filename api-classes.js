const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";
const TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InN0ZXBoYW5pZSIsImlhdCI6MTU2MDQ0NzgxNX0.bMHDt2YyVkJGK47h1baLMZkMf94Jf2nWPrZdhT4L6iY"
/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.*
   */

  // TODO: Note the presence of `static` keyword: this indicates that getStories
  // is **not** an instance method. Rather, it is a method that is called on the
  // class directly. Why doesn't it make sense for getStories to be an instance method?

  static async getStories() {
    // query the /stories endpoint (no auth required)
    const response = await axios.get(`${BASE_URL}/stories`);

    // turn the plain old story objects from the API into instances of the Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    const storyList = new StoryList(stories);
    return storyList;
  }

/**
  * This method is designed to be called to generate a new favorite StoryList.
  *  It:
  *  - calls the API
  *  - builds an array of Story instances from the user's favorites array
  *  - makes a single favorites StoryList instance out of that
  *  - returns the favorites StoryList instance.*
  */
  static async getFavorites(user) {
    if (!user) {
      return null;
    }
    const username = user.username; 
    const token = user.loginToken;
    
    // query the users endpoint (auth token depends on currentUser)
    const response = await axios.get(`${BASE_URL}/users/${username}/`, {
      params: {
        token: token
      }
    });

    // turn favorites obj from API into instance of the Story class
    const favorites = response.data.user.favorites.map(story => new Story(story));

    // build an instance of favorite stories using the new array of favorites 
    const favoritesList = new StoryList(favorites);
    return favoritesList;
  }

  /**
   * Function to make a post request for a new story submission.
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   * If successful we will be able to add a new story to the story list.
   */
  async addStory(user, newStory) {
    const postRequest = {
      token: user.loginToken,
      story: {
        author: newStory.story.author,
        title: newStory.story.title,
        url: newStory.story.url
        
      }
    }

    let response = await axios.post(`${BASE_URL}/stories`, postRequest);

    newStory.story.storyId = response.data.story.storyId;

    return newStory;
  }

  static async deleteStory(user, storyId) {
    let payload = {
      data: {
        token: user.loginToken
      }
    }
    const response = await axios.delete(`${BASE_URL}/stories/${storyId}`, payload);
    return response
  }
}


/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    // these are all set to defaults, not passed in by the constructor
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  /* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async create(username, password, name) {
    const response = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name
      }
    });

    // build a new User instance from the API response
    const newUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    newUser.loginToken = response.data.token;

    return newUser;
  }

  /* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password
      }
    });

    // build a new User instance from the API response
    const existingUser = new User(response.data.user);

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = response.data.token;

    return existingUser;
  }

  /** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;

    // call the API
    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {
        token
      }
    });

    // instantiate the user from the API information
    const existingUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token;

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
    return existingUser;
  }

  //user class method that deletes or posts to favorites depending on third param (axios.delete, axios.post)
  static async toggleFavoritedStory(user, storyId, request) {
    const token = {
      token: user.loginToken
    };
    const username = user.username;
    let payload;
    
    if (request === axios.delete) {
      payload = {
        data: token
      };
    } else {
      payload = token;
    }

    const response = await request(`${BASE_URL}/users/${username}/favorites/${storyId}`, payload);
    return response;
  }

  

}



/**
 * Class to represent a single story.
 */

class Story {

  /**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }
}