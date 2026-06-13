const LearningContent = require('../models/LearningContent');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const seedContent = async () => {
  const count = await LearningContent.countDocuments();
  if (count > 0) return;
  await LearningContent.insertMany([
    { title: 'Why Every Business Must Record Transactions Daily', category: 'record_keeping', type: 'article', content: 'Recording daily transactions is the foundation of a healthy business. It helps you know exactly how much you earned, spent, and owe. Businesses that track their finances consistently are 3x more likely to get loans approved.\n\nStart simple: record every sale and every expense. Use StreetOS to voice-record transactions in seconds.', readTime: 5, level: 'beginner', tags: ['bookkeeping', 'basics', 'records'], isFeatured: true },
    { title: 'How to Price Your Products for Maximum Profit', category: 'pricing', type: 'article', content: 'Many traders undercharge for their products. The right pricing strategy covers your costs, pays your salary, AND builds profit. Learn the Cost-Plus method: Cost Price + Overhead + Desired Profit = Selling Price.\n\nExample: If rice costs ₦80,000, your overhead share is ₦5,000, and you want ₦10,000 profit, sell at ₦95,000.', readTime: 7, level: 'beginner', tags: ['pricing', 'profit', 'strategy'] },
    { title: 'Understanding Loan Readiness: What Banks Look For', category: 'loan_readiness', type: 'article', content: 'Banks and fintechs look at 5 things when deciding to give you a loan:\n1. Transaction History - Do you record all sales?\n2. Revenue Consistency - Do you earn regularly?\n3. Debt Behaviour - Do you pay debts on time?\n4. Business Age - How long have you been operating?\n5. Credit Score - Your payment track record.\n\nStreetOS AI calculates all 5 automatically and tells you your Loan Readiness Score.', readTime: 6, level: 'beginner', tags: ['loan', 'credit', 'finance'], isFeatured: true },
    { title: 'Inventory Management: Never Run Out of Stock Again', category: 'inventory', type: 'article', content: 'Running out of stock costs you money. Here is how to manage inventory professionally:\n- Set reorder points for all products\n- Track sales velocity (how fast each product sells)\n- Review stock every Monday\n- Use StreetOS low stock alerts\n\nBusinesses with good inventory management earn 20% more per month.', readTime: 4, level: 'beginner', tags: ['inventory', 'stock', 'management'] },
    { title: '5 Marketing Strategies for Market Traders', category: 'marketing', type: 'article', content: 'You do not need big money to market your business. Here are 5 free strategies:\n1. WhatsApp Status - Post your products daily\n2. Word of mouth - Ask happy customers to refer friends\n3. Loyalty discounts - Give returning customers small discounts\n4. Display - Arrange your stall to attract attention\n5. Trust - Being honest builds more loyal customers than any advert.', readTime: 5, level: 'beginner', tags: ['marketing', 'growth', 'customers'] },
    { title: 'Savings Strategy for Small Business Owners', category: 'savings', type: 'article', content: 'Every trader should save at least 10% of daily profit. Here is the system:\n- Set a daily savings target\n- Transfer to savings before spending\n- Build a 3-month emergency fund first\n- Then save toward business growth goals\n\nStreetOS helps you automate savings tracking and set goals.', readTime: 4, level: 'beginner', tags: ['savings', 'goals', 'money'] },
  ]);
};

exports.getContent = async (req, res) => {
  await seedContent();
  const { page = 1, limit = 12, category, type, level, search } = req.query;
  const query = { isPublished: true };
  if (category) query.category = category;
  if (type) query.type = type;
  if (level) query.level = level;
  if (search) query.$text = { $search: search };

  const [content, total] = await Promise.all([
    LearningContent.find(query).sort({ isFeatured: -1, views: -1 }).skip((page - 1) * limit).limit(Number(limit)).select('-content'),
    LearningContent.countDocuments(query),
  ]);
  return paginatedResponse(res, content, total, page, limit);
};

exports.getContentItem = async (req, res) => {
  const item = await LearningContent.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
  if (!item) return errorResponse(res, 'Content not found', 404);
  return successResponse(res, item);
};

exports.likeContent = async (req, res) => {
  const item = await LearningContent.findById(req.params.id);
  if (!item) return errorResponse(res, 'Not found', 404);
  const liked = item.likes.includes(req.user._id);
  if (liked) item.likes.pull(req.user._id);
  else item.likes.push(req.user._id);
  await item.save();
  return successResponse(res, { liked: !liked, count: item.likes.length });
};

exports.createContent = async (req, res) => {
  const item = await LearningContent.create({ ...req.body, author: req.user._id });
  return successResponse(res, item, 'Content created', 201);
};
