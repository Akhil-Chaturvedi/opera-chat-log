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

// 3. ---- HELPER FUNCTIONS ----
function ensureFilesExist() { /* ... (same as before) ... */ }

// ---- NEW: Timestamp and Logging Functions ----
// Get timestamp in the required format: [DD/MM/YYYY, HH:MM:SS]
function getFormattedTimestamp() {
    const ts = new Date();
    const date = String(ts.getDate()).padStart(2, '0');
    const month = String(ts.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = ts.getFullYear();
    const hours = String(ts.getHours()).padStart(2, '0');
    const minutes = String(ts.getMinutes()).padStart(2, '0');
    const seconds = String(ts.getSeconds()).padStart(2, '0');
    return `[${date}/${month}/${year}, ${hours}:${minutes}:${seconds}]`;
}

// Append a message to the chat log and return the formatted string
function logMessage(username, message) {
    const formattedMessage = `${getFormattedTimestamp()} <${username}>: ${message}\n`;
    fs.appendFileSync(CHATS_FILE, formattedMessage);
    return formattedMessage;
}
// ---- END NEW ----

// 4. ---- MIDDLEWARE ----
app.use(express.urlencoded({ extended: true }));

// 5. ---- ROUTES ----
app.get('/', (req, res) => { /* ... (same as before) ... */ });
app.get('/login', (req, res) => { /* ... (same as before) ... */ });
app.get('/createAccount', (req, res) => { /* ... (same as before) ... */ });
app.post('/createAccount', (req, res) => { /* ... (same as before) ... */ });
app.post('/login', (req, res) => { /* ... (same as before) ... */ });

// ---- NEW: Chat-related Routes ----
// Serve the main chat page
app.get('/chat', (req, res) => {
    // A user must have a username to access the chat
    if (!req.query.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views/chat.html'));
});

// For Opera Mini (and other non-JS clients) to GET all messages
app.get('/messages', (req, res) => {
    res.sendFile(CHATS_FILE);
});

// For Opera Mini (and other non-JS clients) to POST a new message
app.post('/message', (req, res) => {
    const { username, message } = req.body;

    if (username && message) {
        const loggedMessage = logMessage(username, message);
        // Broadcast to modern clients so they see the message from the legacy user
        io.emit('chat message', loggedMessage);
    }
    
    // Redirect back to the chat page to "refresh" it for the Opera Mini user
    res.redirect(`/chat?username=${encodeURIComponent(username)}`);
});
// ---- END NEW ----

// ---- NEW: WebSocket Logic ----
io.on('connection', (socket) => {
    console.log('A user connected via WebSocket');

    // When a modern browser sends a message
    socket.on('chat message', (data) => {
        const { username, msg } = data;
        if (username && msg) {
            const loggedMessage = logMessage(username, msg);
            // Broadcast the message to ALL connected clients (including the sender)
            io.emit('chat message', loggedMessage);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});
// ---- END NEW ----


// 6. ---- START THE SERVER ----
server.listen(PORT, () => {
    ensureFilesExist();
    console.log(`Server is running on http://localhost:${PORT}`);
});