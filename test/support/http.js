
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
}

Request.prototype.getWithjQuery = function( path, fn ){
  jsdom.env({
    html : this.host + path,
    src: [ this.jquery ], 
    done : function(error, window){
      fn( error, window, window.$ );
    }
  })
}

/* fn( error, response, body ) */
Request.prototype.post = function( path, param, fn ){
  var options = {
        json: param
      };
  request.post( this.host + path, options, fn );
}

Request.prototype.get = function( path, fn ){
  request.get( this.host + path, fn );
}