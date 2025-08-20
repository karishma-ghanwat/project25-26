const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'careerbuddy-secret',
    resave: false,
    saveUninitialized: true
}));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/careerbuddy', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Schemas
const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

const resultSchema = new mongoose.Schema({
    username: String,
    interest: String,
    style: String,
    goal: String,
    career: String,
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Result = mongoose.model('Result', resultSchema);

// Signup
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();
    res.redirect('/login.html');
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid credentials');
    }
});

// Quiz Submission
app.post('/submit-quiz', async (req, res) => {
    if (!req.session.user) return res.redirect('/login.html');

    const { interest, style, goal } = req.body;
    let career = 'Undecided';

    if (interest === 'tech' && style === 'solo' && goal === 'money') {
        career = 'Freelance Developer';
    } else if (interest === 'design' && goal === 'creativity') {
        career = 'Creative Director';
    } else if (interest === 'helping' && goal === 'impact') {
        career = 'NGO Coordinator';
    }

    const result = new Result({
        username: req.session.user.username,
        interest, style, goal, career
    });

    await result.save();

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CareerBuddy Result</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body style="background-color: #f0f2f5;">
      <div class="container d-flex justify-content-center align-items-center min-vh-100">
        <div class="card shadow p-4 text-center" style="max-width: 500px; width: 100%;">
          <h2 class="text-success">Your Suggested Career</h2>
          <p class="lead mb-4">${career}</p>
          <a href="/dashboard" class="btn btn-outline-primary">Go to Dashboard</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Dashboard
app.get('/dashboard', async (req, res) => {
    if (!req.session.user) return res.redirect('/login.html');
    const results = await Result.find({ username: req.session.user.username });

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard - CareerBuddy</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light">
      <div class="container mt-5">
        <h2 class="text-center">Welcome, ${req.session.user.username}</h2>
        <h4 class="mt-4">Your Career Results:</h4>
        <ul class="list-group mt-3">
  `;

    results.forEach(r => {
        html += `<li class="list-group-item">${r.career} — ${r.date.toDateString()}</li>`;
    });

    html += `
        </ul>
        <a href="/" class="btn btn-primary mt-4">Take Another Quiz</a>
        <a href="/logout" class="btn btn-secondary mt-4 ms-2">Log Out</a>
      </div>
    </body>
    </html>
  `;

    res.send(html);
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(3000, () => {
    console.log('CareerBuddy is running at http://localhost:3000');
});
