# SCHWiki 📚

## 1. Configuration ⚙️

Before you begin using SCHWiki, you'll need to configure the `config.json` file located in the wiki folder. This file contains essential configuration values. Please ensure the following fields are correctly set:

- **`wikiIcon`**: Path to the wiki icon/logo (e.g., `"/assets/SCHWiki_icon.svg"`).
- **`wikiName`**: The name of your wiki (e.g., `"SCHWiki"`).
- **`wikiDescription`**: A brief description of your wiki (e.g., `"An easy-to-install wiki? SCHWiki."`).
- **`wikiLanguage`**: The language code for your wiki (e.g., `"en"` for English, `"pt"` for Portuguese).
- **`wikiLicense`**: The name of the license used by the wiki (e.g., `"CC BY-SA"`).
- **`wikiLicenseURL`**: The URL to the license used by the wiki (e.g., `https://creativecommons.org/licenses/by-sa/4.0/deed.en`).
- **`wikiDatabaseURL`**: The URL of the Firebase database used by the wiki. Ensure it follows the format `https://<<db_name>>-default-rtdb.firebaseio.com`.
- **`wikiSecretKey`**: A secret key used for encrypting wiki data. Replace `"changethis"` with your own key.
- **`wikiAdmin`**: An array of admin logins. Each entry should include:
  - **`userName`**: Admin username (e.g., `"admin"`).
  - **`userPassword`**: Admin password (e.g., `"123456"`).

## 2. Installation 💻

To install SCHWiki, follow these steps:

1. Ensure you have **Node.js** and **npm** installed on your system.
2. Open a terminal or command prompt and navigate to the wiki folder.
3. Run the following command to install the necessary dependencies:

   ```bash
   npm install
   ```

## 3. Starting the Wiki 🚀

To launch the wiki, execute the following command in the terminal or command prompt:

```bash
npm start
```

The wiki will start and should be accessible at the local URL `http://localhost:3300`. To add articles, access the admin page available at `http://localhost:3300/admin`.

## 4. Accessing the Wiki 🌐

Open your web browser and go to `http://localhost:3300` to access the SCHWiki interface.
