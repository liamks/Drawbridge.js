// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

var Signups = require('./signups'),
    db = require('./db'),
    email = require('./email'),
    Auth = require('./authentication'),
    path = require('path'),
    fs = require('fs'),
    bcrypt = require('bcrypt'),
    Dashboard = require('./dashboard');

exports = module.exports;

/* I know some don't like the use of _this
  but I'm not sure how to get rid of it for authenticateUser without
  making developers add bind to every authenticate user call...
*/
var _this;
exports.up = function( expressApp ){
  return new DrawBridge( expressApp );
}

function DrawBridge(expressApp){
  _this = this;
  this.app = expressApp;
  this.appRoot = path.resolve( this.app.settings.views, '..' );
  this.config = require( path.join(this.appRoot, 'drawbridge.config.json') );

  var tos = this.config.authentication.termsOfService;
  
  this.termsOfService = tos ? fs.readFileSync( path.join(this.appRoot, tos), 'utf8') : null;

  this.db = db.getDB( this.config.db );
  this.email = email.getEmail( this.config.email );

  this.afterLoginFn = function( res, user ){
    res.redirect('/');
  }
  
  this.dashboard = new Dashboard( this, this.config.signups )
  this.waitlist = false;
  this.authentication = new Auth( this, this.config.authentication );

  if( this.config.signups ){
    this.signups( this.config.signups );
    this.waitlist = this.config.signups.waitlist;
  }

  if(this.config.superUser){
    var salt = bcrypt.genSaltSync(10),
        password = bcrypt.hashSync( this.config.superUser.password, salt );
    this.config.superUser.password = password;
    this.db.createSuperUser( this.config.superUser );
  }



}


DrawBridge.prototype.signups = function(options){
  this.signups = new Signups( this, options );
  return this;
}

DrawBridge.prototype.afterLogin = function( fn ){
  this.afterLoginFn = fn;
}

DrawBridge.prototype.authenticateUser = function( req, res, next ){
  _this.authentication.authenticateUser( req, res, next );
}

DrawBridge.prototype.authenticateSuperUser = function( req, res, next){
  _this.authentication.authenticateSuperUser( req, res, next );
}

DrawBridge.prototype.currentUser = function( req ){
  return this.authentication.currentUser( req );
}


DrawBridge.prototype.getUser = function( obj, cb ){
  if( obj.email ){
    _this.findUserByEmail( obj.email, cb );
  }else if( obj.screenName ){
    _this.findUserByScreenName( obj.screenName, cb );
  }else{
    cb( "Must specify either an email or screenName", null );
  }
}

DrawBridge.prototype.changeUsersAttributes = function( email, obj, cb ){

}

DrawBridge.prototype.getUsers = function( cb ){
  _this.db.getUsers( cb );
}

DrawBridge.prototype.getWaitlist = function( cb ){
  _this.db.getWaitlist( cb );
}

DrawBridge.prototype.getInvited = function( cb ){
  _this.db.getInvites( cb );
}






