// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

var redis = require('redis').createClient(),
    uuid = require('node-uuid'),
    _ = require('underscore')._;


module.exports = RD = function(){};

/*

waitlist ( sorted set )
invited ( hash )
unconfirmed ( hash )
users ( sorted set )
screenNames ( hash )
resetPasswords ( hash )
rememberMe ( hash )

USER OBJECT:

email = {
  email (it is convient to include it )
  stage ( 1, 2, 3, 4 ) - ( waitlist, invited, registred but not confired, full user )
  wl_ip           - IP address associated with user's wait list signup
  wl_time         - time user signed-up
  wl_requestURL   - source of signup (e.g. where the signup for was )

  inv_token       - Invite Token 
  inv_time        - Time of invite

  unc_token       - Unconfirmed token, for confirming registration
  unc_time        - time registration form was submitted

  password
  screenName
  createdAt

  lastLogin
  lastLoginIP

  passwordResetToken
  passwordResetTime
}
*/


RD.prototype.addToWaitlist = function( info, cb){
  var userInfo = {
    email : info.email,
    stage : 1,
    wl_ip : info.ip,
    wl_time : info.time,
    wl_requestURL : info.requestURL
  };

  redis.multi()
    .hmset( info.email, userInfo )
    .zadd( 'waitlist', info.time.getTime(), info.email )
    .exec( cb );
}

RD.prototype.getWaitlist = function( cb ){
  redis.zrange('waitlist', 0, -1, (function( err, results){
    if(err){
      cb( err, results);
    }else{
      this.hgetallArray( results, cb );
    }
  }).bind(this));
}

RD.prototype.inviteSignup = function( email, cb ){
  var invitedAt = new Date(),
      token = uuid.v4();

  // Need to check if they already have an invite
  redis.hget(email, 'inv_token', function( err, tok){
    if(!tok){
      redis.multi()
        .hmset( email, 'inv_token', token, 'inv_time', invitedAt, 'email', email )
        .hset( email, 'stage', 2 )
        .zrem( 'waitlist', email )
        .hset( 'invited', token, email )
        .exec( function(err, res){ cb( err, token ) } );
    }else{
      // Even though they've already been invited we still need to remove
      // them from the waiting list.
      redis.zrem('waitlist', email, function( err, res){
        cb( null, tok );
      });
      
    }
  })
}


// Should only be called if email sending fails
RD.prototype.undoInvite = function( email, token ){
  redis.multi()
    .hset( email, 'stage', 1 )
    .zadd( 'waitlist', email )
    .hdel( 'invited', token )
    .exec();
}


RD.prototype.getInvites = function( cb){
  redis.hvals('invited', (function(err, results){
    if(err){
      cb( err, results );
    }else{
      this.hgetallArray( results, cb );
    }

  }).bind(this))
}

RD.prototype.getDashBoardValues = function( cb ){
  var currentTime = Date.now();
  redis.multi()
    .zcount('waitlist', 0, currentTime)
    .hlen('invited')
    .hlen('unconfirmed')
    .zcount('users', 0, currentTime)
    .exec(function(error, results){
      if(error){
        cb( error, null);
      }else{
        cb( null, {
          'numWaitlist'     : results[0],
          'numInvited'      : results[1],
          'numUnConfirmed'  : results[2],
          'numUsers'        : results[3]
        });
      }
    });
}

RD.prototype.isScreenNameBeingUsed = function( screenName, cb ){
  redis.hget('screenNames', screenName && screenName.toLowerCase(), cb );
}

RD.prototype.checkInviteToken = function( token, cb ){
  redis.hget( 'invited', token, cb );
}


RD.prototype.findUserByEmail = function( email, cb ){
  redis.hgetall( email, cb );
}

RD.prototype.findUserByScreenName = function( screenName, cb ){
  redis.hget( 'screenNames', screenName && screenName.toLowerCase(), (function( err, email ){
    this.findUserByEmail( email, cb )
  }).bind(this));
}

/*
user.email may differ from the email they signed up with
must grab the old email using the invited token. If
the new email !== match old email most copy values from the 'old'
user to the 'new one'

*/

RD.prototype.createUnactivatedUser = function( user, cb ){
  var inviteToken = user.inviteToken,
      registrationEmail = user.email;
  
  /* get invited email */

  redis.hget( 'invited', inviteToken, (function( error, inviteEmail ){
    if( inviteEmail === registrationEmail ){
      this.createUnactivatedUserHelper( user, cb );
    }else{
      /*
      The user has signed up with an email address that differs from
      the one they are registering with. As a result we change the key
      from the invite email to registration email.
      */

      redis.rename( inviteEmail, registrationEmail, (function( error, result ){

        if( error ){
          cb( error, result );
        }else{
          user.email = registrationEmail;
          this.createUnactivatedUserHelper( user, cb );         
        }

      }).bind(this) )
    }

  }).bind( this ));

}

