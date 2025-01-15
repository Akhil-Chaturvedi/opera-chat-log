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

// Ensure files exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({}));
}
if (!fs.existsSync(CHAT_FILE)) {
  fs.writeFileSync(CHAT_FILE, "");
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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

// Fetch all messages from chat.txt
app.get("/fetchMessages", (req, res) => {
  fs.readFile(CHAT_FILE, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading chat file:", err);
      return res.status(500).send("Error reading chat file.");
    }
    res.status(200).send(data);
  });
});

// Send a new message
app.post("/sendMessage", (req, res) => {
  const { username, message } = req.body;
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
  const logMessage = `[${formattedTimestamp}] ${username}: ${message}\n`;

  // Append the message to chat.txt
  fs.appendFile(CHAT_FILE, logMessage, (err) => {
    if (err) {
      console.error("Error writing to chat file:", err);
      return res.status(500).send("Error saving message.");
    }
    res.status(200).send("Message sent.");
  });
});

// WebSocket for real-time communication
io.on("connection", (socket) => {
  console.log("A user connected.");

  // Send chat history to the new user
  fs.readFile(CHAT_FILE, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading chat file:", err);
      return;
    }
    socket.emit("chatHistory", data);
  });

  // Handle new messages
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

    // Append the message to chat.txt
    fs.appendFile(CHAT_FILE, logMessage, (err) => {
      if (err) {
        console.error("Error writing to chat file:", err);
        return;
      }
      // Broadcast the message to all clients
      io.emit("message", data);
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));