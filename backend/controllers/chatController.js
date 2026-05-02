const jwt = require("jsonwebtoken");
const config = require("../config/env");
const Flight = require("../models/Flight");
const Hotel = require("../models/Hotel");
const Train = require("../models/Train");
const Bus = require("../models/Bus");
const Package = require("../models/Package");
const Offer = require("../models/Offer");
const Booking = require("../models/Booking");
const User = require("../models/User");

const SERVICE_ACTIONS = [
  { label: "Search Flights", path: "/flights" },
  { label: "Browse Hotels", path: "/hotels" },
  { label: "Check Trains", path: "/trains" },
  { label: "View Buses", path: "/bus" },
  { label: "Explore Packages", path: "/packages" },
  { label: "Open Wallet", path: "/wallet" }
];

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: {
      type: "string",
      description: "A concise, friendly travel assistant reply."
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
      description: "Short follow-up prompts the user can tap."
    }
  },
  required: ["reply", "suggestions"]
};
const OPENAI_SYSTEM_PROMPT =
  "You are a travel booking assistant for a MakeMyTrip-style web app. Use only the facts in the provided context. Do not invent fares, availability, booking status, refund amounts, or wallet balance. Keep replies short, useful, and friendly. Match the user's language style when practical. Return only JSON that matches the schema.";
const OPENAI_REASONING_EFFORTS = new Set(["minimal", "low", "medium", "high"]);

const FAQ_LIBRARY = [
  {
    keywords: ["cancel", "cancellation", "refund", "cancel booking"],
    answer:
      "You can cancel bookings from My Account or booking history. Refunds depend on time left before travel: more than 48 hours gets 90%, 24-48 hours gets 75%, 12-24 hours gets 50%, 6-12 hours gets 25%, 2-6 hours gets 12%, and less than 2 hours gets no refund."
  },
  {
    keywords: ["change flight date", "reschedule", "flight date", "modify flight"],
    answer:
      "Flight date changes depend on the airline policy. In this app, you can start from the Flights page and continue the booking flow again for the new date."
  },
  {
    keywords: ["ticket", "e-ticket", "receipt"],
    answer:
      "Your e-ticket is sent to the registered email and is also available from your booking history."
  },
  {
    keywords: ["group booking", "group discount"],
    answer:
      "For group bookings, the app supports multiple travellers in the same booking flow. If you need a larger custom request, contact support."
  },
  {
    keywords: ["payment", "upi", "card", "net banking", "wallet"],
    answer:
      "The app supports UPI, cards, net banking, and wallet payment flows. If wallet balance is not enough, the remaining amount can be paid through an external method."
  },
  {
    keywords: ["insurance"],
    answer:
      "Travel insurance is optional and can be added in supported booking flows where available."
  },
  {
    keywords: ["hidden charges", "fees", "pricing"],
    answer:
      "Pricing is shown before payment, including taxes and service fees, so users can review the total before confirming."
  },
  {
    keywords: ["services", "what do you offer", "what services"],
    answer:
      "The app offers flights, hotels, trains, buses, cabs, holiday packages, bookings, wallet, and support pages."
  },
  {
    keywords: ["customer support", "help", "support"],
    answer:
      "You can use this chatbot for instant help, or head to the Contact Us page for direct support details."
  },
  {
    keywords: ["mobile app"],
    answer:
      "This project is currently a web app. If you want, I can also help you plan a mobile-app version later."
  },
  {
    keywords: ["create account", "signup", "sign up", "register"],
    answer:
      "Use the Sign Up page to create an account. Login is available for email/password and Google sign-in."
  },
  {
    keywords: ["secure", "security", "password", "reset password", "forgot password"],
    answer:
      "Passwords can be reset from Forgot Password, then verified through OTP. The app stores password hashes and uses authenticated requests for private data."
  }
];

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9@/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasAnyKeyword = (text, keywords = []) => keywords.some((keyword) => text.includes(keyword));

const scoreFaq = (text, item) =>
  item.keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);

