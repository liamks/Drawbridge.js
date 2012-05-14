
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , drawbridge = require('../../');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
drawbridge = drawbridge.up( app );
drawbridge.afterLogin(function( response, user ){
  response.redirect('/secret');
})




app.get('/', routes.index);
app.get('/secret', routes.secret);

app.drawbridge = drawbridge;

