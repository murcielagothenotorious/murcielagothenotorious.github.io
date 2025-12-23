require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Create dist directory
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
}

// Copy all files to dist
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        // Skip node_modules, .git, dist, .env files
        if (['node_modules', '.git', 'dist', '.env', '.env.local'].includes(entry.name)) {
            continue;
        }

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Copy all files
copyDir('.', 'dist');

// Read index.html and replace placeholders with environment variables
let indexHtml = fs.readFileSync('dist/index.html', 'utf8');

const replacements = {
    '__FIREBASE_API_KEY__': process.env.FIREBASE_API_KEY || '',
    '__FIREBASE_AUTH_DOMAIN__': process.env.FIREBASE_AUTH_DOMAIN || '',
    '__FIREBASE_DATABASE_URL__': process.env.FIREBASE_DATABASE_URL || '',
    '__FIREBASE_PROJECT_ID__': process.env.FIREBASE_PROJECT_ID || '',
    '__FIREBASE_STORAGE_BUCKET__': process.env.FIREBASE_STORAGE_BUCKET || '',
    '__FIREBASE_MESSAGING_SENDER_ID__': process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    '__FIREBASE_APP_ID__': process.env.FIREBASE_APP_ID || '',
};

for (const [placeholder, value] of Object.entries(replacements)) {
    indexHtml = indexHtml.replace(placeholder, value);
}

fs.writeFileSync('dist/index.html', indexHtml);

console.log('Build completed! Environment variables injected.');
