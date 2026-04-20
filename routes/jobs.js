const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Job = require('../models/job');
const User = require('../models/user');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/ExpressError');
const jobSchema = require('../schemas/jobSchema');
const { sendApplicationNotification, sendApplicationConfirmation, sendStatusUpdate } = require('../utils/mailer');

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/logos/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new ExpressError('Logo must be an image file', 400), false);
  },
  limits: { fileSize: 2 * 1024 * 1024 }
});

const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'You must be logged in.');
    return res.redirect('/login');
  }
  next();
};

const isRecruiter = (req, res, next) => {
  if (!req.isAuthenticated() || (req.user.role !== 'recruiter' && req.user.role !== 'admin')) {
    req.flash('error', 'Only recruiters can perform this action.');
    return res.redirect('/jobs');
  }
  next();
};

const isEmployer = (req, res, next) => {
  if (!req.isAuthenticated() || req.user.role !== 'employer') {
    req.flash('error', 'Only job seekers can perform this action.');
    return res.redirect('/jobs');
  }
  next();
};

const validateJob = (req, res, next) => {
  const { error } = jobSchema.validate(req.body);
  if (error) {
    const msg = error.details.map(d => d.message).join(', ');
    req.flash('error', msg);
    return res.redirect('back');
  }
  next();
};

const isJobAuthor = wrapAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new ExpressError('Job not found', 404);
  if (!job.postedBy.equals(req.user._id) && req.user.role !== 'admin') {
    req.flash('error', 'You do not have permission to do that.');
    return res.redirect(`/jobs/${req.params.id}`);
  }
  next();
});

// GET /jobs
router.get('/', wrapAsync(async (req, res) => {
  const { search, type, page = 1 } = req.query;
  const limit = 9;
  const skip = (page - 1) * limit;
  let query = { isActive: true };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } }
    ];
  }
  if (type && type !== 'All') query.type = type;
  const totalJobs = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .populate('postedBy', 'username companyName')
    .sort({ createdAt: -1 }).skip(skip).limit(limit);
  const totalPages = Math.ceil(totalJobs / limit);
  res.render('jobs/index', {
    title: 'Browse Jobs', jobs,
    search: search || '', type: type || 'All',
    currentPage: parseInt(page), totalPages, totalJobs
  });
}));

// GET /jobs/new
router.get('/new', isLoggedIn, isRecruiter, (req, res) => {
  res.render('jobs/new', { title: 'Post a Job' });
});

// POST /jobs
router.post('/', isLoggedIn, isRecruiter, uploadLogo.single('logo'), validateJob, wrapAsync(async (req, res) => {
  const { title, companyName, type, description, location, salary, experience, skills } = req.body;
  const job = new Job({
    title,
    companyName: companyName || req.user.companyName,
    type, description,
    location: location || 'Remote',
    salary: salary || 'Not disclosed',
    experience: experience || 'Any',
    skills: skills || '',
    postedBy: req.user._id
  });
  if (req.file) {
    job.logo = { url: '/uploads/logos/' + req.file.filename, filename: req.file.filename };
  }
  await job.save();
  req.flash('success', 'Job posted successfully!');
  res.redirect(`/jobs/${job._id}`);
}));

// GET /jobs/:id
router.get('/:id', wrapAsync(async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate('postedBy', 'username companyName image email')
    .populate('applications.applicant', 'username email image resume');
  if (!job) throw new ExpressError('Job not found', 404);
  let hasApplied = false, hasSaved = false, myApplication = null;
  if (req.isAuthenticated() && req.user.role === 'employer') {
    const user = await User.findById(req.user._id);
    hasSaved = user.savedJobs.some(id => id.equals(job._id));
    const appEntry = job.applications.find(app => app.applicant && app.applicant._id.equals(req.user._id));
    if (appEntry) { hasApplied = true; myApplication = appEntry; }
  }
  res.render('jobs/show', { title: job.title, job, hasApplied, hasSaved, myApplication });
}));

// GET /jobs/:id/edit
router.get('/:id/edit', isLoggedIn, isJobAuthor, wrapAsync(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new ExpressError('Job not found', 404);
  res.render('jobs/edit', { title: 'Edit Job', job });
}));

