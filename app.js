
var express = require('express');
var app = express.createServer();
var server = app.listen(3000);
var everyone = require('now').initialize(server);
var jqtpl = require('jqtpl');
var manifesto = require('manifesto');
var passport = require('passport');
var GoogleStrategy =  require('passport-google').Strategy;

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GoogleStrategy({
    returnURL: 'http://localhost:3000/auth/google/return',
    realm: 'http://localhost:3000/'
  },
  function(identifier, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Google profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Google account with a user record in your database,
      // and return that user instead.
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));



app.configure(function(){
    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
    app.use(express.static(__dirname + '/public'));
    app.use(express.session({ secret: 'keyboard cat' }));
    // Initialize Passport! Also use passport.session() middleware, to support
    // persistent login sessions (recommended).
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'html');
    app.set('view options', {
        layout: false
    });
    app.register('html', jqtpl.express);
});

app.get('/', function(req, res) {
    console.log('GET /');
    res.render('index.html', {});
});

app.get('/index.html', function(req, res) {
    console.log('GET /');
    res.render('index.html', {});
});

app.get("/manifest.appcache", function(req, res){

  manifesto.fetch('./test-manifest.appcache', '.', function(err, data) {
      if(err) {
        res.header("Content-Type", "text/plain");
        res.send(404, "Something mising!");
        return;
      }
 
      res.header("Content-Type", "text/cache-manifest"); 
      res.end(data);
  });

});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve redirecting
//   the user to google.com.  After authenticating, Google will redirect the
//   user back to this application at /auth/google/return
app.get('/auth/google', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

// GET /auth/google/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/return', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

everyone.now.distributeMessage = function(message){
        everyone.now.receiveMessage(this.now.name, message);
};

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

