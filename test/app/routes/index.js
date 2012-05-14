
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express' })
};


exports.secret = function(req, res){
  res.send('<h1>secret!</h1>');
}