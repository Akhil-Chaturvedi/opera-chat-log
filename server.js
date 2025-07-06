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

// This function runs at startup to make sure our data directory and files exist.
function ensureFilesExist() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
    }
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({})); // Create an empty user object
    }
    if (!fs.existsSync(CHATS_FILE)) {
        fs.writeFileSync(CHATS_FILE, ''); // Create an empty chat log
    }
}

// 4. ---- MIDDLEWARE ----

// This allows Express to read data from HTML forms
app.use(express.urlencoded({ extended: true }));

// 5. ---- ROUTES ----

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

// Serve the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/login.html'));
});

// Serve the create account page
app.get('/createAccount', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/createAccount.html'));
});

// Handle the "Create Account" form submission
app.post('/createAccount', (req, res) => {
    const { username, password } = req.body;
    
    // Basic validation
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    const users = JSON.parse(fs.readFileSync(USERS_FILE));

    if (users[username]) {
        // User already exists
        return res.status(409).send('Username already exists. <a href="/createAccount">Try again</a>.');
    }

    // Add new user (in a real app, you would hash the password!)
    users[username] = password;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    // Redirect to the login page after successful creation
    res.redirect('/login');
});

// Handle the "Login" form submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));

    // Check if user exists and password is correct
    if (users[username] && users[username] === password) {
        // Success! Redirect to the chat page.
        // We pass the username in the URL so the chat page knows who is logged in.
        res.redirect(`/chat?username=${encodeURIComponent(username)}`);
    } else {
        // Failure
        res.status(401).send('Invalid username or password. <a href="/login">Try again</a>.');
    }
});


// 6. ---- START THE SERVER ----
server.listen(PORT, () => {
    ensureFilesExist(); // Make sure our data files are ready
    console.log(`Server is running on http://localhost:${PORT}`);
});