const catchAsync = require('../utils/catchAsync');
const helpService = require('../services/helpService');

// ARTICLES
exports.getArticles = catchAsync(async (req, res, next) => {
    const { audience } = req.query;
    const articles = await helpService.getArticles(audience);

    res.status(200).json({
        status: 'success',
        data: articles
    });
});

exports.createArticle = catchAsync(async (req, res, next) => {
    const article = await helpService.createArticle(req.body);

    res.status(201).json({
        status: 'success',
        data: article
    });
});

exports.updateArticle = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const article = await helpService.updateArticle(id, req.body);

    res.status(200).json({
        status: 'success',
        data: article
    });
});

exports.deleteArticle = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    await helpService.deleteArticle(id);

    res.status(204).json({
        status: 'success',
        data: null
    });
});

exports.getArticleById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const article = await helpService.getArticleById(id);

    res.status(200).json({
        status: 'success',
        data: article
    });
});

// FAQS
exports.getFAQs = catchAsync(async (req, res, next) => {
    const { audience } = req.query;
    const faqs = await helpService.getFaqs(audience);

    res.status(200).json({
        status: 'success',
        data: faqs
    });
});

exports.createFAQ = catchAsync(async (req, res, next) => {
    const faq = await helpService.createFaq(req.body);

    res.status(201).json({
        status: 'success',
        data: faq
    });
});

exports.updateFAQ = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const faq = await helpService.updateFaq(id, req.body);

    res.status(200).json({
        status: 'success',
        data: faq
    });
});

exports.deleteFAQ = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    await helpService.deleteFaq(id);

    res.status(204).json({
        status: 'success',
        data: null
    });
});