// PUT /jobs/:id
router.put('/:id', isLoggedIn, isJobAuthor, uploadLogo.single('logo'), validateJob, wrapAsync(async (req, res) => {
  const { title, companyName, type, description, location, salary, experience, skills } = req.body;
  const job = await Job.findByIdAndUpdate(req.params.id,
    { title, companyName, type, description, location, salary, experience, skills },
    { new: true });
  if (!job) throw new ExpressError('Job not found', 404);
  if (req.file) {
    job.logo = { url: '/uploads/logos/' + req.file.filename, filename: req.file.filename };
    await job.save();
  }
  req.flash('success', 'Job updated successfully!');
  res.redirect(`/jobs/${job._id}`);
}));

// DELETE /jobs/:id
router.delete('/:id', isLoggedIn, isJobAuthor, wrapAsync(async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  req.flash('success', 'Job deleted.');
  res.redirect('/jobs');
}));

// POST /jobs/:id/apply
router.post('/:id/apply', isLoggedIn, isEmployer, wrapAsync(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'username email');
  if (!job) throw new ExpressError('Job not found', 404);

  const alreadyApplied = job.applications.some(app => {
    const aid = app.applicant._id || app.applicant;
    return aid.equals(req.user._id);
  });
  if (alreadyApplied) {
    req.flash('error', 'You have already applied to this job.');
    return res.redirect(`/jobs/${req.params.id}`);
  }

  job.applications.push({ applicant: req.user._id });
  await job.save();

  // Send email notifications (non-blocking)
  const applicant = await User.findById(req.user._id);
  sendApplicationNotification({
    recruiterEmail: job.postedBy.email,
    recruiterName: job.postedBy.username,
    applicantName: applicant.username,
    applicantEmail: applicant.email,
    jobTitle: job.title,
    jobId: job._id,
    resumeUrl: applicant.resume && applicant.resume.url ? (process.env.SITE_URL || 'http://localhost:3000') + applicant.resume.url : null
  });
  sendApplicationConfirmation({
    applicantEmail: applicant.email,
    applicantName: applicant.username,
    jobTitle: job.title,
    companyName: job.companyName
  });

  req.flash('success', 'Application submitted! A confirmation email has been sent.');
  res.redirect(`/jobs/${req.params.id}`);
}));

// DELETE /jobs/:id/apply  — cancel application
router.delete('/:id/apply', isLoggedIn, isEmployer, wrapAsync(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new ExpressError('Job not found', 404);
  job.applications = job.applications.filter(app => {
    const aid = app.applicant._id || app.applicant;
    return !aid.equals(req.user._id);
  });
  await job.save();
  req.flash('success', 'Application withdrawn.');
  res.redirect(`/jobs/${req.params.id}`);
}));

// POST /jobs/:id/save
router.post('/:id/save', isLoggedIn, isEmployer, wrapAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const jobId = req.params.id;
  const isSaved = user.savedJobs.some(id => id.equals(jobId));
  if (isSaved) {
    user.savedJobs = user.savedJobs.filter(id => !id.equals(jobId));
    req.flash('success', 'Job removed from saved.');
  } else {
    user.savedJobs.push(jobId);
    req.flash('success', 'Job saved!');
  }
  await user.save();
  res.redirect(`/jobs/${jobId}`);
}));

// POST /jobs/:id/applications/:appId/status
router.post('/:id/applications/:appId/status', isLoggedIn, isRecruiter, wrapAsync(async (req, res) => {
  const { status } = req.body;
  const job = await Job.findById(req.params.id).populate('applications.applicant', 'username email');
  if (!job) throw new ExpressError('Job not found', 404);
  const app = job.applications.id(req.params.appId);
  if (!app) throw new ExpressError('Application not found', 404);
  app.status = status;
  await job.save();
  // Email applicant about status change
  if (app.applicant && app.applicant.email && status !== 'pending') {
    sendStatusUpdate({
      applicantEmail: app.applicant.email,
      applicantName: app.applicant.username,
      jobTitle: job.title,
      companyName: job.companyName,
      status
    });
  }
  req.flash('success', 'Application status updated.');
  res.redirect(`/jobs/${req.params.id}`);
}));

module.exports = router;
