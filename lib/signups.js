// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

var fs = require('fs'),
    _ = require('underscore')._,
    jade = require('jade'),
    util = require('./util');


/*

 Constructor function
*/
module.exports = SI = function(drawbridge, options){

  this.drawbridge = drawbridge;
  this.app = drawbridge.app;
  this.db = drawbridge.db;
  this.email = drawbridge.email;

  var options = options || {};
  this.shouldSendConfirmationEmail = typeof options.signUpEmail === 'object' ;

  var signupEmailTemplate = fs.readFileSync(this.app.settings.views + '/drawbridge/email/signup.jade');
  this.signupEmailTemplate = jade.compile(signupEmailTemplate);

  var inviteEmailTemplate = fs.readFileSync(this.app.settings.views + '/drawbridge/email/invite.jade');
  this.inviteEmailTemplate = jade.compile( inviteEmailTemplate );

  /* TODO: if template has been specified should see if it actually exists first */
  this.signUpEmailInfo = options.signUpEmail;
  this.inviteEmailInfo = options.inviteEmail
  this.makeRoutes();
};


SI.prototype.makeRoutes = function(){
  this.app.post('/signup', this.create.bind( this ) );

  /* need authentication for these */
  var authSup = this.drawbridge.authenticateSuperUser.bind( this );

  this.app.get( '/admin/', [authSup], this.dashboard.bind( this ));
  this.app.get( '/admin/signups', [authSup], this.signups.bind( this ) );
  this.app.post( '/admin/invite-signup', [authSup], this.inviteSignup.bind( this ) );
  this.app.get( '/admin/invites', [authSup], this.invites.bind( this ) );
}

SI.prototype.create = function(req, res){

  var info = {
        email : req.param('email') ,
        ip  : req.header('x-forwarded-for') || req.connection.remoteAddress ,
        time : new Date() ,
        requestURL : req.header('Referrer')
      };

  if(!util.isEmailValid(info.email)){
    res.json( "invalid email address", 500 );
  }else{

    this.db.addToWaitlist(info, (function(err, obj){

      if(err){
        res.json( "database error", 500 );
      }else{

        if( this.shouldSendConfirmationEmail ){
          this.sendEmail( info.email, function(err, obj){

            if(err){
              this.app.logger(err);
              res.json("error sending email", 500 );
            }else{
              res.json(''); // success
            }
          })
        }else{
          res.json(''); // success
        }
      }

    }).bind(this));

  }
}

SI.prototype.signups = function(req, res){
  this.db.getWaitlist((function(err, data){
    if(err){
      res.render('drawbridge/error', { status: 500, message: 'datatbase error', title: 'error'})
    }else{
     res.render('drawbridge/signup/signups', { signups : data, title : 'signups'} );
    }
    
  }).bind(this));
}

SI.prototype.inviteSignup = function(req, res){
  var acceptedEmails = req.param('person'),
      host = req.header('host'),
      numSent = 0;

  if(acceptedEmails === undefined){
    return res.redirect('/admin/signups');
  };

  if(typeof acceptedEmails === 'string'){
    acceptedEmails = [ acceptedEmails ];
  };

  for (var i = acceptedEmails.length - 1; i >= 0; i--) {
    this.sendRegistrationEmail( acceptedEmails[i] , host, function(){
      numSent += 1;
      if(numSent == acceptedEmails.length ){
        res.redirect('/admin/signups');
      }

    });
  };
 
}

SI.prototype.generateTokenAndInvite = function( email, cb ){
  this.db.inviteSignup( email, function(err, token ){
    if(err){
      cb( err, '' );
    }else{
      cb( null, token );
    }
  });
}


SI.prototype.sendRegistrationEmail = function( email, host , cb ){

  this.generateTokenAndInvite(email, (function( err, token ){

    if( ! err ){
      var registrationLink = host + '/register/' + token ,
          options = { email : email, registrationLink :  registrationLink } ,
          content = this.inviteEmailTemplate( options ) , 
          info = this.inviteEmailInfo;

          info.html = content;
          this.email.send( email, info, cb );
    }

  }).bind(this) )

  
}







SI.prototype.sendEmail  = function(email, cb){
  var info = this.signUpEmailInfo;
  info.html = this.signupEmailTemplate({ email : email });
  this.email.send( email, info, cb );
}


SI.prototype.invites = function( req, res ){
  this.db.getInvites((function(err, data){
    if(err){
      res.render('error', { status: 500, message: 'datatbase error', title: 'error'});
    }else{
     res.render('drawbridge/signup/invites', { invites : data, title : 'Invites'} );
    }
    
  }).bind(this));
}

SI.prototype.dashboard = function( req, res ){
  this.db.getDashBoardValues( function(err, data){
    if(err){
      res.render('error', { status : 500, message: 'database error', title: 'error'});
    }else{
      res.render('drawbridge/dashboard/dashboard', { vals : data, title : 'Dashbaord'})
    }
  })
}
