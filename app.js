const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const config = require('./config.json');
const lang = require('./lang.json');
const database = require('./database');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'pages'));

function getKey(key) {
    return crypto.createHash('sha256').update(key).digest();
}
function encrypt(text, key) {
    try {
        const algorithm = 'aes-256-cbc';
        const iv = crypto.randomBytes(16);
        const derivedKey = getKey(key);

        const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.log('Error during encryption.');
    }
}
function decrypt(text, key) {
    try {
        const algorithm = 'aes-256-cbc';
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const derivedKey = getKey(key);

        const decipher = crypto.createDecipheriv(algorithm, derivedKey, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch {
        console.log('Error during decryption.');
    }
}

function isAdminLoginValid(adminName, adminPassword) {
    const admin = config['wikiAdmin'].find(admin => admin.userName === adminName);
    
    if (admin) {
        return admin.userPassword === adminPassword;
    }
    
    return false;
}

function parseWikitext(wikitext) {
    let html = wikitext;

    html = html.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
    html = html.replace(/''(.*?)''/g, '<em>$1</em>');

    html = html.replace(/^======\s*(.*?)\s*======$/gm, '<h6>$1</h6>');
    html = html.replace(/^=====\s*(.*?)\s*=====$/gm, '<h5>$1</h5>');
    html = html.replace(/^====\s*(.*?)\s*====$/gm, '<h4>$1</h4>');
    html = html.replace(/^===\s*(.*?)\s*===$/gm, '<h3>$1</h3>');
    html = html.replace(/^==\s*(.*?)\s*==$/gm, '<h2>$1</h2>');
    html = html.replace(/^=\s*(.*?)\s*=$/gm, '<h1>$1</h1>');

    html = html.replace(/\[\[Image:(.*?)\|([^|\]]+)(?:\|(\d+px))?(?:\|(\d+px))?\]\]/g, (match, url, title, width, height) => {
        let imgHtml = `<img src="${url}"`;
        if (title) {
            imgHtml += ` title="${title}"`;
        }
        if (width) {
            imgHtml += ` width="${width}"`;
        }
        if (height) {
            imgHtml += ` height="${height}"`;
        }
        imgHtml += '>';
        return imgHtml;
    });

    html = html.replace(/\[\[Image:(.*?)\|([^|\]]+)?(?:\|(\d+px))?(?:\|(\d+px))?\]\]/g, (match, url, title, width, height) => {
        let imgHtml = `<img src="${url}"`;
        if (title) {
            imgHtml += ` title="${title}"`;
        }
        if (width) {
            imgHtml += ` width="${width}"`;
        }
        if (height) {
            imgHtml += ` height="${height}"`;
        }
        imgHtml += '>';
        return imgHtml;
    });

    html = html.replace(/\[\[([^|\]]+)\|([^|\]]+)\]\]/g, '<a href="/wiki/$1">$2</a>');
    html = html.replace(/\[\[([^|\]]+)\]\]/g, '<a href="/wiki/$1">$1</a>');

    html = html.replace(/\[([^\s\]]+)\s([^\]]+)\]/g, '<a href="$1" target="_blank">$2</a>');

    const citationMap = new Map();
    let citationCount = 0;

    html = html.replace(/<ref>(.*?)<\/ref>/g, (match, url) => {
        if (!citationMap.has(url)) {
            citationCount += 1;
            citationMap.set(url, citationCount);
        }
        const count = citationMap.get(url);
        return `<a href="${url}" class="ref">[${count}]</a>`;
    });

    html = html.replace(/^\*\s*(.*)$/gm, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\n<ul>/g, '');

    html = html.replace(/^\#\s*(.*)$/gm, '<ol><li>$1</li></ol>');
    html = html.replace(/<\/ol>\n<ol>/g, '');

    html = html.replace(/^\{\|([\s\S]*?)\|\}$/gm, function(match, content) {
        let tableHtml = '<table>';
        content.split('\n').forEach(row => {
            if (row.startsWith('|-')) {
                tableHtml += '</tr>';
            } else if (row.startsWith('|}')) {
                tableHtml += '</table>';
            } else if (row.startsWith('|')) {
                tableHtml += '<tr>';
                row.split('|').slice(1).forEach(cell => {
                    tableHtml += '<td>' + cell.trim() + '</td>';
                });
                tableHtml += '</tr>';
            } else {
                tableHtml += '<tr><td>' + row.trim() + '</td></tr>';
            }
        });
        tableHtml += '</table>';
        return tableHtml;
    });

    html = html.replace(/^(?!<h\d>|<ul>|<ol>|<table>|<img>|<a>|<strong>|<em>|<\/?ref)(.*)$/gm, '<p>$1</p>');

    html = '<p>' + html + '</p>';

    return html;
}

