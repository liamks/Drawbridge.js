process.env.NODE_ENV = 'test';

var app = require('./app/app'),
    mocha = require('mocha'),
    should = require('should'),
    req = require('./support/http'),
    redis = require('redis').createClient(),
    port = 3001;
 
var superUser = require('./app/drawbridge.config').superUser;

describe("Dashboard", function(){
  var request = req( "http://0.0.0.0:" + String(port) );

  before(function(done){
    app.listen(port);

    setTimeout( function(){done()}, 40 );
  });

  describe("Not logged in ", function(){
    it("GET /admin/ - Should redirect to sign in page", function(done){
      request.getWithjQuery("/admin/", function( error, window, $){
        if(error){
          console.log("ERROR:\n" + error );
          
        }
        $('h1').text().should.equal("Sign in");
        done();
      });
    });

    it("GET /admin/signups - Should redirect to sign in page", function(done){
      request.getWithjQuery("/admin/signups", function( error, window, $){
        if(error){
          console.log("ERROR:\n" + error );
        }
        $('h1').text().should.equal("Sign in");
        done();
      });
    });

    it("GET /admin/invites - Should redirect to sign in page", function(done){
      request.getWithjQuery("/admin/invites", function( error, window, $){
        if(error){
          console.log("ERROR:\n" + error );
        }
        $('h1').text().should.equal("Sign in");
        done();
      });
    });

    it("GET /admin/users - Should redirect to sign in page", function(done){
      request.getWithjQuery("/admin/users", function( error, window, $){
        if(error){
          console.log("ERROR:\n" + error );
        }
        $('h1').text().should.equal("Sign in");
        done();
      });
    });

  });


  describe("/admin/ - logged in", function(){

    before(function(done){
      request.getWithjQuery("/admin/", function( error, window, $){
        superUser.token = $("input[name=token]").val();
        request.post('/login', superUser, false, function( error, response){
          /<title>Dashboard<\/title>/.test(response.body).should.be.true
          done();
        })
      });
    })

    it("Should still be logged in", function(done){
      request.get("/admin/", function( error, response ){
        request.parse(response.body, function( error, window, $ ){
          $("title").text().should.equal('Dashboard');
          done();
        })
        
      })
    });


  });


  after(function(){
    app.close();
  })
})