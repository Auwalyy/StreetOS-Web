const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  title: String,
  content: { type: String, required: true },
  type: { type: String, enum: ['discussion', 'question', 'success_story', 'announcement', 'tip'], default: 'discussion' },
  category: String,
  images: [String],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],
  tags: [String],
  views: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: true },
}, { timestamps: true });

communityPostSchema.index({ type: 1 });
communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ content: 'text', title: 'text' });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
