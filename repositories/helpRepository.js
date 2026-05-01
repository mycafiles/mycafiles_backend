const prisma = require('../config/prisma');

function findArticles(where = {}) {
    return prisma.helpArticle.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });
}

function findArticleById(id) {
    return prisma.helpArticle.findUnique({ where: { id } });
}

function createArticle(data) {
    return prisma.helpArticle.create({ data });
}

function updateArticle(id, data) {
    return prisma.helpArticle.update({
        where: { id },
        data
    });
}

function deleteArticle(id) {
    return prisma.helpArticle.delete({ where: { id } });
}

function findFaqs(where = {}) {
    return prisma.fAQ.findMany({
        where,
        orderBy: { order: 'asc' }
    });
}

function createFaq(data) {
    return prisma.fAQ.create({ data });
}

function updateFaq(id, data) {
    return prisma.fAQ.update({
        where: { id },
        data
    });
}

function deleteFaq(id) {
    return prisma.fAQ.delete({ where: { id } });
}

module.exports = {
    findArticles,
    findArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    findFaqs,
    createFaq,
    updateFaq,
    deleteFaq
};
