require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const GitHubStrategy = require('passport-github2').Strategy;
const passport = require('passport');
const session = require('express-session');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db = null;
let collection = null;


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "https://a3-sylvia-jacobs.onrender.com/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    done(null, profile);
  }
));

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

app.get('/', function(req, res) {
  res.redirect('/login.html');
});

app.get('/login', function(req, res) {
  res.redirect('/login.html');
});

app.get('/index.html', function(req, res) {
  if (!req.isAuthenticated()) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }),
  function(req, res){
  });


app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/index.html');
  });

app.get('/logout', function(req, res){
  req.logout(function() {
    res.redirect('/login.html');
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.status(401).json({ error: 'login required' });
}

const timeToComplete = function(creationDate, deadline) {
  const creation = new Date(creationDate)
  const due = new Date(deadline)
  const diffTime = Math.abs(due - creation)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/data', ensureAuthenticated, async function(request, response) {
  try {
    const username = request.user.username;
    const userTasks = await collection.find({ username: username }).toArray();
    response.json(userTasks);
  } catch (error) {
    response.status(500).json({ error: "failed to fetch data" });
  }
});


app.post(['/data', '/submit'], ensureAuthenticated, async function(request, response) {
  try {
    const data = request.body;
    const creationDate = data.creationDate || data['creation-date'] || '';
    const deadline = data.deadline || '';
    const username = request.user.username;

    const task = {
      username, 
      task: data.task,
      creationDate,
      deadline,
      status: data.status,
      timeToComplete: timeToComplete(creationDate, deadline)
    };

    await collection.insertOne(task);
    
    const updatedTasks = await collection.find({ username: username }).toArray();
    response.json(updatedTasks);
  } catch (error) {
    response.status(500).json({ error: "failed to insert data" });
  }
});

app.delete('/delete/:id', ensureAuthenticated, async function(request, response) {
  try {
    const id = request.params.id;
    const username = request.user.username;
    
    await collection.deleteOne({ _id: new ObjectId(id), username: username });
    
    const updatedTasks = await collection.find({ username: username }).toArray();
    response.json(updatedTasks);
  } catch (error) {
    response.status(500).json({ error: "failed to delete data" });
  }
});

app.put('/edit/:id', ensureAuthenticated, async function(request, response) {
  try {
    const id = request.params.id;
    const data = request.body;
    const username = request.user.username;

    const existingTask = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingTask) {
      return response.status(404).json({ error: "task not found" });
    }

    await collection.updateOne(
      { _id: new ObjectId(id), username: username },
      {
        $set: {
          task: data.task,
          deadline: data.deadline,
          status: data.status,
          timeToComplete: timeToComplete(existingTask.creationDate, data.deadline)
        }
      }
    );

    const updatedTasks = await collection.find({ username: username }).toArray();
    response.json(updatedTasks);
  } catch (error) {
    response.status(500).json({ error: "failed to update data" });
  }
});

async function run() {
  try {
    await client.connect();
    db = client.db("a3db");
    collection = db.collection("tasks");
    console.log("connected");

    app.listen(port, function() {
      console.log(`Server is listening on port ${port}`);
    });
  } catch (err) {
    console.error("couldnt connect to db", err);
    process.exit(1);
  }
}

run();
