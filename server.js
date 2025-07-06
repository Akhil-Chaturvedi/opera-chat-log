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
function ensureFilesExist() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
    }
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({}));
    }
    if (!fs.existsSync(CHATS_FILE)) {
        fs.writeFileSync(CHATS_FILE, '');
    }
}

function getFormattedTimestamp() {
    const ts = new Date();
    const date = String(ts.getDate()).padStart(2, '0');
    const month = String(ts.getMonth() + 1).padStart(2, '0');
    const year = ts.getFullYear();
    const hours = String(ts.getHours()).padStart(2, '0');
    const minutes = String(ts.getMinutes()).padStart(2, '0');
    const seconds = String(ts.getSeconds()).padStart(2, '0');
    return `[${date}/${month}/${year}, ${hours}:${minutes}:${seconds}]`;
}

function logMessage(username, message) {
    const formattedMessage = `${getFormattedTimestamp()} <${username}>: ${message}\n`;
    fs.appendFileSync(CHATS_FILE, formattedMessage);
    return formattedMessage;
}

// 4. ---- MIDDLEWARE ----
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// 5. ---- ROUTES ----
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.get('/createAccount', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/createAccount.html'));
});

app.post('/createAccount', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (users[username]) {
        return res.status(409).send('Username already exists. <a href="/createAccount">Try again</a>.');
    }
    users[username] = password;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.redirect('/login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (users[username] && users[username] === password) {
        res.redirect(`/chat?username=${encodeURIComponent(username)}`);
    } else {
        res.status(401).send('Invalid username or password. <a href="/login">Try again</a>.');
    }
});

// -- MODIFIED CHAT ROUTE --
// This route now reads chat.html, injects the username, and sends the result.
app.get('/chat', (req, res) => {
    const username = req.query.username;

    if (!username) {
        return res.redirect('/login');
    }

    fs.readFile(path.join(__dirname, 'views/chat.html'), 'utf8', (err, html) => {
        if (err) {
            console.error("Could not read chat.html file:", err);
            return res.status(500).send("An error occurred.");
        }
        const modifiedHtml = html.replace(/USERNAME_PLACEHOLDER/g, username);
        res.send(modifiedHtml);
    });
});

app.get('/messages', (req, res) => {
    res.sendFile(CHATS_FILE);
});

app.post('/message', (req, res) => {
    const { username, message } = req.body;
    if (username && message) {
        const loggedMessage = logMessage(username, message);
        io.emit('chat message', loggedMessage);
    }
    res.redirect(`/chat?username=${encodeURIComponent(username)}`);
});

// 6. ---- WEBSOCKET LOGIC ----
io.on('connection', (socket) => {
    console.log('A user connected via WebSocket');
    socket.on('chat message', (data) => {
        const { username, msg } = data;
        if (username && msg) {
            const loggedMessage = logMessage(username, msg);
            io.emit('chat message', loggedMessage);
        }
    });
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// 7. ---- START THE SERVER ----
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
    ensureFilesExist();
    console.log(`Server is running on PORT ${PORT} and HOST ${HOST}`);
    console.log(`It should be available at your Render URL.`);
});