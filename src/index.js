require('dotenv').config()

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const authenticate = require("./middleware/auth");

const postsRouter = require("./routes/posts");
const authRouter = require("./routes/auth");
const prisma = require("./lib/prisma");

app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(express.json());


// everything under /api/posts
app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});