app.get('/admin', (req, res) => {
    try {
        const xAuthToken = req.cookies['x-auth-token'];

        if (!xAuthToken) {
            const artParams = {
                wikiIcon: config['wikiIcon'],
                wikiName: config['wikiName'],
                wikiLicense: config['wikiLicense'],
                wikiLicenseURL: config['wikiLicenseURL'],
                lang: lang[config['wikiLanguage']]
            };
            res.render('login', artParams);
        } else {
            const decryptedToken = JSON.parse(decrypt(xAuthToken, config['wikiSecretKey']));
            if (isAdminLoginValid(decryptedToken.adminName, decryptedToken.adminPassword)) {
                res.redirect('/admin/panel');
            }
        }
    } catch {
        return res.status(500).send();
    }
});

app.get('/admin/panel', (req, res) => {
    try {
        const xAuthToken = req.cookies['x-auth-token'];

        if (!xAuthToken) {
            res.redirect('/admin');
        } else {
            const decryptedToken = JSON.parse(decrypt(xAuthToken, config['wikiSecretKey']));
            if (!isAdminLoginValid(decryptedToken.adminName, decryptedToken.adminPassword)) {
                res.redirect('/admin');
            } else {
                const artParams = {
                    wikiIcon: config['wikiIcon'],
                    wikiName: config['wikiName'],
                    wikiLicense: config['wikiLicense'],
                    wikiLicenseURL: config['wikiLicenseURL'],
                    articles: database.articles,
                    totalVisits: database.getTotalVisits(),
                    latestArticles: database.getLatestArticles(),
                    popularArticles: database.getMostPopularArticles(),
                    lang: lang[config['wikiLanguage']]
                };
                res.render('panel', artParams);
            }
        }
    } catch {
        return res.status(500).send();
    }
});

app.get('/admin/articles', (req, res) => {
    try {
        const xAuthToken = req.cookies['x-auth-token'];

        if (!xAuthToken) {
            res.redirect('/admin');
        } else {
            const decryptedToken = JSON.parse(decrypt(xAuthToken, config['wikiSecretKey']));
            if (!isAdminLoginValid(decryptedToken.adminName, decryptedToken.adminPassword)) {
                res.redirect('/admin');
            } else {
                const artParams = {
                    wikiIcon: config['wikiIcon'],
                    wikiName: config['wikiName'],
                    wikiLicense: config['wikiLicense'],
                    wikiLicenseURL: config['wikiLicenseURL'],
                    articles: database.articles,
                    lang: lang[config['wikiLanguage']]
                };
                res.render('articles', artParams);
            }
        }
    } catch {
        return res.status(500).send();
    }
});

app.get('/admin/editor', (req, res) => {
    try {
        const xAuthToken = req.cookies['x-auth-token'];
        const { id } = req.query;

        if (!xAuthToken) {
            res.redirect('/admin');
        } else {
            const decryptedToken = JSON.parse(decrypt(xAuthToken, config['wikiSecretKey']));
            if (!isAdminLoginValid(decryptedToken.adminName, decryptedToken.adminPassword)) {
                res.redirect('/admin');
            } else {
                if (!id) {
                    const artParams = {
                        wikiIcon: config['wikiIcon'],
                        wikiName: config['wikiName'],
                        wikiLicense: config['wikiLicense'],
                        wikiLicenseURL: config['wikiLicenseURL'],
                        articles: database.articles,
                        articleName: '',
                        articleContent: '',
                        lang: lang[config['wikiLanguage']]
                    };
                    res.render('editor', artParams);
                } else {
                    const artParams = {
                        wikiIcon: config['wikiIcon'],
                        wikiName: config['wikiName'],
                        wikiLicense: config['wikiLicense'],
                        wikiLicenseURL: config['wikiLicenseURL'],
                        articles: database.articles,
                        articleName: database.getArticle(id)['articleName'],
                        articleContent: database.getArticle(id)['articleContent'],
                        lang: lang[config['wikiLanguage']]
                    };
                    res.render('editor', artParams);
                }
            }
        }
    } catch {
        return res.status(500).send();
    }
});

app.get(['/','/wiki','/wiki/'], (req, res) => {
    try {
        const articles = database.articles;

        if (articles.length > 0) {
            res.redirect(`/wiki/${articles[0].articleName}`);
        } else {
            const artParams = {
                wikiIcon: config['wikiIcon'],
                wikiName: config['wikiName'],
                wikiDescription: config['wikiDescription'],
                wikiLicense: config['wikiLicense'],
                wikiLicenseURL: config['wikiLicenseURL'],
                articleName: lang[config['wikiLanguage']].noarticles,
                articleContent: parseWikitext(lang[config['wikiLanguage']].noarticles_msg),
                articles: articles,
                lang: lang[config['wikiLanguage']]
            };
            res.render('wiki', artParams);
        }
    } catch {
        return res.status(500).send();
    }
});

