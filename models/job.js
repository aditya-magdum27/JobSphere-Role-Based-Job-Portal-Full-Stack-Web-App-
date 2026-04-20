const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected'],
    default: 'pending'
  }
});

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Internship', 'Full-Time', 'Part-Time', 'Contract', 'Remote'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: 'Remote'
  },
  salary: {
    type: String,
    default: 'Not disclosed'
  },
  experience: {
    type: String,
    default: 'Any'
  },
  skills: {
    type: String,
    default: ''
  },
  logo: {
    url: { type: String, default: '' },
    filename: { type: String, default: '' }
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applications: [applicationSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Text index for search
jobSchema.index({ title: 'text', companyName: 'text', description: 'text', skills: 'text' });

module.exports = mongoose.model('Job', jobSchema);
