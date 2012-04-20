// Drawbridge - Copyright Liam Kaufman - liamkaufman.com (MIT Licensed)

var dbOptions = {
  riak : function(){
    /* TODO */
    throw new Error( "Riak database adapter for drawbridge has not yet been implemented." );
  },

  mongo : function( dbOpt ){
    /* TODO */
    throw new Error( "MongoDB database adapter for drawbridge has not yet been implemented." );
  },

  postgres : function(){
    /* TODO */
    throw new Error( "Postgresql database adapter for drawbridge has not yet been implemented." );
  },

  redis : function(){
    var Redis = require('./db/redis');
    return new Redis();
  }
};


module.exports.getDB = function( db ){
  var database = dbOptions[ db.type ];
  if( typeof database === 'function' ){
    return database( db );
  } else {
    throw new Error( dbBrand + ' is not currently supported by drawbridge =(. \nCheck your spelling!' )
  }
}