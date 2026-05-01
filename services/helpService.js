const helpRepository = require('../repositories/helpRepository');
const AppError = require('../utils/AppError');

function withLegacyId(record) {
    return { ...record, _id: record.id };
}

async function getArticles(audience) {
    const where = {};
    if (audience) where.audience = audience;
    const articles = await helpRepository.findArticles(where);
    return articles.map(withLegacyId);
}

async function getArticleById(id) {
    const article = await helpRepository.findArticleById(id);
    if (!article) {
        throw new AppError('No article found with that ID', 404);
    }
    return withLegacyId(article);
}

async function createArticle(payload) {
    const { title, content, category, audience } = payload;
    const article = await helpRepository.createArticle({ title, content, category, audience });
    return withLegacyId(article);
}

async function updateArticle(id, payload) {
    const { title, content, category, audience } = payload;
    const article = await helpRepository.updateArticle(id, { title, content, category, audience });
    return withLegacyId(article);
}

async function deleteArticle(id) {
    await helpRepository.deleteArticle(id);
}

async function getFaqs(audience) {
    const where = {};
    if (audience) where.audience = audience;
    const faqs = await helpRepository.findFaqs(where);
    return faqs.map(withLegacyId);
}

async function createFaq(payload) {
    const { question, answer, audience, order } = payload;
    const faq = await helpRepository.createFaq({
        question,
        answer,
        audience,
        order: order || 0
    });
    return withLegacyId(faq);
}

async function updateFaq(id, payload) {
    const { question, answer, audience, order } = payload;
    const faq = await helpRepository.updateFaq(id, { question, answer, audience, order });
    return withLegacyId(faq);
}

async function deleteFaq(id) {
    await helpRepository.deleteFaq(id);
}

module.exports = {
    getArticles,
    getArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    getFaqs,
    createFaq,
    updateFaq,
    deleteFaq
};
