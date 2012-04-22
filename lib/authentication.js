// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

var fs = require('fs'),
    bcrypt = require('bcrypt'),
    uuid = require('node-uuid'),
    util = require('./util'),
    jade = require('jade');



module.exports = Auth = function( drawbridge, options ){
  this.drawbridge = drawbridge;
  this.app = drawbridge.app;
  this.db = drawbridge.db;
  this.email = drawbridge.email;
  this.options = options || {};

  var confirmEmailTemplate = fs.readFileSync( this.app.settings.views + '/drawbridge/email/confirm.jade' );
  this.confirmEmailTemplate  = jade.compile( confirmEmailTemplate );

  var resetPasswordTemplate = fs.readFileSync( this.app.settings.views + '/drawbridge/email/reset.jade' );
  this.resetPasswordTemplate = jade.compile( resetPasswordTemplate );

  this.makeRoutes();
}


Auth.prototype.makeRoutes = function(){
  var setToken = this.setToken.bind( this ),
      checkToken = this.checkToken.bind( this );
      valReg = this.validateRegistration.bind( this );
      checkReg = this.checkValidation.bind( this );
      checkTok = this.checkInviteToken.bind( this );
      checkEmail = this.checkEmail.bind( this );
      hashPass = this.hashPassword.bind( this );
      authSup = this.authenticateSuperUser.bind( this );
      checkResToken = this.checkResetToken.bind( this );
      checkPass = this.checkPassword.bind( this );

  this.app.get('/register/:token?', [setToken, checkTok], this.register.bind( this ));
  this.app.post('/register', [checkToken, checkTok, checkEmail, valReg, checkReg, hashPass], this.processRegister.bind( this));

  this.app.get('/confirm/:token', this.confirmRegistration.bind(this));

  this.app.get('/login', [setToken], this.login.bind( this ));
  this.app.post('/login', this.processLogin.bind( this ));

  this.app.get('/logout', this.logout.bind( this ));

  this.app.get('/forgot-password', [setToken], this.forgotPassword.bind( this ));
  this.app.post('/forgot-password', this.processForgotPassword.bind( this ));

  this.app.get('/reset/:resetToken', [setToken, checkResToken], this.resetPassword.bind( this ));
  this.app.post('/reset', [checkToken, checkResToken, checkPass, hashPass], this.processResetPassword.bind( this ));

  

}

Auth.prototype.setToken = function( req, res, next ){
  req.session.drawbridgeToken = req.session.drawbridgeToken || uuid.v4();
  next()
}

Auth.prototype.checkToken = function( req, res, next){
  var sessionToken = req.session.drawbridgeToken,
      formToken = req.param('token'),
      message = 'There was a problem, sorry...';

  if( sessionToken !== formToken ){
    res.render('drawbridge/error', { status : 403, message: message, title : message });
  }else{
    next();
  }
}


Auth.prototype.register = function( req, res ){
  var options = {
    inviteToken : req.params.token,
    token : req.session.drawbridgeToken , 
    useScreenName :this.options.enableScreenName, 
    screenName : '',
    email: req.invite ? req.invite.email : '',
    title: 'Register',
    termsOfService: this.drawbridge.termsOfService,
    errors : [],
    password: '',
    confirmPassword : ''
  }

  res.render( 'drawbridge/authentication/registration', options);
  
}


Auth.prototype.checkInviteToken = function( req, res, next ){
  if(!this.drawbridge.waitlist){
    next();
  }

  var inviteToken = req.params.token || req.param('inviteToken');
  this.db.checkInviteToken( inviteToken, function( err, email ){
    if(err || email === undefined || email === null ){
      res.render('drawbridge/error', { 
        status: 500, 
        message: 'Sorry, but you need an invitation to register.', 
        title: 'error' 
      });
    }else{
      req.invite = { email : email };
      next();
    }

  })
}

Auth.prototype.checkEmail = function( req, res, next ){
  var email = req.param('email'),
      inviteToken = req.param('inviteToken');

  req.errors = [];
  if( !util.isEmailValid( email )){
    req.errors.push('The email entered does not appear to be valid.');
    next();
  }else{
    this.db.findUserByEmail( email, function(err, user){

      if(err || ( user.stage !== undefined && user.inv_token !== inviteToken )){
        req.errors.push('An account with that email already exists');
      }
      next();

    });
  }
}


