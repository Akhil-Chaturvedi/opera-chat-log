// 1. Load Required Modules
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');

// 2. Initialize Server Components
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 3. Define Constants
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.txt');

// --- Helper Function to ensure data files exist ---
function ensureDataFilesExist() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
        console.log('Created data directory.');
    }
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({})); // Empty JSON object
        console.log('Created users.json.');
    }
    if (!fs.existsSync(CHATS_FILE)) {
        fs.writeFileSync(CHATS_FILE, ''); // Empty text file
        console.log('Created chats.txt.');
    }
}

// 4. Set up Middleware
// This helps our server understand data sent from forms.
app.use(express.urlencoded({ extended: true }));

// 5. Define Routes to Serve HTML Pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.get('/createAccount', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/createAccount.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/chat.html'));
});

// 6. Start the Server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    // Make sure our data files are ready before the server starts accepting requests
    ensureDataFilesExist();
});