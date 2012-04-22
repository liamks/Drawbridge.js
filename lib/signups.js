// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

var fs = require('fs'),
    _ = require('underscore')._,
    jade = require('jade'),
    util = require('./util');

module.exports = SI = function(drawbridge, options){
  this.drawbridge = drawbridge;
  this.app = drawbridge.app;
  this.db = drawbridge.db;
  this.email = drawbridge.email;

  var options = options || {};
  this.shouldSendConfirmationEmail = typeof options.signUpEmail === 'object' ;

  var signupEmailTemplate = fs.readFileSync(this.app.settings.views + '/drawbridge/email/signup.jade');
  this.signupEmailTemplate = jade.compile(signupEmailTemplate);

  /* TODO: if template has been specified should see if it actually exists first */
  this.signUpEmailInfo = options.signUpEmail;
  this.makeRoutes();
};


SI.prototype.makeRoutes = function(){
  var beforeCreate = [ this.createGetParams.bind( this ),
                       this.createEmailValid.bind( this ),
                       this.createAddToDB.bind( this ) ];

  this.app.post('/signup', beforeCreate, this.create.bind( this ) );
}


SI.prototype.createGetParams = function( req, res, next ){
  req.info = {
        email : req.param('email') ,
        ip  : req.header('x-forwarded-for') || req.connection.remoteAddress ,
        time : new Date() ,
        requestURL : req.header('Referrer')
      };
  next();
}

SI.prototype.createEmailValid = function( req, res, next){
  if(!util.isEmailValid(req.info.email)){
    res.json( "invalid email address", 500 );
  }else{
    next();
  }
}

SI.prototype.createAddToDB = function( req, res, next ){
  this.db.addToWaitlist( req.info, (function( err, obj ){
    if(err){
      res.json( "A technical error has occured, sorry.", 500 );
    }else{
      next();
    }
  }).bind(this));
}

/*
We don't wait to see if the email is successful, if we do it
adds lots of latency to the user signing up. Just assume email is working.
At this point we know it's stored in our database, so we can still
invite the user.
*/
SI.prototype.create = function(req, res){
  var info = this.signUpEmailInfo;

  if( this.shouldSendConfirmationEmail && (process.env.NODE_ENV !== 'test' )){
    info.html = this.signupEmailTemplate({ email : req.info.email });
    this.email.send( req.info.email, info );
  }
  res.json(''); // success 
}


