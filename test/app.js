var app = require('./app/app'),
    mocha = require('mocha'),
    should = require('should'),
    req = require('./support/http'),
    redis = require('redis').createClient()
    port = 3001;


var signup1 = {
      email : 'test1@test.com'
    },
    signupInvalid = {
      email : "test@test"
    };


describe('App', function(){
  var request = req( "http://0.0.0.0:" + String(port) );

  before(function(){
    app.listen(port);
  });

  describe('/ - root url', function(){
    it('Should have a signup form', function(done){
      request.getWithjQuery( '', function( errors, window, $ ){
        should.exist($('form'));
        done();
      });
    });

    describe('Sign up form', function(){
      it('Should save the user\'s email', function(done){
        request.post( '/signup', signup1, function( error, response, body ){
          
          redis.multi()
            .exists(signup1.email)
            .zrank('waitlist', signup1.email)
            .exec( function(err, redisResponse){
              redisResponse[0].should.be.equal(1);
              should.exist( redisResponse[1] );
              done();
            });

        });
      });

      it("Should return an error because email is blank", function(done){
        request.post('/signup', { email : '' }, function( error, res, body ){
          body.should.equal("invalid email address")
          res.statusCode.should.equal( 500 )
          done();
        });
      });

      it("Should return an error because email is invalid", function(done){
        request.post('/signup', signupInvalid, function( err, res, body){
          body.should.equal("invalid email address")
          res.statusCode.should.equal( 500 )

           redis.multi()
            .exists(signupInvalid.email)
            .zrank('waitlist', signupInvalid.email)
            .exec( function(err, redisResponse){
              redisResponse[0].should.be.equal(0);
              should.not.exist( redisResponse[1] );
              done();
            });

        })
      });

      after(function(){
        redis.del(signup1.email);
        redis.zrem('waitlist', signup1.email );
      })


    });

  });

  after(function(){
    app.close();
  });


});