const getPathHint = (pathname = "") => {
  const path = String(pathname || "").toLowerCase();

  if (path.includes("/flights")) return "You are on the Flights area, so I can help you search routes, compare fares, or explain booking steps.";
  if (path.includes("/hotels")) return "You are on the Hotels area, so I can help with room selection, pricing, and booking steps.";
  if (path.includes("/trains")) return "You are on the Trains area, so I can help with class selection, berth booking, and PNR-related guidance.";
  if (path.includes("/bus")) return "You are on the Bus area, so I can help with seats, route search, and fare questions.";
  if (path.includes("/cabs")) return "You are on the Cabs area, so I can help with cab types, pricing, and pickup/drop details.";
  if (path.includes("/packages")) return "You are on the Packages area, so I can help with itineraries, travellers, and package booking.";
  if (path.includes("/profile")) return "You are on your profile page, so I can help with account details and booking history.";
  if (path.includes("/wallet")) return "You are on the Wallet page, so I can help with balance and transaction questions.";

  return "";
};

const getBookingsSummary = (bookings = [], limit = bookings.length) =>
  bookings.slice(0, Math.max(0, limit)).map((booking) => {
    const route = [booking.from, booking.to].filter(Boolean).join(" -> ");
    const title =
      booking.flight?.airline ||
      booking.train?.trainName ||
      booking.bus?.operatorName ||
      booking.hotel?.name ||
      booking.package?.title ||
      booking.category ||
      "Booking";

    return `${title}${route ? ` (${route})` : ""} - ${booking.status || "Unknown"} - Rs. ${Number(booking.totalFare || 0).toLocaleString("en-IN")}`;
  });

const resolveOptionalUser = async (req) => {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) return null;

  const token = header.split(" ")[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded?.id) return null;

    return await User.findById(decoded.id).select("name email walletBalance walletTransactions isAdmin");
  } catch {
    return null;
  }
};

const buildServiceOverview = async () => {
  const now = new Date();
  const [flights, hotels, trains, buses, packages, offers] = await Promise.all([
    Flight.countDocuments({}),
    Hotel.countDocuments({ isActive: true }),
    Train.countDocuments({ isActive: true }),
    Bus.countDocuments({ status: "Active" }),
    Package.countDocuments({ status: "Active" }),
    Offer.countDocuments({ isActive: true, validTill: { $gte: now } })
  ]);

  return {
    flights,
    hotels,
    trains,
    buses,
    packages,
    offers
  };
};

const prepareChatContext = async ({ message, user, intent }) => {
  const serviceOverview = await buildServiceOverview();
  const faqMatch = findFaqMatch(message);
  const bookings =
    user && intent === "bookings"
      ? await Booking.find({ userId: user._id }).sort({ createdAt: -1 }).lean()
      : [];

  return {
    serviceOverview,
    faqMatch,
    bookings,
    bookingCount: bookings.length,
    recentBookingsSummary: getBookingsSummary(bookings, 3),
    allBookingsSummary: getBookingsSummary(bookings, 25)
  };
};

const normalizeOpenAIReasoningEffort = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return OPENAI_REASONING_EFFORTS.has(normalized) ? normalized : "low";
};

const clampText = (value, maxLength = 500) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
};

const sanitizeChatHistory = (history = []) =>
  Array.isArray(history)
    ? history
        .filter((item) => item && typeof item.text === "string")
        .slice(-6)
        .map((item) => ({
          role: item.role === "assistant" ? "assistant" : "user",
          text: clampText(item.text, 400)
        }))
        .filter((item) => item.text)
    : [];

