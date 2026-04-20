const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['employer', 'recruiter', 'admin'],
    default: 'employer'
  },
  image: {
    url: { type: String, default: '' },
    filename: { type: String, default: '' }
  },
  // Employer-specific
  resume: {
    url: { type: String, default: '' },
    filename: { type: String, default: '' }
  },
  // Recruiter-specific
  companyName: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  savedJobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);
