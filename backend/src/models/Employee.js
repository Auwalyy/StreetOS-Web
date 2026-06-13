const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: String,
  email: String,
  role: String,
  salary: { type: Number, default: 0 },
  salaryFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'monthly' },
  startDate: Date,
  avatar: String,
  isActive: { type: Boolean, default: true },
  attendance: [{
    date: Date,
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
    checkIn: Date,
    checkOut: Date,
    notes: String,
  }],
  salaryHistory: [{
    amount: Number,
    period: String,
    paidDate: Date,
    method: String,
  }],
  performanceScore: { type: Number, default: 100, min: 0, max: 100 },
}, { timestamps: true });

employeeSchema.index({ business: 1 });
module.exports = mongoose.model('Employee', employeeSchema);
