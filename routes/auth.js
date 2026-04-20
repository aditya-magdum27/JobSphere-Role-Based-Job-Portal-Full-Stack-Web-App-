const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const User = require('../models/user');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/ExpressError');

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'resume') {
      cb(null, 'uploads/resumes/');
    } else {
      cb(null, 'uploads/avatars/');
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'resume') {
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      cb(null, true);
    } else {
      cb(new ExpressError('Resume must be PDF or DOC/DOCX', 400), false);
    }
  } else {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ExpressError('Profile image must be an image file', 400), false);
    }
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /login
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/jobs');
  res.render('auth/login', { title: 'Login' });
});

// POST /login
router.post('/login', passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: true
}), (req, res) => {
  req.flash('success', `Welcome back, ${req.user.username}!`);
  const redirectUrl = req.session.returnTo || '/jobs';
  delete req.session.returnTo;
  res.redirect(redirectUrl);
});

// GET /register
router.get('/register', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/jobs');
  res.render('auth/register', { title: 'Register' });
});

// POST /register
// BUG FIX: added `next` parameter so req.login callback can call next(err)
router.post('/register', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), wrapAsync(async (req, res, next) => {
  const { username, email, password, role, companyName, bio } = req.body;

  if (!username || !email || !password || !role) {
    req.flash('error', 'All required fields must be filled.');
    return res.redirect('/register');
  }

  // BUG FIX: prevent role escalation to admin via form
  const validRoles = ['employer', 'recruiter'];
  const safeRole = validRoles.includes(role) ? role : 'employer';

  const newUser = new User({ username, email, role: safeRole, bio: bio || '' });

  if (safeRole === 'recruiter') {
    if (!companyName) {
      req.flash('error', 'Company name is required for recruiters.');
      return res.redirect('/register');
    }
    newUser.companyName = companyName;
  }

  if (req.files && req.files['image']) {
    newUser.image = {
      url: '/uploads/avatars/' + req.files['image'][0].filename,
      filename: req.files['image'][0].filename
    };
  }

  if (req.files && req.files['resume'] && safeRole === 'employer') {
    newUser.resume = {
      url: '/uploads/resumes/' + req.files['resume'][0].filename,
      filename: req.files['resume'][0].filename
    };
  }

  const registeredUser = await User.register(newUser, password);
  req.login(registeredUser, (err) => {
    if (err) return next(err);
    req.flash('success', `Welcome to JobSphere, ${registeredUser.username}!`);
    res.redirect('/jobs');
  });
}));

// POST /logout
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success', 'Logged out successfully.');
    res.redirect('/login');
  });
});

module.exports = router;
