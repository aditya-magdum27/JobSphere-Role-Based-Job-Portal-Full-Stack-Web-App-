const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Job = require('../models/job');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/ExpressError');

const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated() || req.user.role !== 'admin') {
    req.flash('error', 'Admin access required.');
    return res.redirect('/login');
  }
  next();
};

// GET /admin
router.get('/', isAdmin, wrapAsync(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalJobs = await Job.countDocuments();
  const totalEmployers = await User.countDocuments({ role: 'employer' });
  const totalRecruiters = await User.countDocuments({ role: 'recruiter' });
  const totalApplications = await Job.aggregate([{ $project: { count: { $size: '$applications' } } }, { $group: { _id: null, total: { $sum: '$count' } } }]);
  const recentJobs = await Job.find().sort({ createdAt: -1 }).limit(5).populate('postedBy', 'username');
  const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
  res.render('admin/dashboard', {
    title: 'Admin Panel',
    stats: {
      totalUsers, totalJobs, totalEmployers, totalRecruiters,
      totalApplications: totalApplications[0] ? totalApplications[0].total : 0
    },
    recentJobs, recentUsers
  });
}));

// GET /admin/users
router.get('/users', isAdmin, wrapAsync(async (req, res) => {
  const { search, role } = req.query;
  let query = {};
  if (search) query.$or = [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  if (role && role !== 'all') query.role = role;
  const users = await User.find(query).sort({ createdAt: -1 });
  res.render('admin/users', { title: 'Manage Users', users, search: search || '', roleFilter: role || 'all' });
}));

// PATCH /admin/users/:id/role — change user role
router.patch('/users/:id/role', isAdmin, wrapAsync(async (req, res) => {
  const { role } = req.body;
  if (!['employer', 'recruiter', 'admin'].includes(role)) {
    req.flash('error', 'Invalid role.');
    return res.redirect('/admin/users');
  }
  if (req.params.id === req.user._id.toString() && role !== 'admin') {
    req.flash('error', 'You cannot demote yourself.');
    return res.redirect('/admin/users');
  }
  await User.findByIdAndUpdate(req.params.id, { role });
  req.flash('success', 'User role updated.');
  res.redirect('/admin/users');
}));

// DELETE /admin/users/:id
router.delete('/users/:id', isAdmin, wrapAsync(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    req.flash('error', 'You cannot delete your own account.');
    return res.redirect('/admin/users');
  }
  await User.findByIdAndDelete(req.params.id);
  await Job.deleteMany({ postedBy: req.params.id });
  req.flash('success', 'User and their jobs deleted.');
  res.redirect('/admin/users');
}));

// GET /admin/jobs
router.get('/jobs', isAdmin, wrapAsync(async (req, res) => {
  const { search } = req.query;
  let query = {};
  if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { companyName: { $regex: search, $options: 'i' } }];
  const jobs = await Job.find(query).sort({ createdAt: -1 }).populate('postedBy', 'username');
  res.render('admin/jobs', { title: 'Manage Jobs', jobs, search: search || '' });
}));

// DELETE /admin/jobs/:id
router.delete('/jobs/:id', isAdmin, wrapAsync(async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  req.flash('success', 'Job deleted.');
  res.redirect('/admin/jobs');
}));

// POST /admin/jobs/:id/toggle
router.post('/jobs/:id/toggle', isAdmin, wrapAsync(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new ExpressError('Job not found', 404);
  job.isActive = !job.isActive;
  await job.save();
  req.flash('success', `Job ${job.isActive ? 'activated' : 'deactivated'}.`);
  res.redirect('/admin/jobs');
}));

module.exports = router;
