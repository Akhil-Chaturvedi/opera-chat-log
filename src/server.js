const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const CHAT_FILE = path.join(__dirname, "../data/chat.txt");
const USERS_FILE = path.join(__dirname, "../data/users.json");
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({}));
}

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "../views")));

// Handle socket connections
io.on("connection", (socket) => {
  // Create Account
  socket.on("createAccount", ({ username, password }) => {
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (users[username]) {
      socket.emit("loginFailure", "Username already exists.");
    } else {
      users[username] = password;
      fs.writeFileSync(USERS_FILE, JSON.stringify(users));
      socket.emit("loginSuccess");
    }
  });

  // Login
  socket.on("login", ({ username, password }) => {
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (users[username] && users[username] === password) {
      socket.emit("loginSuccess");
    } else {
      socket.emit("loginFailure", "Invalid username or password.");
    }
  });

  // Handle messages
  socket.on("message", (data) => {
    const { username, message } = data;
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const logMessage = `[${timestamp}] ${username}: ${message}\n`;

    // Append message to the log file
    fs.appendFile(CHAT_FILE, logMessage, (err) => {
      if (err) console.error("Failed to log message:", err);
    });

    // Check file size and truncate if necessary
    fs.stat(CHAT_FILE, (err, stats) => {
      if (!err && stats.size > MAX_FILE_SIZE) {
        fs.truncate(CHAT_FILE, 0, (err) => {
          if (err) console.error("Failed to truncate chat file:", err);
        });
      }
    });

    // Broadcast message to all clients
    io.emit("message", { username, message });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
