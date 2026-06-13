const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  purpose: { type: String, required: true },
  tenure: { type: Number, required: true },
  tenureUnit: { type: String, enum: ['days', 'weeks', 'months'], default: 'months' },
  interestRate: Number,
  creditScore: Number,
  loanReadinessScore: Number,
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed', 'repaying', 'completed'],
    default: 'draft',
  },
  lender: {
    type: { type: String, enum: ['bank', 'fintech', 'cooperative', 'microfinance'] },
    name: String,
    contactEmail: String,
  },
  documents: [{ type: String, name: String, url: String }],
  repaymentSchedule: [{
    dueDate: Date,
    amount: Number,
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
    paidDate: Date,
  }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  disbursedAt: Date,
  notes: String,
}, { timestamps: true });

loanApplicationSchema.index({ business: 1, status: 1 });
loanApplicationSchema.index({ applicant: 1 });

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);
