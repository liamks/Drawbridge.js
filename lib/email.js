// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

var emailOptions = {
  nodemailer : function( emailOpt ){
    var NodeMailer = require('./email/nodemailer');
    return new NodeMailer( emailOpt );
  },

  postmark : function( emailOpt ){
    var PostMark = require('./email/postmark');
    return new PostMark( emailOpt );
  }
}

module.exports.getEmail = function( email ){
  var emailer = emailOptions[ email.module ];
  if( typeof emailer  === 'function' ){
    return emailer( email )
  }else{
    throw new Error( emailService + ' is not currently supported by drawbridge =(. \n check your spelling!');
  }
}