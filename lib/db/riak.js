// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

/*
This is just the very start of the adapter, much more is needed to make
it fully functional.
*/

var riak = require('riak-js').getClient();
    _ = require('underscore')._,
    crypto = require('crypto');

module.exports = RK = function(){

}

RK.prototype.createSignup = function(info, cb){
  riak.save('signups', info.email, info, cb);
};

RK.prototype.getSignups = function( cb ){
  riak.getAll('signups', { where : { invited : false } }, function(err, data){
    var d = [];
    if(!err){
      d = _.map(data, function(s){ return s.data });
    }
    
    cb(err, d);

  });
}


RK.prototype.inviteSignup  = function(email, cb){
  riak.get('signups', email, function(err, data){

    if(err){
      cb('error with getting signup');
    }else{
      var token = crypto.createHash('sha1').update( email ).digest('hex');
      data.token = token;
      data.invited = true;
      riak.save( 'signups', email, data, function(err, data){

        if(err){
          cb('error saving signup');
        }else{

          riak.save( 'invites', token, { email : email, accepted : false }, function(err, data){

            if(err){
              cb('error saving invite')
            }else{
              cb(null, token )
            }
          });
      
          
        }

      });
    }

  })
}

