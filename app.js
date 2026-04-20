require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');

const User = require('./models/user');
const ExpressError = require('./utils/ExpressError');

const authRoutes  = require('./routes/auth');
const jobRoutes   = require('./routes/jobs');
const userRoutes  = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();

// MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jobsphere';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'jobsphere-secret-change-this',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: {
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
app.use(flash());

// Passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global locals
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/jobs', jobRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);
app.get('/', (req, res) => res.redirect('/jobs'));

// 404
app.all('*', (req, res, next) => next(new ExpressError('Page Not Found', 404)));

// Error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message    = err.message || 'Something went wrong';
  console.error(err.stack);
  res.status(statusCode).render('error', { title: 'Error', statusCode, message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`JobSphere running → http://localhost:${PORT}`));
