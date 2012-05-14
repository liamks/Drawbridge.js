var bcrypt = require('bcrypt'),
    app = require('./app/app'),
    mocha = require('mocha'),
    should = require('should'),
    req = require('./support/http'),
    redis = require('redis').createClient(),
    _ = require('underscore')._,
    port = 3001;

var unconfirmedUser = {
  email : 'a1@test.com',
  rawpassword : 'asdf',
  stage : '3',
  token : 'tokenaaaaaa',
  screenName : 'ucu'
}


var confirmedUser = {
  email : 'a2@test.com',
  rawpassword : 'asdf',
  stage : '4',
  screenName : 'cu'
}


var hashPassword = function( password ){
  var salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync( password, salt );
}

unconfirmedUser.password = hashPassword( unconfirmedUser.rawpassword );
confirmedUser.password = hashPassword( confirmedUser.rawpassword );


var createUser = function( user , fn ){
  var multi = redis.multi();
  multi.hmset( user.email, 'unc_token', user.token, 
                        'unc_time', new Date(), 
                        'password', user.password,
                        'email', user.email,
                        'stage', user.stage,
                        'screenName', user.screenName )
  if( user.stage == '3'){
    multi.hset( 'unconfirmed', user.token, user.email );
  }else{
    multi.zadd( 'users', Date.now(), user.email );
  }
    
  multi.exec( fn );

}

var destroyUser = function( user, fn ){
  redis.multi()
    .del( user.email )
    .zrem( 'users', user.email )
    .hdel( 'unconfirmed', user.token )
    .exec( fn );
}



describe('Authentication', function(){
  var request = req( "http://0.0.0.0:" + String(port) );

  before(function( done ){
    app.listen( port );

    createUser( unconfirmedUser, function( err, res ){
      createUser( confirmedUser, function( err, res ){
        done();
      });
    });
  });


  describe('Login', function(){

    describe('Confirmed User', function(){
      var user = {
        email : confirmedUser.email,
        password : confirmedUser.rawpassword
      };

      it('Should login with correct email and password', function(done){

        request.getWithjQuery("/login", function( error, window, $){
          user.token = $("input[name=token]").val();

          request.post( '/login', user, false, function( error, response){
            response.body.should.equal('<h1>secret!</h1>');
            done();
          });
      
        });
      });

      it('Should login with uppercase email and correct password', function(done){
        var oth_user = _.clone( user );
        oth_user.email = 'A2@test.com'

        request.getWithjQuery("/login", function( error, window, $){
          user.token = $("input[name=token]").val();

          request.post( '/login', oth_user, false, function( error, response){
            response.body.should.equal('<h1>secret!</h1>');
            done();
          });
      
        });
      });

      it('Should not login with incorrect password', function(done){
        var inc_user = _.clone( user );
        inc_user.password = 'wrongpassword';

        request.getWithjQuery("/login", function( error, window, $){
          user.token = $("input[name=token]").val();

          request.post( '/login', inc_user, false, function( error, response){
            response.body.should.not.equal('<h1>secret!</h1>');
            done();
          });
      
        });
      });


      it('Should not login with no password', function( done){
        var nopass_user = _.clone( user );
        nopass_user.password = ''

        request.getWithjQuery("/login", function( error, window, $){
          user.token = $("input[name=token]").val();

          request.post( '/login', nopass_user, false, function( error, response){
            response.body.should.not.equal('<h1>secret!</h1>');
            done();
          });
      
        });
      });

    })

    describe('Unconfirmed User', function(){
      var user = {
        email : unconfirmedUser.email,
        password : unconfirmedUser.rawpassword
      }

      it('Should not login, even if email and password are correct', function(done){
        request.getWithjQuery("/login", function( error, window, $){
          user.token = $("input[name=token]").val();

          request.post( '/login', user, false, function( error, response){
            response.body.should.not.equal('<h1>secret!</h1>');
            done();
          });
      
        });
      });

    })


  })

  after(function( done ){
    request.get('/logout', function(){
      destroyUser( unconfirmedUser, function(){
        destroyUser( confirmedUser, function(){
          done();
        })
      })
    } )

  });

})