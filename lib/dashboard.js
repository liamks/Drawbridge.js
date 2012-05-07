var jade = require('jade'),
    fs = require('fs');


module.exports = Dash = function( drawbridge, options ){
  this.drawbridge = drawbridge;
  this.db = drawbridge.db;
  this.email = drawbridge.email;
  this.app = drawbridge.app;

  var inviteEmailTemplate = fs.readFileSync(this.app.settings.views + '/drawbridge/email/invite.jade');
  this.inviteEmailTemplate = jade.compile( inviteEmailTemplate );

  this.inviteEmailInfo = options.inviteEmail;
  
}

Dash.prototype.addAuth = function( auth ){
  this.auth = auth;
  this.makeRoutes();
}

Dash.prototype.makeRoutes = function(){
  var authSup = this.drawbridge.authenticateSuperUser.bind( this );

  var  isv = this.inviteSignupValidate.bind(this),
       st = this.auth.setToken,
       ct = this.auth.checkToken;



  this.app.get( '/admin/', [authSup], this.dashboard.bind( this ));
  this.app.get( '/admin/signups', [authSup, st], this.waitlist.bind( this ) );
  this.app.post( '/admin/invite-signup', [ authSup, isv, ct ], this.inviteSignup.bind( this ) );
  this.app.get( '/admin/invites', [authSup], this.invites.bind( this ) );
  this.app.get('/admin/users', [authSup], this.users.bind( this ));
}




/* Dashboard root view */
Dash.prototype.dashboard = function( req, res ){
  this.db.getDashBoardValues( function(err, data){
    if(err){
      res.render('error', { status : 500, message: 'database error', title: 'error'});
    }else{
      res.render('drawbridge/dashboard/dashboard', { vals : data, title : 'Dashboard'})
    }
  })
}

/* List of users on the waiting list */
Dash.prototype.waitlist = function(req, res){
  this.db.getWaitlist(function(err, data){
    if(err){
      res.render('drawbridge/error', { status: 500, message: 'datatbase error', title: 'error'})
    }else{
     res.render('drawbridge/signup/signups', { signups : data, title : 'signups', token : req.session.drawbridgeToken } );
    }
    
  });
}

/* List of invited users */
Dash.prototype.invites = function( req, res ){
  this.db.getInvites(function(err, data){
    if(err){
      res.render('error', { status: 500, message: 'datatbase error', title: 'error'});
    }else{
     res.render('drawbridge/signup/invites', { invites : data, title : 'Invites'} );
    }
  });
}
/* List of current users */
Dash.prototype.users = function( req, res ){
  this.db.getUsers( function( err, users ){
    var options = {
      users : users,
      title : "Users"
    }
    if(err){
      options.message = "Error fetching users";
      options.status = 500;
      options.title = "Databse error"
      res.render( 'drawbridge/error', options );
    }else{
      res.render( 'drawbridge/dashboard/users', options );
    }
  });
}


/**/
Dash.prototype.inviteSignupValidate = function( req, res, next ){
  var acceptedEmails = req.param('person') || [],
      singleInvite = req.param('anEmail');

  if(acceptedEmails === undefined && singleInvite == ''){
    return res.redirect('/admin/signups');
  }

  if(typeof acceptedEmails === 'string'){
    acceptedEmails = [ acceptedEmails ];
  }

  if(singleInvite && singleInvite !== ''){
    acceptedEmails.push( singleInvite );
  }

  req.acceptedEmails = acceptedEmails;

  if(acceptedEmails.length === 0){
    res.redirect('/admin/signups');
  }else{
    next();
  }
  
  
}



Dash.prototype.inviteSignup = function(req, res){
  var host = req.header('host'),
      numSent = 0,
      email;

  for (var i = req.acceptedEmails.length - 1; i >= 0; i--) {
    email = req.acceptedEmails[i];

    this.db.inviteSignup(email , (function( err, token ){

      if( !err ){
        this.sendRegistrationEmail( email , host, token );
      }

      numSent += 1;
      if(numSent == req.acceptedEmails.length ){
        res.redirect('/admin/signups');
      }

    }).bind(this))
  }
}


Dash.prototype.sendRegistrationEmail = function( email, host , token ){
  var registrationLink = host + '/register/' + token ,
    options = { email : email, registrationLink :  registrationLink } ,
    content = this.inviteEmailTemplate( options ) , 
    info = this.inviteEmailInfo;
    info.html = content;

  if( process.env.NODE_ENV === 'test'){
    this.drawbridge.emit('invites-email', {result: 'sending', token : token})
  }else{
    
    this.email.send( email, info, ( function( e, d ){

      if(e){
        this.db.undoInvite( email, token );
      }

      this.drawbridge.emit('invites-email', {
        'error' : e,
        'result' : b,
        token : token
      });

    }).bind(this) );
  }

}


