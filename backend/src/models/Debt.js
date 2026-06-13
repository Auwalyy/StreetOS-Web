const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['owed_to_me', 'i_owe'], default: 'owed_to_me' },
  originalAmount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0 },
  balance: { type: Number, required: true },
  description: { type: String, trim: true },
  dueDate: Date,
  status: { type: String, enum: ['active', 'partial', 'paid', 'overdue', 'written_off'], default: 'active' },
  payments: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    method: { type: String, default: 'cash' },
    notes: String,
  }],
  remindersSent: { type: Number, default: 0 },
  lastReminderDate: Date,
  isVoiceEntry: { type: Boolean, default: false },
  voiceTranscript: String,
  products: [{
    name: String,
    quantity: Number,
    price: Number,
  }],
  interest: { type: Number, default: 0 },
}, { timestamps: true });

debtSchema.index({ business: 1, status: 1 });
debtSchema.index({ customer: 1 });
debtSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Debt', debtSchema);
