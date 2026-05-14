const path = require("path");
const express = require("express");
const pinoHttp = require("pino-http");
const logger = require("./lib/logger");
const postsRouter = require("./routes/posts");
const authRouter = require("./routes/auth");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());
app.use(pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url.startsWith("/uploads") },
}));

app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);
app.use((req, res) => res.status(404).json({ message: "Not found" }));
app.use(errorHandler);

module.exports = app;