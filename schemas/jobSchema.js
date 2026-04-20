const Joi = require('joi');

const jobSchema = Joi.object({
  title: Joi.string().required().messages({
    'string.empty': 'Job title is required',
    'any.required': 'Job title is required'
  }),
  companyName: Joi.string().required().messages({
    'string.empty': 'Company name is required',
    'any.required': 'Company name is required'
  }),
  type: Joi.string().valid('Internship', 'Full-Time', 'Part-Time', 'Contract', 'Remote').required().messages({
    'any.only': 'Job type must be one of: Internship, Full-Time, Part-Time, Contract, Remote',
    'any.required': 'Job type is required'
  }),
  description: Joi.string().required().messages({
    'string.empty': 'Job description is required',
    'any.required': 'Job description is required'
  }),
  location: Joi.string().optional().allow(''),
  salary: Joi.string().optional().allow(''),
  experience: Joi.string().optional().allow(''),
  skills: Joi.string().optional().allow('')
});

module.exports = jobSchema;
