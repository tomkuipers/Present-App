
var express = require('express');
var app = express.createServer();
var server = app.listen(3000);
var nowjs = require('now'),
    everyone = nowjs.initialize(server);
var jqtpl = require('jqtpl');
var manifesto = require('manifesto');
var uuid = require('node-uuid');
var Hashids = require("hashids"),
    hashids = new Hashids("chocolade salty balls");
var qrCode = require('qrcode-npm');
var passport = require('passport');
var GoogleStrategy =  require('passport-google').Strategy;
var mongoose = require('mongoose');


// database
mongoose.connect('YOURCONNECTIONSTRING');

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

var Schema = mongoose.Schema; //Schema.ObjectId

var Questions = new Schema({
    name: {type: String, required: true, index: {unique: true} },
    creator: {type: String, default: "Anonymous"},
    votes: {type: Number, default: 1}
});

var Presentation = new Schema({
    id: {type: Number, required: true },
    title: {type: String, required: true },
    lat: {type: Number },
    lon: {type: Number },
    url: {type: String },
    qrcode: {type: String },
    questions: [Questions],
    timestamp: {type: Date, default: Date.now },
});

var PresentationModel = mongoose.model('Presentation', Presentation);

// @i: simple counter
var i = 1000;

everyone.now.serverRoomsList = {"presentationid": "Presentation Title"};

// create presentation
app.post('/api/presentations', function(req, res){
    var presentation, hash = hashids.encrypt(i);
    // hashid
    // url, qrcode
    
    presentation = new PresentationModel({
        id: i,
        title: req.body.title,
        lat: req.body.lat,
        lon: req.body.lon,
    });
    presentation.url = req.headers.host + "/" + presentation._id + "/";

    // add presentation to global list
    everyone.now.serverRoomsList[presentation._id] =  presentation.title;
    console.log(everyone.now.serverRoomsList);

    presentation.save(function (err) {
      if (!err) {
        presentation.questions.push(); 
        i++; // increment counter
        return console.log("created");
     } else {
        return console.log(err);
      }
    });
    return res.send(presentation);
});

// list all presentations
app.get('/api/presentations', function (req, res) {
  return PresentationModel.find(function (err, presentations) {
    if (!err) {
      return res.send(presentations);
    } else {
      return console.log(err);
    }
  });
});

// remove presentation
app.delete('/api/presentation/:id', function (req, res) {
  return PresentationModel.findById(req.params.id, function (err, presentation) {
    return presentation.remove(function (err) {
      if (!err) {
        console.log("removed");
        return res.send('');
      } else {
        console.log(err);
      }
    });
  });
});

// retrieve presentation
app.get('/api/presentation/:id', function(req, res) {
  return PresentationModel.findById(req.params.id, function(err, presentation) {
    if (!err) {
      return res.send(presentation);
    } else {
      console.log(err);
    }
  });
});

// add question
app.post('/api/presentation/:id' , function(req, res) {

  return PresentationModel.findById(req.params.id, function(err, presentation) {
     if(!err) {
       console.log(req.body.question + " " + req.body.creator );
       var questions = presentation.questions;
      
       questions.push({"name": req.body.question, "creator": req.body.creator});
       presentation.save(function(err) {
         if (!err) {
           console.log("Succesfully added question")
           return res.send(presentation);
         } else { 
           console.log(err)
         }
       });
     } else {
       return console.log(err);
     }
  });

});

// increment votes for question
app.put('/api/presentation/:id', function(req, res){
  PresentationModel.update( {"_id": req.params.id ,"questions._id": req.body.questionId}, { $inc: { "questions.$.votes": 1 } }, function(err, numAffected ) {
            if (err) {
                console.log("Error on update");
                console.log(err);
            } else {
                console.log("updated num: " + numAffected);
            }
        });
});

// most favorite questions
app.get('/api/presentation/:id/favorites', function(req, res) {
  return PresentationModel.findById(req.params.id, function(err, presentation) {
    if (!err) {

      // sort descending
      function compare(a,b) {
      if (a.votes < b.votes)
         return 1;
      if (a.votes > b.votes)
         return -1;
      return 0;
      }

      var favorites, questions = presentation.questions;
      favorites = questions.sort(compare).slice(0,9);
      return res.send(favorites);
    } else {
      console.log(err);
    }
  });
});

app.get('/api', function(req, res) {
  return res.render('api');
});

app.get('/:id/', function(req, res) {
  PresentationModel.findById(req.params.id, function(err, presentation) {
     if (!err) {
       return  res.render('app2', {presentation: presentation});
     } else {
       console.log(err);
     }
  });  
});

app.get('/', function(req, res) {
    return res.render('app');
});

app.get('/index.html', function(req, res) {
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

// Send message to everyone in the users group
everyone.now.distributeMessage = function(message){
    var group = nowjs.getGroup(this.now.serverRoom);
    group.now.receiveMessage(this.now.name, message);
};

everyone.now.changeRoom = function(newRoom) {
    var oldRoom = this.now.serverRoom;
    console.log('Changed user '+this.now.name + ' from '+oldRoom + ' to '+newRoom);
    //if old room is not null; then leave the old room
    if(oldRoom){
        var oldGroup = nowjs.getGroup(oldRoom);
        oldGroup.removeUser(this.user.clientId);
        // Tell everyone he left :)
        // oldGroup.now.receiveMessage('SERVER@'+oldRoom, this.now.name + ' has left the room and gone to '+newRoom);
    }
    var newGroup = nowjs.getGroup(newRoom);
    newGroup.addUser(this.user.clientId);
    // Tell everyone he joined
    // newGroup.now.receiveMessage('SERVER@'+newRoom, this.now.name + ' has joined the room');
    this.now.serverRoom = newRoom;
};

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

