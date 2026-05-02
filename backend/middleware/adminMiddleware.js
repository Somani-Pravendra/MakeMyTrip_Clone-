const adminMiddleware = async (req, res, next) => {
  // Allow CORS preflight request
  if (req.method === "OPTIONS") {
    return next();
  }

  // req.user is already fetched from DB in authMiddleware (not from JWT payload)
  // so isAdmin here is always the live DB value — no bypass possible
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access only" });
  }

  next();
};

module.exports = adminMiddleware;
