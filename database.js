const config = require('./config.json');

function formatDate() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

let articles = [];
let isRestoring = false;

/**
 * Restores articles from the database.
 * @example
 * await restoreArticles();
 * @description Fetches articles from the configured database URL and updates the local articles array.
 */
async function restoreArticles() {
    try {
        isRestoring = true;
        const response = await fetch(`${config.wikiDatabaseURL}/articles/.json`);
        const data = await response.text();

        if (data === 'null') {
            console.log(`No articles found. - ${formatDate()}`);
        } else {
            articles = JSON.parse(data);
            console.log(`Article list restored successfully - ${formatDate()}`);
        }
    } catch (error) {
        console.error(`Error during restoring article list - ${formatDate()}`, error);
        setTimeout(restoreArticles, 1000);
    } finally {
        isRestoring = false;
    }
}
restoreArticles();

/**
 * Updates the articles in the database.
 * @example
 * await updateArticlesInDB();
 * @description Sends the current articles list to the database.
 */
async function updateArticlesInDB() {
    if (isRestoring) return;
    try {
        await fetch(`${config.wikiDatabaseURL}/articles/.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(articles),
        });
        console.log(`Database article list updated successfully - ${formatDate()}`);
    } catch (error) {
        console.error(`Fail during database article list update - ${formatDate()}`, error);
    }
}

/**
 * Gets the article ID by its name.
 * @param {string} articleName - The name of the article.
 * @returns {number|null} The article ID or null if not found.
 * @example
 * const articleId = getArticleIDbyName('Example Article');
 * @description Searches the articles array for an article by its name and returns its index.
 */
function getArticleIDbyName(articleName) {
    return articles.findIndex(article => article.articleName === articleName) || null;
}

/**
 * Retrieves an article by its ID.
 * @param {number} articleId - The ID of the article.
 * @returns {object|null} The article object or null if not found.
 * @example
 * const article = getArticle(0);
 * @description Returns the article object at the specified index.
 */
function getArticle(articleId) {
    return articles[articleId] || null;
}

/**
 * Gets the latest articles.
 * @param {number} [n=3] - The number of latest articles to retrieve.
 * @returns {Array} An array of the latest articles.
 * @example
 * const latestArticles = getLatestArticles();
 * @description Returns the n most recently added articles.
 */
function getLatestArticles(n = 3) {
    return articles.slice(-n).map(({ articleName, visits }) => ({ articleName, visits }));
}

/**
 * Gets the most popular articles based on visits.
 * @param {number} [n=3] - The number of popular articles to retrieve.
 * @returns {Array} An array of the most popular articles.
 * @example
 * const popularArticles = getMostPopularArticles();
 * @description Returns the n articles with the highest visit counts.
 */
function getMostPopularArticles(n = 3) {
    return [...articles].sort((a, b) => b.visits - a.visits).slice(0, n).map(({ articleName, visits }) => ({ articleName, visits }));
}

/**
 * Adds a new article.
 * @param {string} articleName - The name of the article.
 * @param {string} articleContent - The content of the article.
 * @example
 * addArticle('New Article', 'Content of the new article');
 * @description Creates a new article and adds it to the articles list, then updates the database.
 */
function addArticle(articleName, articleContent) {
    const newArticle = { articleName, articleContent, visits: 0 };
    articles.push(newArticle);
    updateArticlesInDB();
    console.log(`Article "${articleName}" created - ${formatDate()}`);
}

/**
 * Removes an article by its ID.
 * @param {number} articleId - The ID of the article to remove.
 * @example
 * remArticle(0);
 * @description Removes the article at the specified index and updates the database.
 */
function remArticle(articleId) {
    if (articleId >= 0 && articleId < articles.length) {
        articles.splice(articleId, 1);
        updateArticlesInDB();
        console.log(`Article ${articleId} removed - ${formatDate()}`);
    } else {
        console.error(`Invalid article ID - ${formatDate()}`);
    }
}

/**
 * Saves changes to an article.
 * @param {number} articleId - The ID of the article to update.
 * @param {object} newData - The new data for the article.
 * @example
 * saveArticle(0, { articleName: 'Updated Article', articleContent: 'New content' });
 * @description Updates the article's name and content, then updates the database.
 */
function saveArticle(articleId, newData) {
    if (articleId >= 0 && articleId < articles.length) {
        articles[articleId] = { ...articles[articleId], ...newData };
        updateArticlesInDB();
        console.log(`Article "${newData.articleName}" updated - ${formatDate()}`);
    } else {
        console.error(`Invalid article ID - ${formatDate()}`);
    }
}

/**
 * Gets the total number of visits across all articles.
 * @returns {number} The total number of visits.
 * @example
 * const totalVisits = getTotalVisits();
 * @description Sums up the visits from all articles.
 */
function getTotalVisits() {
    return articles.reduce((total, article) => total + article.visits, 0);
}

/**
 * Adds a visit to an article.
 * @param {number} articleId - The ID of the article.
 * @example
 * addVisit(0);
 * @description Increments the visit count for the specified article and updates the database.
 */
function addVisit(articleId) {
    if (articleId >= 0 && articleId < articles.length) {
        articles[articleId].visits++;
        updateArticlesInDB();
        console.log(`Visit to article ${articleId} added - ${formatDate()}`);
    } else {
        console.error(`Invalid article ID - ${formatDate()}`);
    }
}

/**
 * Removes a visit from an article.
 * @param {number} articleId - The ID of the article.
 * @example
 * remVisit(0);
 * @description Decrements the visit count for the specified article and updates the database.
 */
function remVisit(articleId) {
    if (articleId >= 0 && articleId < articles.length) {
        articles[articleId].visits--;
        updateArticlesInDB();
        console.log(`Visit to article ${articleId} removed - ${formatDate()}`);
    } else {
        console.error(`Invalid article ID - ${formatDate()}`);
    }
}

/**
 * Resets the visit counts for all articles to zero.
 * @example
 * resetVisits();
 * @description Sets all articles' visit counts to zero and updates the database.
 */
function resetVisits() {
    articles.forEach(article => article.visits = 0);
    updateArticlesInDB();
}

module.exports = {
    articles,
    getArticleIDbyName,
    getArticle,
    getLatestArticles,
    getMostPopularArticles,
    addArticle,
    remArticle,
    saveArticle,
    getTotalVisits,
    addVisit,
    remVisit,
    resetVisits
};