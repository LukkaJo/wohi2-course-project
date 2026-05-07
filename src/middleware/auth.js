const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {

  console.log(process.env.JWT_SECRET);
  console.log("HEADERS:", req.headers);

  const authHeader =
    req.headers.authorization || req.headers.Authorization;

  console.log("AUTH HEADER:", authHeader);

  if (!authHeader) {
    return res.status(401).json({
      error: "Authorization token missing",
    });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      error: "Invalid authorization format",
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);

    return res.status(403).json({
      error: "Invalid or expired token",
    });
  }
}

module.exports = authenticate;