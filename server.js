const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

console.log("Starting the server...");

app.use(bodyParser.json());
app.get('/', (req, res) => res.send('Hello, How are you?'));

app.listen(port, () => console.log(`Server is running on port ${port}`));