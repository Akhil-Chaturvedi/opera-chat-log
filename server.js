const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const USERS_FILE = path.join(__dirname, "data/users.json");
const CHAT_FILE = path.join(__dirname, "data/chats.txt");
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

let messages = [];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Ensure users file exists
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({}));
}

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/createAccount", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "createAccount.html"));
});

app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "chat.html"));
});

app.post("/createAccount", (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  if (users[username]) return res.status(400).send("Username already exists.");
  users[username] = password;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users));
  res.status(200).redirect("/login");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  if (users[username] === password) {
    res.status(200).redirect("/chat?username=" + username);
  } else {
    res.status(400).send("Invalid username or password.");
  }
});

// WebSocket
io.on("connection", (socket) => {
  console.log("A user connected.");
  
  socket.on("message", (data) => {
    const timestamp = new Date();
    const formattedTimestamp = timestamp.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false, // 24-hour format
    });
    const logMessage = `[${formattedTimestamp}] ${data.username}: ${data.message}\n`;
    fs.appendFileSync(CHAT_FILE, logMessage);
    io.emit("message", data);
  });
});

app.get("/fetchMessages", (req, res) => {
  res.json(messages);
});

app.post("/sendMessage", (req, res) => {
  const { username, message } = req.body;
  messages.push({ username, message });
  if (messages.length > 100) messages.shift();
  res.status(200).send("Message sent.");
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));