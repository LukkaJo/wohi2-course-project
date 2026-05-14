const { ZodError } = require("zod");
const { AppError } = require("../lib/errors");

function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Invalid input", issues: err.issues });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }
  res.status(500).json({ message: "Internal server error" });
}

module.exports = errorHandler;