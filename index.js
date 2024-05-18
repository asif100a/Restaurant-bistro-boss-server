require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 7000;

// Middleware
app.use(cors());
app.use(express.json());

// Check the server
app.get('/', (req, res) => {
    res.send('The Restaurant bistro boss server is running.......');
});

// Listen the server
app.listen(port, () => {
    console.log(`The bistro boss running on port: ${port}`);
});