app.get('/wiki/:articleName', (req, res) => {
    try {
        const articleName = req.params.articleName;
        const articles = database.articles;
        const article = articles.find(a => a.articleName === articleName);

        if (article) {
            const artParams = {
                wikiIcon: config['wikiIcon'],
                wikiName: config['wikiName'],
                wikiDescription: config['wikiDescription'],
                wikiLicense: config['wikiLicense'],
                wikiLicenseURL: config['wikiLicenseURL'],
                articleName: article.articleName,
                articleContent: parseWikitext(article.articleContent),
                articles: articles,
                lang: lang[config['wikiLanguage']]
            };
            
            database.addVisit(database.getArticleIDbyName(article.articleName));

            res.render('wiki', artParams);
        } else {
            const artParams = {
                wikiIcon: config['wikiIcon'],
                wikiName: config['wikiName'],
                wikiDescription: config['wikiDescription'],
                wikiLicense: config['wikiLicense'],
                wikiLicenseURL: config['wikiLicenseURL'],
                articleName: lang[config['wikiLanguage']].articledoesntexists,
                articleContent: parseWikitext(lang[config['wikiLanguage']].articledoesntexists_msg),
                articles: articles,
                lang: lang[config['wikiLanguage']]
            };
            res.render('wiki', artParams);
        }
    } catch {
        return res.status(500).send();
    }
});

// API

app.post('/api/admin/login', (req, res) => {
    try {
        const { adminName, adminPassword } = req.body;

        if (isAdminLoginValid(adminName, adminPassword)) {
            const loginData = {
                adminName,
                adminPassword
            };

            const encryptedData = encrypt(JSON.stringify(loginData), config['wikiSecretKey']);

            const expires = new Date();
            expires.setDate(expires.getDate() + 30);

            res.cookie('x-auth-token', encryptedData, {
                expires: expires,
                secure: true,
                httpOnly: true
            });
            res.send('login success');
        } else {
            res.status(401).send('login fail');
        }
    } catch {
        res.status(500).send();
    }
});

app.post('/admin/delete', async (req, res) => {
    try {
        const xAuthToken = req.cookies['x-auth-token'];
        const { id } = req.query;

        if (!xAuthToken) {
            res.redirect('/admin');
        } else {
            const decryptedToken = JSON.parse(decrypt(xAuthToken, config['wikiSecretKey']));
            if (isAdminLoginValid(decryptedToken.adminName, decryptedToken.adminPassword)) {
                await database.remArticle(id);
                res.status(200).send();
            }
        }
    } catch {
        return res.status(500).send();
    }
});

app.post('/admin/resetvisits', async (req, res) => {
    try {
        const xAuthToken = req.cookies['x-auth-token'];

        if (!xAuthToken) {
            res.redirect('/admin');
        } else {
            const decryptedToken = JSON.parse(decrypt(xAuthToken, config['wikiSecretKey']));
            if (isAdminLoginValid(decryptedToken.adminName, decryptedToken.adminPassword)) {
                await database.resetVisits();
                res.status(200).send();
            }
        }
    } catch {
        return res.status(500).send();
    }
});

app.post('/admin/save', async (req, res) => {
    try {
        const xAuthToken = req.cookies['x-auth-token'];
        const { id } = req.query;
        const { articleName, articleContent } = req.body;

        if (!xAuthToken) {
            res.redirect('/admin');
        } else {
            const decryptedToken = JSON.parse(decrypt(xAuthToken, config['wikiSecretKey']));
            if (isAdminLoginValid(decryptedToken.adminName, decryptedToken.adminPassword)) {
                if (!id) {
                    await database.addArticle(articleName, articleContent);
                    res.status(200).send();
                } else {
                    const newData = {
                        articleName,
                        articleContent
                    }

                    await database.saveArticle(id, newData);
                    res.status(200).send();
                }
            }
        }
    } catch {
        return res.status(500).send();
    }
});

app.post('/api/wikitext', (req, res) => {
    try {
        const { wikitext } = req.body;

        return res.send(parseWikitext(wikitext));
    } catch {
        return res.status(500).send();
    }
});

app.get('/assets/:fileName', (req, res) => {
    try {
        const { fileName } = req.params;

        if (fs.existsSync(__dirname + '/pages/assets/' + fileName)) {
            return res.sendFile(__dirname + '/pages/assets/' + fileName);
        } else {
            return res.status(404).send('File not found.');
        }
    } catch {
        return res.status(500).send();
    }
});

app.listen(3300, () => {
    console.log('Wiki started on port 3300.\n\nhttp://localhost:3300/wiki\nhttp://localhost:3300/admin');
    require('child_process').exec('start http://localhost:3300/');
});