const extractOpenAIText = (responseData) => {
  if (typeof responseData?.output_text === "string" && responseData.output_text.trim()) {
    return responseData.output_text.trim();
  }

  const output = Array.isArray(responseData?.output) ? responseData.output : [];
  for (const item of output) {
    if (!item || item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (typeof content?.text === "string" && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return "";
};

const parseOpenAIReply = (rawText) => {
  if (!rawText) return null;

  const candidates = [
    rawText,
    rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || typeof parsed.reply !== "string") continue;

      return {
        reply: parsed.reply.trim(),
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions
              .map((item) => clampText(item, 120))
              .filter(Boolean)
              .slice(0, 4)
          : []
      };
    } catch {
      // Try the next candidate.
    }
  }

  return null;
};

const buildOpenAIContext = ({ message, context = {}, user, basePayload, serviceOverview, faqMatch, recentBookings, history }) => {
  const payload = {
    currentMessage: clampText(message, 1000),
    currentPath: context.pathname || "/",
    search: context.search || "",
    pageTitle: context.title || "",
    intent: basePayload.intent,
    authenticated: Boolean(user),
    userName: user?.name || "",
    walletBalance: user ? Number(user.walletBalance || 0) : null,
    serviceOverview,
    faqMatch: faqMatch?.answer || "",
    recentBookings: Array.isArray(recentBookings) ? recentBookings : [],
    fallbackReply: basePayload.reply,
    fallbackSuggestions: Array.isArray(basePayload.suggestions) ? basePayload.suggestions : [],
    conversationHistory: sanitizeChatHistory(history)
  };

  return JSON.stringify(payload, null, 2);
};

const buildOpenAIReply = async ({ message, context = {}, user, history, basePayload, sharedContext = {} }) => {
  if (!config.openaiEnabled || typeof fetch !== "function") {
    return null;
  }

  const developerPrompt = [
    OPENAI_SYSTEM_PROMPT,
    "Use the provided fallback reply if the user asks something outside the available context.",
    "If there is a matching FAQ, you may paraphrase it, but do not change the meaning.",
    "Keep the reply short and practical, and provide up to 4 short suggestions."
  ].join(" ");

  const requestBody = {
    model: config.openaiChatModel,
    input: [
      {
        role: "developer",
        content: [{ type: "input_text", text: developerPrompt }]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildOpenAIContext({
              message,
              context,
              user,
              basePayload,
              serviceOverview: sharedContext.serviceOverview || {},
              faqMatch: sharedContext.faqMatch,
              recentBookings: sharedContext.recentBookingsSummary || [],
              history
            })
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "travel_assistant_reply",
        strict: true,
        schema: OPENAI_JSON_SCHEMA
      }
    },
    reasoning: {
      effort: normalizeOpenAIReasoningEffort(config.openaiChatReasoningEffort)
    },
    max_output_tokens: 250
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    const responseData = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(responseData?.error?.message || `OpenAI request failed with status ${response.status}`);
    }

    const parsed = parseOpenAIReply(extractOpenAIText(responseData));
    return parsed;
  } catch (error) {
    console.error("OpenAI chatbot fallback triggered:", error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const findFaqMatch = (message) => {
  const normalized = normalizeText(message);
  let bestMatch = null;
  let bestScore = 0;

  FAQ_LIBRARY.forEach((item) => {
    const score = scoreFaq(normalized, item);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  });

  return bestScore > 0 ? bestMatch : null;
};

const isPasswordResetIntent = (text) =>
  hasAnyKeyword(text, [
    "forgot password",
    "forgot my password",
    "forgot pass",
    "forgot my pass",
    "reset password",
    "reset my password",
    "reset pass",
    "password reset",
    "password bhool",
    "password bhul",
    "pass bhool",
    "pass bhul",
    "pass bhool gaya",
    "pass bhul gaya",
    "reset karna",
    "forgot otp",
    "password otp"
  ]) ||
  (/(forgot|reset|change|recover)/.test(text) && /\b(pass|password)\b/.test(text));

const detectIntent = (message, pathname = "") => {
  const text = normalizeText(message);
  const path = String(pathname || "").toLowerCase();
  const isBookingLookup =
    hasAnyKeyword(text, [
      "booking history",
      "my bookings",
      "my booking",
      "recent booking",
      "recent bookings",
      "current booking",
      "current bookings",
      "corrent booking",
      "corrent bookings",
      "meri booking",
      "meri bookings",
      "mere booking",
      "mere bookings",
      "meri current booking",
      "mere current booking",
      "meri current bookings",
      "mere current bookings",
      "meri sari booking",
      "meri sari bookings",
      "meri all booking",
      "meri all bookings",
      "booking kya kya hai",
      "booking kya hai",
      "active booking",
      "active bookings",
      "upcoming booking",
      "upcoming bookings",
      "booking status"
    ]) ||
    (/\bbookings?\b/.test(text) && /\b(my|current|corrent|recent|active|upcoming|status|all)\b/.test(text)) ||
    (/booking/.test(text) && /(mere|meri|current|corrent|sari|all|status|upcoming|recent)/.test(text));
  const isPaymentHelp =
    hasAnyKeyword(text, [
      "payment",
      "upi",
      "card",
      "net banking",
      "netbanking",
      "payment karna",
      "payment kaise",
      "pay kaise",
      "kaise pay",
      "bhugtan",
      "wallet se payment",
      "pay now"
    ]);
  const isPasswordResetHelp = isPasswordResetIntent(text);
  const isAccountHelp =
    hasAnyKeyword(text, [
      "login",
      "signup",
      "sign up",
      "otp",
      "account"
    ]);

  if (!text) return "empty";
  if (hasAnyKeyword(text, ["hi", "hello", "hey", "namaste", "hii"])) return "greeting";
  if (hasAnyKeyword(text, ["thank", "thanks", "shukriya"])) return "thanks";
  if (hasAnyKeyword(text, ["cancel", "refund", "cancellation"])) return "cancellation";
  if (hasAnyKeyword(text, ["wallet", "balance"])) return "wallet";
  if (isPaymentHelp) return "payment";
  if (isBookingLookup) return "bookings";
  if (isPasswordResetHelp) return "password_reset";
  if (isAccountHelp) return "account";
  if (hasAnyKeyword(text, ["offer", "deal", "discount", "promo"])) return "offers";
  if (hasAnyKeyword(text, ["flight", "hotel", "train", "bus", "cab", "package"])) return "service";
  if (path.includes("/flights") || path.includes("/hotels") || path.includes("/trains") || path.includes("/bus") || path.includes("/cabs") || path.includes("/packages")) {
    return "service";
  }

  return "faq";
};

const buildReplyPayload = async ({ message, context = {}, user, intent = detectIntent(message, context.pathname), sharedContext = null }) => {
  const normalizedMessage = normalizeText(message);
  const pathHint = getPathHint(context.pathname);

  const contextData = sharedContext || (await prepareChatContext({ message, user, intent }));
  const serviceOverview = contextData.serviceOverview;
  const faqMatch = contextData.faqMatch;

  const base = {
    success: true,
    intent,
    reply: "",
    suggestions: [],
    actions: [],
    meta: {
      authenticated: Boolean(user),
      currentPath: context.pathname || "/"
    }
  };

  if (intent === "empty") {
    return {
      ...base,
      reply: "Please type a travel, booking, payment, or support question. I can help with flights, hotels, trains, buses, cabs, packages, wallet, and account support.",
      suggestions: ["Search flights", "Find hotels", "Cancellation help", "Wallet balance"],
      actions: SERVICE_ACTIONS.slice(0, 4)
    };
  }

  if (intent === "greeting") {
    return {
      ...base,
      reply: `${user?.name ? `Hi ${user.name.split(" ")[0]}` : "Hi"}! I'm your travel assistant. I can help you search services, explain booking steps, and answer refund or payment questions.`,
      suggestions: ["Search flights", "Book hotels", "Refund policy", "My bookings"],
      actions: SERVICE_ACTIONS
    };
  }

  if (intent === "thanks") {
    return {
      ...base,
      reply: "You're welcome. If you want, I can also help you find flights, hotels, trains, buses, cabs, or holiday packages.",
      suggestions: ["Flights", "Hotels", "Packages"],
      actions: SERVICE_ACTIONS.slice(0, 5)
    };
  }

  if (intent === "wallet") {
    if (!user) {
      return {
        ...base,
        reply: "Wallet info is available after login. If you sign in, I can show your wallet balance and help with payment flows.",
        suggestions: ["Login", "Forgot password", "Payment methods"],
        actions: [
          { label: "Login", path: "/login" },
          { label: "Forgot Password", path: "/forgot-password" },
          { label: "Open Wallet", path: "/wallet" }
        ]
      };
    }

    const walletBalance = Number(user.walletBalance || 0).toLocaleString("en-IN");
    return {
      ...base,
      reply: `Your wallet balance is Rs. ${walletBalance}. You can use wallet during checkout, and if it doesn't cover the full amount the remaining payment can be completed with UPI, card, or net banking.`,
      suggestions: ["Pay with wallet", "Payment methods", "My bookings"],
      actions: [
        { label: "Open Wallet", path: "/wallet" },
        { label: "My Profile", path: "/profile" },
        ...SERVICE_ACTIONS.slice(0, 3)
      ]
    };
  }

  if (intent === "bookings") {
    if (!user) {
      return {
        ...base,
        reply: "I can show your current and past bookings after login. Once you sign in, I can fetch your booking list and help you review or cancel them.",
        suggestions: ["Login", "My bookings", "Cancellation help", "Support"],
        actions: [
          { label: "Login", path: "/login" },
          { label: "My Profile", path: "/profile" },
          { label: "Support FAQ", path: "/faq" },
          { label: "Contact Us", path: "/contact" }
        ]
      };
    }

    const summary = contextData.allBookingsSummary || [];
    const bookingCount = Number(contextData.bookingCount || 0);

    return {
      ...base,
      reply: summary.length
        ? `Here ${bookingCount === 1 ? "is your booking" : `are your ${bookingCount} bookings`}:\n- ${summary.join("\n- ")}`
        : "I couldn't find any bookings yet. Once you book flights, hotels, trains, buses, cabs, or packages, they'll appear here.",
      suggestions: ["Current bookings", "Cancel booking", "Refund policy", "Open profile"],
      actions: [
        { label: "My Profile", path: "/profile" },
        { label: "Wallet", path: "/wallet" },
        { label: "Book Again", path: "/flights" }
      ]
    };
  }

  if (intent === "payment") {
    return {
      ...base,
      reply:
        "You can pay using UPI, card, net banking, or wallet. Wallet can cover part of the total and the rest can be paid externally. Review the payment summary before confirming, and open Wallet if you want to use wallet balance.",
      suggestions: ["UPI payment", "Wallet help", "Card payment", "Reset password"],
      actions: [
        { label: "Wallet", path: "/wallet" },
        { label: "FAQ", path: "/faq" },
        { label: "Contact", path: "/contact" }
      ]
    };
  }

  if (intent === "password_reset") {
    return {
      ...base,
      reply:
        "To reset your password, open Forgot Password, enter your registered email, verify the OTP, and then set a new password. Start from Forgot Password so the recovery session is created correctly.",
      suggestions: ["Forgot password", "Send OTP", "Verify OTP", "Login"],
      actions: [
        { label: "Forgot Password", path: "/forgot-password" },
        { label: "Login", path: "/login" },
        { label: "Support FAQ", path: "/faq" }
      ]
    };
  }

  if (intent === "account") {
    if (!user) {
      return {
        ...base,
        reply:
          "You can sign in with email/password or Google. If you forgot your password, open Forgot Password and complete the OTP flow to reset it.",
        suggestions: ["Forgot password", "Reset password", "Login", "Sign up"],
        actions: [
          { label: "Login", path: "/login" },
          { label: "Sign Up", path: "/signup" },
          { label: "Forgot Password", path: "/forgot-password" }
        ]
      };
    }

    return {
      ...base,
      reply:
        "You're already signed in. From your profile you can manage bookings, wallet, and account details. If you want, I can also help you find your latest trip or explain cancellation steps.",
      suggestions: ["My bookings", "Wallet balance", "Cancel booking"],
      actions: [
        { label: "My Profile", path: "/profile" },
        { label: "Wallet", path: "/wallet" },
        { label: "My Bookings", path: "/profile" }
      ]
    };
  }

  if (intent === "cancellation") {
    return {
      ...base,
      reply:
        "Cancellation rules are time-based: more than 48 hours gets 90% refund, 24-48 hours gets 75%, 12-24 hours gets 50%, 6-12 hours gets 25%, 2-6 hours gets 12%, and less than 2 hours gets no refund. Partial cancellation is supported for flights, trains, buses, and hotel rooms.",
      suggestions: ["Refund policy", "My bookings", "Contact support"],
      actions: [
        { label: "My Bookings", path: "/profile" },
        { label: "Support FAQ", path: "/faq" },
        { label: "Contact Us", path: "/contact" }
      ]
    };
  }

  if (intent === "offers") {
    return {
      ...base,
      reply: `I found ${serviceOverview.offers} active offers right now. You can check the Offers page for current promotions and category-specific deals.`,
      suggestions: ["Flights offers", "Hotels offers", "Packages deals"],
      actions: [
        { label: "Offers", path: "/offers" },
        { label: "Flights", path: "/flights" },
        { label: "Hotels", path: "/hotels" }
      ]
    };
  }

  if (intent === "service") {
    const serviceWords = [];
    if (normalizedMessage.includes("flight")) serviceWords.push("flights");
    if (normalizedMessage.includes("hotel")) serviceWords.push("hotels");
    if (normalizedMessage.includes("train")) serviceWords.push("trains");
    if (normalizedMessage.includes("bus")) serviceWords.push("buses");
    if (normalizedMessage.includes("cab")) serviceWords.push("cabs");
    if (normalizedMessage.includes("package")) serviceWords.push("packages");

    return {
      ...base,
      reply:
        pathHint ||
        `I can help with ${serviceWords.length ? serviceWords.join(", ") : "travel services"}. Use the top navigation to search and compare results, then continue to booking.`,
      suggestions: ["Search now", "Compare fares", "Booking help"],
      actions: SERVICE_ACTIONS
    };
  }

  if (faqMatch) {
    return {
      ...base,
      reply: faqMatch.answer,
      suggestions: ["My bookings", "Payment methods", "Support"],
      actions: [
        { label: "FAQ", path: "/faq" },
        { label: "Contact Us", path: "/contact" },
        { label: "My Profile", path: "/profile" }
      ]
    };
  }

  return {
    ...base,
    reply:
      pathHint ||
      "I can help with flights, hotels, trains, buses, cabs, packages, bookings, wallet, refunds, and account questions. Try asking in simple language like 'cancel my booking' or 'find cheap flights to Delhi'.",
    suggestions: ["Search flights", "Book hotels", "Cancellation help", "Wallet balance"],
    actions: SERVICE_ACTIONS
  };
};

exports.sendChatMessage = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const context = req.body?.context || {};
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }

    const user = await resolveOptionalUser(req);
    const intent = detectIntent(message, context.pathname);
    const sharedContext = await prepareChatContext({ message, user, intent });
    const basePayload = await buildReplyPayload({ message, context, user, intent, sharedContext });
    const aiPayload = await buildOpenAIReply({ message, context, user, history, basePayload: { ...basePayload, sharedContext }, sharedContext });
    const payload = aiPayload
      ? {
          ...basePayload,
          reply: aiPayload.reply || basePayload.reply,
          suggestions:
            Array.isArray(aiPayload.suggestions) && aiPayload.suggestions.length > 0
              ? aiPayload.suggestions
              : basePayload.suggestions
        }
      : basePayload;

    res.status(200).json(payload);
  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({
      success: false,
      message: "Chatbot service is temporarily unavailable"
    });
  }
};

exports.getChatHealth = async (req, res) => {
  res.json({
    success: true,
    service: "chat",
    status: "ok",
    openaiEnabled: config.openaiEnabled,
    openaiModel: config.openaiChatModel,
    fallbackOnly: !config.openaiEnabled
  });
};
