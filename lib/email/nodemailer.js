// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

var nodemailer = require('nodemailer');

NM = module.exports = function( emailOptions ){
  this.smtpTransport = nodemailer.createTransport("SMTP", {
    service : emailOptions.service,
    auth : emailOptions.auth
  });
}

NM.prototype.send = function(emailAddr, options, cb){
  var options = {
    from: options.from,
    to : emailAddr,
    subject : options.subject,
    html : options.html
  };

  this.smtpTransport.sendMail( options, cb );
}