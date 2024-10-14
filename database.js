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

var articles = [];
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
        const newDataReq = await fetch(config.wikiDatabaseURL + '/articles/.json');
        const newData = await newDataReq.text();

        if (newData === 'null') {
            isRestoring = false;
            return console.log(`No articles found. - ${formatDate()}`);
        } else {
            const newDataJson = JSON.parse(newData);

            articles.length = 0;
            newDataJson.forEach(article => {
                articles.push(article);
            });
            isRestoring = false;
            console.log(`Article list restored successfully - ${formatDate()}`);
        }
    } catch {
        console.log(`Error during restoring article list - ${formatDate()}`);
        setTimeout(restoreArticles, 1000);
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
        await fetch(config.wikiDatabaseURL + '/articles/.json', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(articles)
        });
        console.log(`Database article list updated successfully - ${formatDate()}`);
    } catch {
        console.log(`Fail during database article list update - ${formatDate()}`);
    }
}

// article data retrieving

/**
 * Gets the article ID by its name.
 * @param {string} articleName - The name of the article.
 * @returns {number|null} The article ID or null if not found.
 * @example
 * const articleId = getArticleIDbyName('Example Article');
 * @description Searches the articles array for an article by its name and returns its index.
 */
function getArticleIDbyName(articleName) {
    try {
        let articleFound = false;
        let articleID;
        for (let i = 0; i < articles.length; i++) {
            if (articles[i].articleName === articleName) {
                articleFound = true;
                articleID = i;
                break;
            }
        }
        if (articleFound) {
            return articleID;
        } else {
            return null;
        }
    } catch {
        console.log(`Error during returning article id - ${formatDate()}`);
        return null;
    }
}

/**
 * Retrieves the articles list.
 * @returns {object|null} The articles object or null if there are no articles.
 * @example
 * const articles = getArticles();
 * @description Returns the articles object.
 */
function getArticles() {
    try {
        return articles;
    } catch {
        console.log(`Error during retrieving articles list - ${formatDate()}`);
    }
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
    try {
        return articles[articleId];
    } catch {
        console.log(`Error during retrieving article data - ${formatDate()}`);
    }
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
    try {
        const latestArticlesSlice = articles.slice(-n);
        const latestArticles = latestArticlesSlice.map(article => ({
            articleName: article.articleName,
            visits: article.visits
        }));
        return latestArticles;
    } catch (error) {
        console.log(`Error during returning latest articles - ${formatDate()}`);
        return [];
    }
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
    try {
        const sortedArticles = articles.slice().sort((a, b) => b.visits - a.visits);
        const mostPopularArticles = sortedArticles.slice(0, n).map(article => ({
            articleName: article.articleName,
            visits: article.visits
        }));
        return mostPopularArticles;
    } catch (error) {
        console.log(`Error during returning most popular articles - ${formatDate()}`);
        return [];
    }
}

// article management

/**
 * Adds a new article.
 * @param {string} articleName - The name of the article.
 * @param {string} articleContent - The content of the article.
 * @example
 * addArticle('New Article', 'Content of the new article');
 * @description Creates a new article and adds it to the articles list, then updates the database.
 */
function addArticle(articleName, articleContent) {
    try {
        const newArticle = {
            articleName,
            articleContent,
            'visits': 0
        };
        articles.push(newArticle);
        updateArticlesInDB();
        console.log(`Article "${articleName}" created - ${formatDate()}`);
    } catch {
        console.log(`Error during article creation - ${formatDate()}`);
    }
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
    try {
        articles[articleId].articleName = newData.articleName;
        articles[articleId].articleContent = newData.articleContent;
        updateArticlesInDB();
        console.log(`Article "${newData.articleName}" updated - ${formatDate()}`);
    } catch {
        console.log(`Error during article update - ${formatDate()}`);
    }
}

// visits

/**
 * Gets the total number of visits across all articles.
 * @returns {number} The total number of visits.
 * @example
 * const totalVisits = getTotalVisits();
 * @description Sums up the visits from all articles.
 */
function getTotalVisits() {
    try {
        let totalVisits = 0;
        for (let i = 0; i < articles.length; i++) {
            totalVisits += articles[i].visits;
        }
        return totalVisits;
    } catch {
        console.log(`Error during retrieving total article visits - ${formatDate()}`);
        return 0;
    }
}

/**
 * Adds a visit to an article.
 * @param {number} articleId - The ID of the article.
 * @example
 * addVisit(0);
 * @description Increments the visit count for the specified article and updates the database.
 */
function addVisit(articleId) {
    articles[articleId].visits += 1;
    updateArticlesInDB();
    console.log(`Visit to article ${articleId} added - ${formatDate()}`);
}

/**
 * Removes a visit from an article.
 * @param {number} articleId - The ID of the article.
 * @example
 * remVisit(0);
 * @description Decrements the visit count for the specified article and updates the database.
 */
function remVisit(articleId) {
    articles[articleId].visits -= 1;
    updateArticlesInDB();
    console.log(`Visit to article ${articleId} removed - ${formatDate()}`);
}

/**
 * Resets the visit counts for all articles to zero.
 * @example
 * resetVisits();
 * @description Sets all articles' visit counts to zero and updates the database.
 */
function resetVisits() {
    for (let i = 0; i < articles.length; i++) {
        articles[i].visits = 0;
    }
    updateArticlesInDB();
}

module.exports = {
    articles,
    getArticleIDbyName,
    getArticles,
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