require('module-alias/register');

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const apiRoutes = require('@src/routes/main');

// Initialize Telegram bot (handlers will register on import)
require('@src/bot/telegramBot');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB connection
(async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
})();

// Routes
app.use('/api', apiRoutes);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server is running at ${url}`);
});

module.exports = app;
