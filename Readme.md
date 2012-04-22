# Drawbridge.js

[Rational and Screencast for Drawbridge.js](http://liamkaufman.com/blog/2012/04/21/adding-authentication-waiting-lists-and-sign-ups-to-and-express-app-using-drawbridge-and-redis/)

[![Build Status](https://secure.travis-ci.org/liamks/Drawbridge.js.png)](http://travis-ci.org/liamks/Drawbridge.js)

## About Drawbridge

Drawbridge.js is a Node.js module for adding authentication, waiting lists and account invitations to an Express.js application. Drawbridge stores all its data in a **Redis** database obviating migrations or slow queries. Drawbridge.js includes an admin panel to view those on the waiting list, sent invitations and app users.

The goal of Drawbridge is to create a password authentication module that requires as few lines of code to add authentication to your app. While drawbridge creates a views and email templates you are free to change their content - only the names of the templates and views need to stay the same.

**The Good** Drawbridge makes it extremely easy to add authentication to your express.js app. Drawbridge uses bcrypt to hash passwords and Redis to store its data. 

**The Bad** Drawbridge still needs a lot of work, and should be considered an alpha product.

**The Ugly** The code needs to be better organized, commented, refactored and much more thoroughly tested.

## The Basics

### To Install

```javascript
npm install drawbridge.js -g
```

### To Use

In the root of your express application's directory, from the terminal:

```bash
drawbridge build
```

The `drawbridge build` shell command will create a number of views, email templates, a Terms of Service text file, and a configuration file (drawbridge.config.json). It is important that you modify the values on the configuration file before you get started - if you do not, emails will not be sent. See the drawbridge.config.json section below for more details. Also note that the express app was created using the `--sessions` switch, to add support for sessions.

```javascript
var express = require('express')
  , routes = require('./routes')
  , drawbridge = require('drawbridge');

var app = module.exports = express.createServer();

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(express.logger());
});

// start drawbridge using .up()
drawbridge = drawbridge.up( app );

// provide a function to be called after a user login
drawbridge.afterLogin( function( response, user ){
  response.redirect('/' + user.screenName );
});

// A route with authentication
app.get('/:screenName', drawbridge.authenticateUser, function(req, res){ 
  res.json( drawbridge.currentUser( req ) )
})

// Routes
app.get('/', routes.index);
app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
```

### Authentication

Drawbridge provides all the basic password authentication services and views. It provides:

1.  login view and routes
2.  logout view and route
3.  password reset view and routes
4.  password reset email templates, with link for resetting password
5.  registration view and routes, with email confirmation template
6.  functions for adding authentication to a given route
7.  An optional Terms of Service that will be shown to the potential user at registration

### Waiting lists

Many new applications start with a sign-up form that put potential users on a waiting list. Drawbridge.js provides the code for both the sign-up form and the functionality to store the sign-up data, and notify the potential user, via email, that the sign-up was successful. To add the sign-up form to your site see the "View Partial" section below.

### Invitations

The app's admin can then use Drawbridge.js's admin view to manually invite each user ( if there is interest inviting users could be automated ). Once a user is invited, they are sent an email with a registration link that includes a unique token. After a user register they receive an email with a confirmation email. Once they've confirmed their account they're logged in.

### Email

Drawbridge.js can currently send emails using postmark or nodemailer. To use either service the drawbridge.config.json must be modified. Adding adapters for other emailing methods should be extremely easy, see `lib/email.js` and the files within `lib/email`.

**To use nodemailer:**

```javascript
  "email" : {
    "module" : "nodemailer",
    "service" : "Gmail",
    "auth" : {
      "user" : "me@gmail.com",
      "pass" : "password"
    }
  },
```

**To use postmark:**

**IMPORTANT:** To use postmark the "from" email addresses in the drawbridge.config.json file have to be registered as "Sender Signatures" within your Postmark.com account.

```javascript
  "email" : {
    "module" : "postmark",
    "APIKEY" : "********-****-****-****-************"
  },
```

## drawbridge.config.json

The drawbridge.config.json files defines all of the basic settings an configuration for drawbridge. It defines all of the "subject" and "from" values for each email type that drawbridge sends. It defines the email and database modules that it uses ( right now the only database is Redis ). It also defines a super user account that is created when drawbridge is instantiated.

The drawbridge.config.json file also has a flag for whether your app will include a waitlist ("waitlist" : true - within the "signups" sub object). If the waitlist flag is true only those invited will be able to register.

## View Partial

Drawbridge.js includes a view partial for accepting signups, for your apps waiting list. The partial also includes some javascript to submit the form's contents asynchronously to your app. When the submission is complete the form disapears.

```
!= partial('drawbridge/signup/signup.jade',{})
```

## DrawBridge Object Methods

### .afterLogin( function( response, user ) )

+  *response* express response object
+  *user* The currently logged in user object

`.afterLogin` is called directly after a user 1) logins, 2) confirms registration and 3) resets their password. If this function is not called, drawbridge will redirect to the root url.

