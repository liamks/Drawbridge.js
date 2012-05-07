
var jsdom = require('jsdom')
  , request = require('request')
  , fs = require('fs')
  , querystring = require('querystring');

module.exports = function( host ) {
  return new Request( host );
}

function Request( host){
  this.host = host;
  this.jquery = fs.readFileSync( './test/support/jquery.min.js', 'utf8' );
  console.log( this.jquery );
}

Request.prototype.getWithjQuery = function( path, fn ){
  jsdom.env({
    html : this.host + path,
    src: [ this.jquery ], 
    done : function(error, window){
      fn( error, window, window.$ );
    }
  });
}


Request.prototype.parse = function( rawHTML, fn ){
  jsdom.env({
    html : rawHTML,
    src : [ this.jquery ],
    done : function( error, window ){
      fn( error, window, window.$ );
    }
  })
}

/* fn( error, response, body ) */
Request.prototype.post = function( path, param, ajax, fn ){
  var options = { followAllRedirects : true };

  if(ajax){
    options.json = param;
  }else{
    options.form = param;
  }
  request.post( this.host + path, options, fn );
}

Request.prototype.get = function( path, fn ){
  request.get( this.host + path, fn );
}

