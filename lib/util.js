// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

var validate = require('validator').check;

module.exports.isEmailValid = function(email){
  var isValid = true;
  try{
    validate(email).isEmail();
  } catch(e){
    isValid = false;
  }
  return isValid;
};