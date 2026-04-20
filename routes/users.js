const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/user');
const Job = require('../models/job');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/ExpressError');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'resume') cb(null, 'uploads/resumes/');
    else cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'You must be logged in.');
    return res.redirect('/login');
  }
  next();
};

// GET /users/dashboard
router.get('/dashboard', isLoggedIn, wrapAsync(async (req, res) => {
  let data = {};

  if (req.user.role === 'employer') {
    const appliedJobs = await Job.find({ 'applications.applicant': req.user._id })
      .populate('postedBy', 'username companyName');
    const user = await User.findById(req.user._id).populate('savedJobs');
    data = { appliedJobs, savedJobs: user.savedJobs };
  } else if (req.user.role === 'recruiter') {
    const postedJobs = await Job.find({ postedBy: req.user._id });
    const totalApplications = postedJobs.reduce((sum, job) => sum + job.applications.length, 0);
    data = { postedJobs, totalApplications };
  } else if (req.user.role === 'admin') {
    // BUG FIX: admin was not handled — redirect to admin panel
    return res.redirect('/admin');
  }

  res.render('users/dashboard', { title: 'Dashboard', data });
}));

// GET /users/profile
router.get('/profile', isLoggedIn, wrapAsync(async (req, res) => {
  const user = await User.findById(req.user._id).populate('savedJobs');
  res.render('users/profile', { title: 'My Profile', profileUser: user });
}));

// PUT /users/profile
router.put('/profile', isLoggedIn, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), wrapAsync(async (req, res) => {
  const { bio, companyName } = req.body;
  const user = await User.findById(req.user._id);

  if (bio !== undefined) user.bio = bio;
  if (companyName !== undefined && user.role === 'recruiter') user.companyName = companyName;

  if (req.files && req.files['image']) {
    user.image = {
      url: '/uploads/avatars/' + req.files['image'][0].filename,
      filename: req.files['image'][0].filename
    };
  }

  if (req.files && req.files['resume'] && user.role === 'employer') {
    user.resume = {
      url: '/uploads/resumes/' + req.files['resume'][0].filename,
      filename: req.files['resume'][0].filename
    };
  }

  await user.save();
  req.flash('success', 'Profile updated successfully!');
  res.redirect('/users/profile');
}));

// GET /users/saved
router.get('/saved', isLoggedIn, wrapAsync(async (req, res) => {
  if (req.user.role !== 'employer') {
    req.flash('error', 'Only employers can view saved jobs.');
    return res.redirect('/jobs');
  }
  const user = await User.findById(req.user._id).populate({
    path: 'savedJobs',
    populate: { path: 'postedBy', select: 'username companyName' }
  });
  res.render('users/saved', { title: 'Saved Jobs', savedJobs: user.savedJobs });
}));

module.exports = router;