Auth.prototype.validateRegistration = function( req, res, next ){
  var errors = req.errors;
  req.registration = registration = {
    email : req.param('email'),
    password : req.param('password'),
    confirmPassword :req.param('confirmPassword'),
    screenName :  req.param('screenName'),
    inviteToken : req.param('inviteToken'),
    useScreenName :this.options.enableScreenName, 
    termsOfService: this.drawbridge.termsOfService,
    tos : req.param('tos'),
    token : req.param('token')
  };

  req.registration.errors = errors;


  if( !registration.password || registration.password.length < 6){
    errors.push('The password must be greater than 6 characters.');
  }

  if( registration.password !== registration.confirmPassword){
    errors.push('The passwords do not match.');
  }

  if( this.drawbridge.termsOfService && registration.tos === undefined ){
    errors.push('You must agree to the terms of service.');
  }


  if(this.options.enableScreenName){

    if( registration.screenName == ''){
      errors.push('Screen name must not be blank.');
    }else{

      return this.db.isScreenNameBeingUsed( registration.screenName, function( err, data ){
        if( data!== null){
          errors.push('Screen name "' + registration.screenName + '" is already taken.');
        } 
        next()
      });
    }
  }


  next()
}

Auth.prototype.checkValidation = function( req, res, next ){
  if( req.registration.errors.length > 0){
    req.registration.title = "Register";
    res.render('drawbridge/authentication/registration', req.registration );
  }else{
    next();
  }
}

Auth.prototype.hashPassword = function( req, res, next ){
  bcrypt.genSalt( 10, function( err, salt ){
    bcrypt.hash( req.registration.password, salt, function( err, hash ){
      req.registration.password = hash;
      next();
    });
  });
}

Auth.prototype.processRegister = function( req, res ){

  var options = {}, 
      emailOptions = this.options.confirmationEmail, 
      link = '';

  req.registration.confirmationToken = uuid.v4();
  link = req.header('host') + '/confirm/' + req.registration.confirmationToken;


  this.db.createUnactivatedUser( req.registration, (function(err, result){
    if( err ){
      options.message = 'A technical error occured, try again later!';
      options.status = 500;
      options.title = "Technical error" 
      res.render( 'drawbridge/error', options );
    }else{
      emailOptions.html = this.confirmEmailTemplate({ link : link });

      this.email.send( req.registration.email, emailOptions, function(err, obj){
        if(err){
          options.message = 'Sorry, our email system is wonky, try again later.';
          options.status = 500;
          options.title = "Technical error" 
          res.render( 'drawbridge/error', options );
        }else{
          res.render('drawbridge/authentication/confirmationSent', {
            title: 'Confirmation Sent',
            email: req.registration.email
          });  
        }

      });

    }
  }).bind(this));
}



Auth.prototype.confirmRegistration = function( req, res ){
  var options = {};
  this.db.activateUser( req.params.token, (function( err, response ){
    if( err ){
      options.message = response || "Sorry, we are experiencing problems with our database, try again later";
      options.status = 500;
      options.title = "Registration error"
      res.render( 'drawbridge/error', options );
    }else{
      this.drawbridge.afterLoginFn( res, response );
    }
  }).bind(this));
}


Auth.prototype.login = function( req, res ){
  var options = {
    email : '',
    title : 'Login',
    token : req.param('token'),
    errors : []
  }
  res.render( 'drawbridge/authentication/login', options );
}

Auth.prototype.processLogin = function( req, res ){
  /* check referrer */
  var opt = {
        email : req.param('email'),
        token : req.param('token'),
        rememberMe : req.param('rememberMe'),
        errors : [ "The password and email do not match" ],
        title : "Login"
      },
      password = req.param('password');

  this.db.findUserByEmail( opt.email, (function( err, user ){

    if( err || user === null || user.password === undefined ){

      res.render( 'drawbridge/authentication/login', opt );
    }else{
      bcrypt.compare( password, user.password, (function( err, match ){

        if( err || !match ){
          res.render( 'drawbridge/authentication/login', opt );
        }else{
          var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
         
          this.db.logUserIn( user.email, ip, (function( err, result ){
            if(err){
              opt.errors = ["We're experience technical problems, sorry."]
              res.render( 'drawbridge/authentication/login', opt );
            }else{
              req.session.user = user;
              if( opt.rememberMe ){
                this.db.destroyRememberMe( user.email );
                this.db.saveRememberMe( req.sessionID, user.email );
                res.cookie('rememberMe', req.sessionID, { maxAge: 900000000 })
              }

              if(user.superUser){
                res.redirect('/admin/');
              }else{
                this.drawbridge.afterLoginFn( res, user );
              }
              
            }

          }).bind(this));

        }
      }).bind(this));
    }
  }).bind(this));
}

Auth.prototype.logout = function( req, res ){
  this.db.destroyRememberMe( req.session.user && req.session.user.email );
  res.clearCookie('rememberMe');
  req.session.user = undefined;
  res.redirect('/login');
}

