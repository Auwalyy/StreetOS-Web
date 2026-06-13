const mongoose = require('mongoose');

const contributionGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['adashe', 'esusu', 'ajo', 'cooperative'], default: 'adashe' },
  contributionAmount: { type: Number, required: true },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  maxMembers: { type: Number, default: 10 },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    phone: String,
    joinedDate: { type: Date, default: Date.now },
    totalContributed: { type: Number, default: 0 },
    hasCollected: { type: Boolean, default: false },
    collectionOrder: Number,
    status: { type: String, enum: ['active', 'inactive', 'removed'], default: 'active' },
  }],
  currentRound: { type: Number, default: 1 },
  totalRounds: Number,
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
  totalCollected: { type: Number, default: 0 },
  collections: [{
    memberId: mongoose.Schema.Types.ObjectId,
    memberName: String,
    amount: Number,
    round: Number,
    date: { type: Date, default: Date.now },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
}, { timestamps: true });

contributionGroupSchema.index({ creator: 1 });
module.exports = mongoose.model('ContributionGroup', contributionGroupSchema);
