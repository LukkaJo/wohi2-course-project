const express = require('express');
const path = require('path'); // Lisätty path-moduuli polkujen käsittelyyn

const app = express();
const PORT = process.env.PORT || 3000;

const postsRouter = require("./routes/posts");
const authRouter = require("./routes/auth");
const prisma = require("./lib/prisma");


app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(express.json());

// everything under /api/posts
app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);

app.use((req, res) => {
  res.json({msg: "Not found"});
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});