Auth.prototype.forgotPassword = function( req, res ){
  var options = {
    title : 'Forgot Password',
    email : '',
    errors : [],
    token : req.session.drawbridgeToken
  };
  res.render('drawbridge/authentication/forgotPassword', options );
}

Auth.prototype.processForgotPassword = function( req, res ){
  var options = {
    token : req.param('token'),
    email : req.param('email'),
    errors : ['Email address: "' + req.param('email') +'" was not found in our database.'],
    title: "Reset Error"
  },
    viewPath = 'drawbridge/authentication/forgotPassword',
    emailOptions = this.options.forgotPassword,
    link;

  if(options.email == ''){
    return res.render( viewPath, options );
  }

  this.db.findUserByEmail( options.email, (function( err, user ){
    var msg = "Sorry, we are experiencing problems with our database, try again later";
    if( err ){
      this.errorPage( res, msg, 500, "Forgotten Password error" );
    }else if( user.stage !== '4' ){
      /* user does not exist, or is not fully registered */
      res.render( viewPath, options );
    }else{
      var token =  uuid.v4();
      this.db.saveResetPasswordToken( options.email, token, (function(error, obj ){

        if(error){
          this.errorPage( res, msg, 500, "Forgotten Password error" );
        }else{

          link = req.header('host') + '/reset/' + token;
          emailOptions.html = this.resetPasswordTemplate({ link : link });

          this.email.send( options.email, emailOptions, (function(err, obj){

            if(err){
              this.errorPage( res, "Error sending email password reset", 500, "Email Password Reset Error" );
            }else{
              options.title = "Password Has Been Reset";
              res.render( 'drawbridge/authentication/resetSent', options );
            }

          }).bind(this));

        }

      }).bind(this));
      
    }

  }).bind(this));

}

Auth.prototype.checkResetToken = function( req, res, next ){
  req.resetToken = req.param('resetToken') || req.params.resetToken;

  this.db.checkResetPasswordToken( req.resetToken, (function( err, obj ){

    if( err ){
      this.errorPage( res, "Database error", 500, "Database error" );
    }else if( !obj || obj.length === 0 ){
      this.errorPage( res, "Reset Token not found", 500, "Reset Token Error" );
    }else{
      next();
    }

  }).bind( this ));

}

Auth.prototype.resetPassword = function( req, res ){
  var options = {
    title : 'Reset Password',
    errors : [],
    token : req.session.drawbridgeToken,
    resetToken : req.resetToken
  };

  res.render('drawbridge/authentication/resetPassword', options );
}

Auth.prototype.checkPassword = function( req, res, next ){
  var options = {
    title : 'Reset Password',
    errors : [],
    token : req.session.drawbridgeToken,
    resetToken : req.resetToken
  }, 
  password = req.param('password'),
  confirmPassword = req.param('confirmPassword');

  if( password + confirmPassword === ''){
    options.errors.push( 'Passwords must not be blank' );
  }else if( password !== confirmPassword ){
    options.errors.push( 'Passwords do not match' );
  }else{
    req.registration = { password : password };
    return next();
  }
 res.render('drawbridge/authentication/resetPassword', options );
}


Auth.prototype.processResetPassword = function( req, res ){
  var hashedPassword = req.registration.password;
  this.db.resetPassword( req.resetToken, hashedPassword, (function( err, user ){
    if( err ){
      this.errorPage( res, "Database Error", 500, "Database Error" );
    }else{
      /* Password has been updated, log user in */
      req.session.user = user;
      this.drawbridge.afterLoginFn( res, user );

    }
  }).bind( this ));
}

Auth.prototype.errorPage = function( res, message, status, title ){
  var options = {
    message : message || "Error",
    status : status || 500,
    title : title || "Error"
  };

  res.render('drawbridge/error', options );
}




Auth.prototype.authenticateUser = function( req, res, next ){
  var rememberMeToken = req.cookies.rememberme;


  if( ! req.session.user ){
    this.db.getRememberMe( rememberMeToken, (function( err, user ){
      
      if( err || !user || !user.stage ){
        res.redirect('/login');
      } else {
        req.session.user = user;
        next();
      }

    }).bind( this ));
    
  }else{

    next();
  }
}



Auth.prototype.authenticateSuperUser = function( req, res, next ){
  var rememberMeToken = req.cookies.rememberme;

  if(  !req.session.user || !req.session.user.superUser  ){

    this.db.getRememberMe( rememberMeToken, (function( err, user ){
      
      if( err || !user || !user.stage ){
        res.redirect('/login');
      } else {
        req.session.user = user;
        next();
      }

    }).bind( this ));
    
  }else{
    next();
  }
}

Auth.prototype.currentUser = function( req ){
  return req.session.user;
}