```javascript
drawbridge.afterLogin( function( response, user ){
  response.redirect( '/users/' + user.screenName );
});
```

### .authenticateUser( request, response, next )

+   *request* express request object
+   *response* express response object
+   *next* express next function

`.authenticateUser()` is used to add authenticate to a route.

```javascript
app.get( '/account/:screenName', [ drawbridge.authenticateUser ], function( req, res){
  var screenName = req.params.screenName;
  res.render('account', { title: 'Account', screenName : screenName });
});
```

### .authenticateSuperUser( request, response, next )

+   *request* express request object
+   *response* express response object
+   *next* express next function

`.authenticateSuperUser()` is used to authenticate users with the `superUser` flag for a route.

```javascript
app.get( '/admin/settings', [ drawbridge.authenticateSuperUser ], function( req, res){
  var settings = database.getSettings();
  res.render('admin/settings', { title: 'Settings', settings : settings });
});
```

### .currentUser( request )

+   *request* express request object

`.currentUser()` returns the logged in user associated with the current request.

```javascript
app.get( '/getuser.json', [ drawbridge.authenticateUser ], function( req, res ){
  res.json( drawbrdige.getCurrentUser( req ) );
});
```

### .getUser( object, function( error, user ) )

+   *object* specifies either an email, or a screenName
+   *function* is called after .getUser() is complete

`.getUser()` takes an object that specifies either an email, or a screenName, and through the callback function returns the matching user. If there is no matching user `null` is returned.

```javascript
var aUser;

drawbridge.getUser( { email: 'john@test.com' }, function( error, user ){
  if( error ){
    throw "An error!!!"
  }else{
    aUser = user; 
  }
});
```

### .changeUsersAttributes( email, object, function( error, results ) )

+   *email* a user's email address
+   *object* contains all the key-values that will be changed for the user

`.changeUsersAttributes()` will modify the value for keys that already exist for a user. If a key in object does not exist, the key and value will be added to the user.

```javascript
var obj = {
  firstName : "Ringo",
  lastName : "Star"
};

drawbridge.changeUsersAttributes( 'ringo@test.com', obj, function( error, results ){
  if( error ){
    throw "Oh no!";
  }else{
    console.log( "Success" );
  }
});
```

### .getUsers( function( error, users ) )

+  *function* is a callback function that takes two parameters, an error, and an array with the results 

`.getUsers()` takes a callback function and returns an array with all the users in the database.

```javascript
app.get('/numUsers.json', function( req, res ){
  drawbrdige.getUsers( function( error, users ){
    res.json( users.length );
  });
});
```

### .getWaitlist( function( error, users ) )

+   *function* is a callback function that takes two parameters, an error, and an array with results.

`.getWaitlist()` takes a callback function and returns an array of objects, each object representing a person on the waiting list.

```javascript
app.get('/waitinglist', function( req, res ){
  drawbrdige.getWaitlist( function( error, users ){
    res.render('waitlist', { title : "Waitlist", waitlist : users });
  });
});
```


### .getInvited( function( error, users ) )

+   *function* is a callback function that takes two parameters, an error, and an arrow with results.

`.getInvited()` takes a callback function and returns an array of objects, each object representing a person who has been invited.

```javascript
app.get('/invited', function( req, res ){
  drawbridge.getInvited( function( error, users ){
    res.render('invited', { title : "Invited", invited : users });
  });
})
```

## Additional Information

### Maintainers

+   Liam Kaufman ( https://github.com/liamks )

## License

MIT License. Copyright 2012 Liam Kaufman. http://liamkaufman.com
