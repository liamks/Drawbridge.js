// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

PM = module.exports = function( emailOptions ){
  this.postmark = require('postmark')( emailOptions.APIKEY );
}

PM.prototype.send = function( emailAddr, options, cb ){
  var options = {
    From : options.from,
    To : emailAddr,
    Subject : options.subject,
    HtmlBody : options.html
  };

  this.postmark.send( options, cb );
}