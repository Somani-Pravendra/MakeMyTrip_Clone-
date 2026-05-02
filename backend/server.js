const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const config = require("./config/env");
const MongoSessionStore = require("./stores/MongoSessionStore");

// Import passport configuration
require("./config/passport");

const app = express();

app.disable("x-powered-by");

if (config.isProduction) {
  app.set("trust proxy", 1);
}

if (config.enableRequestLogging) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// -------------------- MIDDLEWARE --------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// CORS Configuration
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true
  })
);

// Session Configuration
app.use(
  session({
    name: config.sessionCookieName,
    secret: config.sessionSecret,
    store: new MongoSessionStore({
      ttlMs: 1000 * 60 * 60 * 24
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// -------------------- DATABASE CONNECTION --------------------
mongoose.connect(config.mongoUri);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", async () => {
  console.log("Connected to MongoDB");
  try {
    const Flight = require("./models/Flight");
    const Train = require("./models/Train");
    await Flight.syncIndexes();
    await Train.syncIndexes();
    console.log("Flight indexes synced");
    console.log("Train indexes synced");
  } catch (indexError) {
    console.error("Failed to sync database indexes:", indexError.message);
  }
});

// -------------------- ROUTES --------------------
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/flights", require("./routes/flightRoutes"));
app.use("/api/trains", require("./routes/trainRoutes"));
app.use("/api/hotels", require("./routes/hotelRoutes"));
app.use("/api/buses", require("./routes/busRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/admin/trains", require("./routes/adminTrainRoutes"));
app.use("/api/admin/hotels", require("./routes/adminHotelRoutes"));
app.use("/api/admin/flights", require("./routes/adminFlightRoutes"));
app.use("/api/admin/buses", require("./routes/adminBusRoutes"));
app.use("/api/admin/offers", require("./routes/adminOfferRoutes"));
app.use("/api/offers", require("./routes/offerRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/packages", require("./routes/packageRoutes"));
app.use("/api/cabs", require("./routes/cabRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));

app.get("/api/admin/test", (req, res) => res.json({ status: "ok", path: "/api/admin/test" }));

app.get("/api/ping", (req, res) => {
  res.json({ message: "pong", time: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.send("API running");
});

// -------------------- GLOBAL ERROR HANDLER --------------------
// Must be defined after all routes
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = err.status || err.statusCode || 500;
  const message = config.isProduction
    ? "An unexpected error occurred"
    : (err.message || "An unexpected error occurred");
  res.status(status).json({ success: false, message });
});

// -------------------- SERVER --------------------
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