RD.prototype.createUnactivatedUserHelper = function( user, cb ){
  var token = user.confirmationToken,
      email = user.email;

  redis.multi()
    .hmset( email, 'unc_token', token, 
                   'unc_time', new Date(), 
                   'password', user.password )
    .hincrby( email, 'stage', 1 )
    .hdel( 'invited', user.inviteToken )
    .hset( 'unconfirmed', token, user.email )
    .exec( function(err, res) {
      if(!err && user.screenName ){
        redis.multi()
          .hset( email, 'screenName', user.screenName )
          .hset( 'screenNames', user.screenName, email )
          .exec( cb )
      }else{
        cb( err, res );
      }
    });
}


RD.prototype.activateUser = function( token, cb ){

  redis.hget( 'unconfirmed', token, function(err, email){
    if(!email || err){
      cb('', 'Confirmation token does not exists, or there is an error...');
    }else{
      /* Confirmation token exsits */
      var createdAt =  new Date();

      redis.multi()
        .hset( email, 'createdAt', createdAt )
        .hincrby( email, 'stage', 1 )
        .hdel( 'unconfirmed', token )
        .zadd( 'users', createdAt.getTime(), email )
        .hgetall( email )
        .exec( function(err, results){ cb( err, results[4] )});
  
    }

  });
}

RD.prototype.logUserIn = function( email, ip_addr, cb ){
  redis.hmset( email, 'lastLogin', new Date(), 'lastLoginIP', ip_addr, cb );
}


RD.prototype.getUsers = function( cb ){
  redis.zrange('users', 0, -1, (function( err, results){
    if(err){
      cb( err, results);
    }else{
      this.hgetallArray( results, cb );
    }
  }).bind(this));
}

RD.prototype.createSuperUser = function( options, cb ){
  options.superUser = true;

  redis.multi()
    .hset( 'superUsers', options.email, '')
    .hmset( options.email, options )
    .exec( function(){ cb && cb();} );
}


RD.prototype.saveResetPasswordToken = function( email, token, cb ){
  redis.multi()
    .hset( 'resetPasswords', token, email )
    .hset( email, 'passwordResetToken', token )
    .hset( email, 'passwordResetTime', new Date() )
    .exec( cb );
}

RD.prototype.checkResetPasswordToken = function( token, cb ){
  redis.hget( 'resetPasswords', token, cb );
}

RD.prototype.resetPassword = function( token, newPassword, cb ){
  redis.hget( 'resetPasswords', token, function( err, email){

    if( err ){
      cb( err, null );
    }else if( email == null ){
      cb( "Password reset token does not match", null );
    }else{

      redis.multi()
        .hdel( 'resetPasswords', token )
        .hset( email, 'password', newPassword )
        .hset( email, 'passwordResetToken', '' )
        .hgetall( email )
        .exec( function( err, results ){
          cb( err, results[3] );
        });
    }

  });
}


RD.prototype.saveRememberMe = function( sessionID, email, cb ){
  redis.multi()
    .hset( 'rememberMe', sessionID, email )
    .hset( email, 'sessionID', sessionID)
    .exec( function(){ cb && cb(); } );
}

RD.prototype.getRememberMe = function( sessionID, cb ){

  if( !sessionID ) {
    return cb( null, null );
  }

  redis.hget( 'rememberMe', sessionID, function( err, email ){
    redis.hgetall( email, cb );
  });
}

RD.prototype.destroyRememberMe = function( email, cb ){
  redis.hget( email, 'sessionID', function( err, sessionID ){

    if( err ){
      cb && cb( err, "Database error" );
    }else if( sessionID == null ){
      cb && cb( null , null );
    }else{

      redis.multi()
        .hdel( email, 'sessionID' )
        .hdel( 'rememberMe', sessionID )
        .exec( function(){ cb && cb(); } );
    }

  });
}


RD.prototype.changeUsersAttributes = function( email, obj, cb ){
  var keys = _.keys( obj ),
      multi = redis.multi();

  for (var i = keys.length - 1; i >= 0; i--) {
    multi.hset( email, keys[i], obj[keys[i]] );
  };

  multi.exec( cb );
}

/*************** helpers ***************/


RD.prototype.hgetallArray = function( array, cb ){
  var multi = redis.multi();

  for (var i = array.length - 1; i >= 0; i--) {
    multi.hgetall( array[i] );
  };

  multi.exec( cb );
}


