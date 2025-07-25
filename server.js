// 1. ---- INCLUDES AND SETUP ----
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 2. ---- CONSTANTS ----
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.txt');
const CHAT_TEMPLATE_FILE = path.join(__dirname, 'views/chat.html');

// 3. ---- HELPER FUNCTIONS ----
function ensureFilesExist() { /* ... same as before ... */ }
function getFormattedTimestamp() { /* ... same as before ... */ }
function logMessage(username, message) { /* ... same as before ... */ }

// --- NEW HELPER FOR SERVER-SIDE RENDERING ---
function renderChatPage(username, callback) {
    // Read the chat history and the HTML template at the same time
    fs.readFile(CHATS_FILE, 'utf8', (err, chatHistory) => {
        if (err) return callback(err);
        
        fs.readFile(CHAT_TEMPLATE_FILE, 'utf8', (err, htmlTemplate) => {
            if (err) return callback(err);

            // Replace both placeholders
            let modifiedHtml = htmlTemplate.replace('USERNAME_PLACEHOLDER', username);
            modifiedHtml = modifiedHtml.replace('CHAT_HISTORY_PLACEHOLDER', chatHistory);

            callback(null, modifiedHtml);
        });
    });
}


// 4. ---- MIDDLEWARE ----
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// 5. ---- AUTH ROUTES ----
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'views/index.html')); });
app.get('/login', (req, res) => { res.sendFile(path.join(__dirname, 'views/login.html')); });
app.get('/createAccount', (req, res) => { res.sendFile(path.join(__dirname, 'views/createAccount.html')); });
app.post('/createAccount', (req, res) => { /* ... same as before ... */ });
app.post('/login', (req, res) => { /* ... same as before ... */ });

// 6. ---- CHAT ROUTES (REWRITTEN) ----

// GET /chat: Renders the page for the first time
app.get('/chat', (req, res) => {
    const username = req.query.username;
    if (!username) return res.redirect('/login');

    renderChatPage(username, (err, html) => {
        if (err) {
            console.error("Error rendering chat page:", err);
            return res.status(500).send("Error loading chat.");
        }
        res.send(html);
    });
});

// GET /messages: For modern browsers and polling clients
app.get('/messages', (req, res) => {
    res.sendFile(CHATS_FILE);
});

// POST /message: The new logic for legacy browsers
app.post('/message', (req, res) => {
    const { username, message } = req.body;
    if (username && message) {
        const loggedMessage = logMessage(username, message);
        // Alert modern browsers instantly
        io.emit('chat message', loggedMessage);
    }
    
    // For the Opera Mini user, re-render the entire page with the new message included
    renderChatPage(username, (err, html) => {
        if (err) {
            console.error("Error re-rendering chat page after post:", err);
            // If rendering fails, redirect as a fallback
            return res.redirect(`/chat?username=${encodeURIComponent(username)}`);
        }
        // Send the fully updated page as the response to the POST
        res.send(html);
    });
});


// 7. ---- WEBSOCKET LOGIC ----
io.on('connection', (socket) => { /* ... same as before ... */ });

// 8. ---- START THE SERVER ----
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
    ensureFilesExist();
    console.log(`Server is running on PORT ${PORT} and HOST ${HOST}`);
});

// Helper functions that were shortened for brevity
function ensureFilesExist() { if (!fs.existsSync(DATA_DIR)) { fs.mkdirSync(DATA_DIR); } if (!fs.existsSync(USERS_FILE)) { fs.writeFileSync(USERS_FILE, JSON.stringify({})); } if (!fs.existsSync(CHATS_FILE)) { fs.writeFileSync(CHATS_FILE, ''); } }
function getFormattedTimestamp() { const ts = new Date(); const d = String(ts.getDate()).padStart(2, '0'); const m = String(ts.getMonth() + 1).padStart(2, '0'); const y = ts.getFullYear(); const h = String(ts.getHours()).padStart(2, '0'); const min = String(ts.getMinutes()).padStart(2, '0'); const s = String(ts.getSeconds()).padStart(2, '0'); return `[${d}/${m}/${y}, ${h}:${min}:${s}]`; }
function logMessage(username, message) { const formattedMessage = `${getFormattedTimestamp()} <${username}>: ${message}\n`; fs.appendFileSync(CHATS_FILE, formattedMessage); return formattedMessage; }
app.post('/createAccount', (req, res) => { const { username, password } = req.body; if (!username || !password) { return res.status(400).send('Username and password are required.'); } const users = JSON.parse(fs.readFileSync(USERS_FILE)); if (users[username]) { return res.status(409).send('Username already exists. <a href="/createAccount">Try again</a>.'); } users[username] = password; fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); res.redirect('/login'); });
app.post('/login', (req, res) => { const { username, password } = req.body; const users = JSON.parse(fs.readFileSync(USERS_FILE)); if (users[username] && users[username] === password) { res.redirect(`/chat?username=${encodeURIComponent(username)}`); } else { res.status(401).send('Invalid username or password. <a href="/login">Try again</a>.'); } });
io.on('connection', (socket) => { console.log('A user connected via WebSocket'); socket.on('chat message', (data) => { const { username, msg } = data; if (username && msg) { const loggedMessage = logMessage(username, msg); io.emit('chat message', loggedMessage); } }); socket.on('disconnect', () => { console.log('A user disconnected'); }); });