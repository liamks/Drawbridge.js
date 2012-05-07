process.env.NODE_ENV = 'test';

var app = require('./app/app'),
    mocha = require('mocha'),
    should = require('should'),
    req = require('./support/http'),
    redis = require('redis').createClient(),
    port = 3001,
    superUser = require('./app/drawbridge.config').superUser,
    _ = require('underscore')._;



describe("Invite", function(){
  var request = req( "http://0.0.0.0:" + String(port) ),
      info = {
        ip: '1.1.1.1',
        time : new Date(),
        requestURL : '/'
      },
      signUpOne = _.clone( info ),
      signUpTwo = _.clone( info );

      signUpOne.email = 'test+t1@test.com';
      signUpTwo.email = 'test+t2@test.com';

  before(function(done){
    app.listen(port);

    //Log super user in
    request.getWithjQuery("/admin/", function( error, window, $){
      superUser.token = $("input[name=token]").val();
      request.post('/login', superUser, false, function( error, response){
        done();
      })
    });

  });

  before(function(done){
    // sign up a user
    app.drawbridge.db.addToWaitlist( signUpOne, function(err, obj){
      done();
    });
  })

  before(function(done){
    // sign up a user
    app.drawbridge.db.addToWaitlist( signUpTwo, function(err, obj){
      done();
    });
  })


  describe('Signups Page', function(done){
    var token, emails = [], subset;

    it('CSRF Token should exist', function(done){
    
      request.getWithjQuery("/admin/signups", function( error, window, $){
        token = $("input[name=token]").val();
        $('input[name=person]').each(function(){
          emails.push($(this).val());
        });

        subset = _.filter( emails, function(email){
          if( email == signUpOne.email || email == signUpTwo.email ){
            return  email;
          }
        });
        subset.should.have.length(2);
        emails.should.not.be.empty
        should.exist( token )
        done();
      });

    });

    it('Should handle invite of 0 user', function(done){
      var options = {
        token : token

      };

      request.post( '/admin/invite-signup', options, false, function( error, response ){
        request.parse( response.body, function( error, window, $){
          $('h1').text().should.equal('Sign ups / Waitlist');
          done();
        });
      })
      
    });

    it('Should handle manual invite of 1 user ', function(done){

      var options = {
        token : token,
        anEmail : 'test+t3@test.com'
      },
      timesSent = 0;

      app.drawbridge.on('invites-email', function(result){
        timesSent += 1;
      });

      request.post('/admin/invite-signup', options, false, function( error, response ){
        setTimeout(function(){
          timesSent.should.equal(1)
          done();
        }, 50 );

      });
      
      
    });


    it('Should handle invite of 1 user ', function(done){
      var options = {
        token : token,
        person : signUpOne.email 
      },

      timesSent = 0;

      app.drawbridge.on('invites-email', function(result){
        timesSent += 1;
      });


      request.post('/admin/invite-signup', options, false, function( error, response ){
        setTimeout(function(){
          timesSent.should.equal(1)
          done();
        }, 50 );
      });

    });

    it('Should handle invite of 2 user ', function(done){
      var options = {
        token : token,
        person : [ signUpOne.email, signUpTwo.email ] 
      },

      timesSent = 0;

      app.drawbridge.on('invites-email', function(result){
        timesSent += 1;
      });


      request.post('/admin/invite-signup', options, false, function( error, response ){
        setTimeout(function(){
          timesSent.should.equal(2)
          done();
        }, 50 );
      });
    });


    

  })






  after(function(){
    app.close();
  });

});