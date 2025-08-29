const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1]; // format: Bearer <token>

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user data to request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token is not valid" });
  }
}

module.exports = auth;
