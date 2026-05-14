const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;
const { UnauthorizedError, ForbiddenError } = require("../lib/errors");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return next(new UnauthorizedError("Authorization token missing"));
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return next(new UnauthorizedError("Invalid authorization format"));
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new ForbiddenError("Invalid or expired token"));
  }
}

module.exports = authenticate;