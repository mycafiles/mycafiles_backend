const express = require('express');
const router = express.Router();
const helpController = require('../controller/helpController');
const { protect } = require('../middleware/authMiddleware');

// ARTICLES
router.get('/articles', helpController.getArticles); // Publicly accessible to CA/Client
router.get('/articles/:id', helpController.getArticleById);
router.post('/articles', protect, helpController.createArticle);
router.put('/articles/:id', protect, helpController.updateArticle);
router.delete('/articles/:id', protect, helpController.deleteArticle);

// FAQS
router.get('/faqs', helpController.getFAQs);
router.post('/faqs', protect, helpController.createFAQ);
router.put('/faqs/:id', protect, helpController.updateFAQ);
router.delete('/faqs/:id', protect, helpController.deleteFAQ);

module.exports = router;
