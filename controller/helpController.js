const prisma = require('../config/prisma');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ARTICLES
exports.getArticles = catchAsync(async (req, res, next) => {
    const { audience } = req.query; // ca or client
    const where = {};
    if (audience) where.audience = audience;

    const articles = await prisma.helpArticle.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
        status: 'success',
        data: articles.map(a => ({ ...a, _id: a.id }))
    });
});

exports.createArticle = catchAsync(async (req, res, next) => {
    const { title, content, category, audience } = req.body;

    const article = await prisma.helpArticle.create({
        data: { title, content, category, audience }
    });

    res.status(201).json({
        status: 'success',
        data: { ...article, _id: article.id }
    });
});

exports.updateArticle = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { title, content, category, audience } = req.body;

    const article = await prisma.helpArticle.update({
        where: { id },
        data: { title, content, category, audience }
    });

    res.status(200).json({
        status: 'success',
        data: { ...article, _id: article.id }
    });
});

exports.deleteArticle = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    await prisma.helpArticle.delete({
        where: { id }
    });

    res.status(204).json({
        status: 'success',
        data: null
    });
});

exports.getArticleById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const article = await prisma.helpArticle.findUnique({
        where: { id }
    });

    if (!article) {
        return next(new AppError('No article found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { ...article, _id: article.id }
    });
});

// FAQS
exports.getFAQs = catchAsync(async (req, res, next) => {
    const { audience } = req.query;
    const where = {};
    if (audience) where.audience = audience;

    const faqs = await prisma.fAQ.findMany({
        where,
        orderBy: { order: 'asc' }
    });

    res.status(200).json({
        status: 'success',
        data: faqs.map(f => ({ ...f, _id: f.id }))
    });
});

exports.createFAQ = catchAsync(async (req, res, next) => {
    const { question, answer, audience, order } = req.body;

    const faq = await prisma.fAQ.create({
        data: { question, answer, audience, order: order || 0 }
    });

    res.status(201).json({
        status: 'success',
        data: { ...faq, _id: faq.id }
    });
});

exports.updateFAQ = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { question, answer, audience, order } = req.body;

    const faq = await prisma.fAQ.update({
        where: { id },
        data: { question, answer, audience, order }
    });

    res.status(200).json({
        status: 'success',
        data: { ...faq, _id: faq.id }
    });
});

exports.deleteFAQ = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    await prisma.fAQ.delete({
        where: { id }
    });

    res.status(204).json({
        status: 'success',
        data: null
    });
});
