const session = require("express-session");
const mongoose = require("mongoose");

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

const appSessionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true
    },
    session: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    collection: "app_sessions",
    versionKey: false
  }
);

appSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AppSession = mongoose.models.AppSession || mongoose.model("AppSession", appSessionSchema);

const resolveExpiry = (sessionData = {}, ttlMs = DEFAULT_TTL_MS) => {
  const rawExpiry = sessionData?.cookie?.expires;
  const parsedExpiry = rawExpiry ? new Date(rawExpiry) : null;
  if (parsedExpiry && !Number.isNaN(parsedExpiry.getTime())) {
    return parsedExpiry;
  }

  return new Date(Date.now() + ttlMs);
};

class MongoSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.ttlMs = Number(options.ttlMs) > 0 ? Number(options.ttlMs) : DEFAULT_TTL_MS;
    this.SessionModel = options.model || AppSession;
  }

  get(sid, callback) {
    this.SessionModel.findById(sid)
      .lean()
      .then((record) => {
        if (!record) {
          callback(null, null);
          return;
        }

        if (record.expiresAt && record.expiresAt <= new Date()) {
          this.destroy(sid, () => callback(null, null));
          return;
        }

        callback(null, JSON.parse(record.session));
      })
      .catch((error) => callback(error));
  }

  set(sid, sessionData, callback = () => {}) {
    this.SessionModel.findByIdAndUpdate(
      sid,
      {
        _id: sid,
        session: JSON.stringify(sessionData),
        expiresAt: resolveExpiry(sessionData, this.ttlMs)
      },
      {
        upsert: true,
        setDefaultsOnInsert: true
      }
    )
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  destroy(sid, callback = () => {}) {
    this.SessionModel.deleteOne({ _id: sid })
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  touch(sid, sessionData, callback = () => {}) {
    this.SessionModel.updateOne(
      { _id: sid },
      {
        $set: {
          expiresAt: resolveExpiry(sessionData, this.ttlMs),
          session: JSON.stringify(sessionData)
        }
      }
    )
      .then(() => callback(null))
      .catch((error) => callback(error));
  }
}

module.exports = MongoSessionStore;
