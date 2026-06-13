const mongoose = require('mongoose');

const learningContentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ['record_keeping', 'marketing', 'inventory', 'loan_readiness', 'savings', 'pricing', 'general'],
    required: true,
  },
  type: { type: String, enum: ['article', 'video', 'audio', 'infographic'], required: true },
  content: String,
  videoUrl: String,
  audioUrl: String,
  thumbnail: String,
  duration: Number,
  readTime: Number,
  tags: [String],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublished: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
}, { timestamps: true });

learningContentSchema.index({ category: 1, type: 1 });
learningContentSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('LearningContent', learningContentSchema);
