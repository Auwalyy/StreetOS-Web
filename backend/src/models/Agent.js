const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  agentCode: { type: String, unique: true },
  territory: { lga: String, city: String, state: String },
  commissionRate: { type: Number, default: 5 },
  totalEarnings: { type: Number, default: 0 },
  pendingCommission: { type: Number, default: 0 },
  merchants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }],
  merchantsOnboarded: { type: Number, default: 0 },
  kycStatus: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected'], default: 'pending' },
  kycDocuments: [{
    type: { type: String, enum: ['nin', 'bvn', 'passport', 'drivers_license', 'utility_bill'] },
    url: String,
    verifiedAt: Date,
  }],
  bankAccount: { bankName: String, accountNumber: String, accountName: String },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  commissions: [{
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    amount: Number,
    type: { type: String, enum: ['onboarding', 'transaction', 'subscription'] },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    date: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

agentSchema.pre('save', async function (next) {
  if (!this.agentCode) {
    this.agentCode = 'AGT' + Date.now().toString().slice(-6);
  }
  next();
});

agentSchema.index({ user: 1 });
agentSchema.index({ agentCode: 1 });

module.exports = mongoose.model('Agent', agentSchema);
