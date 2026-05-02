const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const config = require("../config/env");

const RESET_OTP_EXPIRY_MINUTES = 10;
const RESET_OTP_MAX_VERIFY_ATTEMPTS = 5;
const RESET_OTP_SEND_COOLDOWN_SECONDS = 45;
const RESET_OTP_MAX_SENDS_PER_HOUR = 5;
const RESET_OTP_BLOCK_MINUTES = 15;
// Exponential backoff: each full cycle of 5 failed attempts doubles the block duration.
// Cycle 1 → 15 min, Cycle 2 → 30 min, Cycle 3 → 60 min, etc. (capped at 24 h).
const RESET_OTP_MAX_BLOCK_MINUTES = 24 * 60;

const sanitizeUserForResponse = (userDoc) => {
  if (!userDoc) return null;
  const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  return user;
};

const getRemainingSeconds = (value) => {
  if (!value) return 0;
  const until = new Date(value).getTime();
  if (!Number.isFinite(until)) return 0;
  const diff = Math.ceil((until - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
};

const getOtpRateLimitMessage = (seconds) => {
  if (seconds <= 0) return "Please wait before requesting another OTP.";
  return `Too many attempts. Please try again in ${seconds} seconds.`;
};

const isBcryptHash = (value) => typeof value === "string" && value.startsWith("$2");

const matchesStoredOtp = async (storedOtp, incomingOtp) => {
  if (!storedOtp || !incomingOtp) return false;
  if (isBcryptHash(storedOtp)) {
    return bcrypt.compare(String(incomingOtp), storedOtp);
  }
  return String(storedOtp) === String(incomingOtp);
};

const buildPasswordResetEmail = ({ otp, email }) => {
  const verifyUrl = `${config.frontendUrl}/verify-otp?email=${encodeURIComponent(email)}`;
  const websiteLabel = config.frontendUrl.replace(/^https?:\/\//, "");

  return {
    subject: "MakeMyTrip Password Reset OTP",
    text: [
      "Dear User,",
      "",
      "We received a request to reset your password for your MakeMyTrip account.",
      "",
      "━━━━━━━━━━━━━━━━━━━",
      "🔐 Your One-Time Password (OTP)",
      `${otp}`,
      "━━━━━━━━━━━━━━━━━━━",
      "",
      `⏳ This OTP is valid for ${RESET_OTP_EXPIRY_MINUTES} minutes only.`,
      "",
      "Please enter this code on the password reset page to continue.",
      "",
      "---",
      "",
      "⚠️ Security Tips:",
      "",
      "* Do not share this OTP with anyone",
      "* Our team will never ask for your OTP",
      "* If you didn't request this, please ignore this email",
      "",
      "---",
      "",
      "💡 Need Help?",
      "",
      "If you're facing any issues, feel free to contact our support team anytime.",
      "",
      "---",
      "",
      "Warm regards,",
      "MakeMyTrip Team",
      `🌐 ${websiteLabel}`,
      "",
      "---",
      "",
      "*This is an automated email. Please do not reply.*",
      "",
      `Password reset page: ${verifyUrl}`
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#14213d;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f5f7fb;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 60px rgba(20,33,61,0.12);">
                <tr>
                  <td style="padding:28px 32px;background:linear-gradient(135deg,#0b3d91 0%,#1d6fdc 100%);color:#ffffff;">
                    <div style="font-size:30px;font-weight:800;letter-spacing:-0.5px;">MakeMyTrip</div>
                    <div style="margin-top:10px;font-size:14px;opacity:0.9;">Password reset request</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 8px;font-size:15px;color:#334155;line-height:1.7;">Dear User,</p>
                    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;color:#0f172a;">Reset your password</h1>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#334155;">
                      We received a request to reset your password for your
                      <strong style="color:#0f172a;"> MakeMyTrip </strong> account.
                    </p>
                    <div style="margin:24px 0;padding:24px;border-radius:18px;background:#f8fbff;border:1px solid #dbeafe;text-align:center;">
                      <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">🔐 Your One-Time Password (OTP)</div>
                      <div style="font-size:36px;font-weight:800;letter-spacing:0.4em;color:#0b5bd3;">${otp}</div>
                    </div>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#334155;">
                      ⏳ This OTP is valid for <strong style="color:#0f172a;">${RESET_OTP_EXPIRY_MINUTES} minutes only</strong>.
                    </p>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#334155;">
                      Please enter this code on the password reset page to continue.
                    </p>
                    <div style="margin:28px 0 22px;">
                      <a href="${verifyUrl}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:#0b5bd3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
                        Open password reset page
                      </a>
                    </div>
                    <div style="padding:18px 20px;border-radius:16px;background:#fff7ed;border:1px solid #fed7aa;">
                      <div style="font-size:14px;font-weight:700;color:#9a3412;margin-bottom:8px;">⚠️ Security Tips</div>
                      <ul style="margin:0;padding-left:18px;color:#7c2d12;font-size:14px;line-height:1.7;">
                        <li>Do not share this OTP with anyone.</li>
                        <li>Our team will never ask for your OTP.</li>
                        <li>If you didn't request this, please ignore this email.</li>
                      </ul>
                    </div>
                    <p style="margin:24px 0 0;font-size:16px;line-height:1.8;color:#334155;">
                      <strong style="color:#0f172a;">💡 Need Help?</strong><br />
                      If you're facing any issues, feel free to contact our support team anytime.
                    </p>
                    <p style="margin:18px 0 0;font-size:14px;line-height:1.8;color:#475569;">
                      Warm regards,<br />
                      <strong style="color:#0f172a;">MakeMyTrip Team</strong><br />
                      🌐 <a href="${config.frontendUrl}" style="color:#0b5bd3;">${websiteLabel}</a>
                    </p>
                    <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
                      This is an automated email. Please do not reply.
                    </p>
                    <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
                      If the button does not work, copy and paste this link into your browser:<br />
                      <a href="${verifyUrl}" style="color:#0b5bd3;word-break:break-all;">${verifyUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
  };
};

const syncWalletBalance = async (user) => {
  const transactions = Array.isArray(user.walletTransactions) ? user.walletTransactions : [];
  const credited = transactions
    .filter((item) => item.type === "credit")
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const debited = transactions
    .filter((item) => item.type === "debit")
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const computedBalance = Math.max(credited - debited, 0);

  if ((user.walletBalance || 0) !== computedBalance) {
    user.walletBalance = computedBalance;
    await user.save();
  }

  return user;
};

exports.signup = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedMobile = String(mobile || "").trim();

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long"
      });
    }

    const duplicateChecks = [{ email: normalizedEmail }];
    if (normalizedMobile) {
      duplicateChecks.push({ mobile: normalizedMobile });
    }

    const existingUser = await User.findOne({ $or: duplicateChecks });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      mobile: normalizedMobile || undefined,
      password: hashedPassword,
      loginType: "email",
      isAdmin: false
    });

    const token = jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    const syncedUser = await syncWalletBalance(user);

    res.status(201).json({
      success: true,
      token,
      user: sanitizeUserForResponse(syncedUser)
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Signup failed"
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google login. Please continue with Google."
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    await syncWalletBalance(user);

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    res.json({ token, user: sanitizeUserForResponse(user) });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Login failed"
    });
  }
};

// Forgot Password - Send OTP
exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found with this email" });
    }

    const now = Date.now();
    const blockedSeconds = getRemainingSeconds(user.resetPasswordOtpBlockedUntil);
    if (blockedSeconds > 0) {
      return res.status(429).json({
        message: getOtpRateLimitMessage(blockedSeconds),
        retryAfterSeconds: blockedSeconds
      });
    }

    const cooldownSeconds = getRemainingSeconds(
      user.resetPasswordOtpLastSentAt
        ? new Date(new Date(user.resetPasswordOtpLastSentAt).getTime() + RESET_OTP_SEND_COOLDOWN_SECONDS * 1000)
        : null
    );
    if (cooldownSeconds > 0) {
      return res.status(429).json({
        message: `Please wait ${cooldownSeconds} seconds before requesting a new OTP.`,
        retryAfterSeconds: cooldownSeconds
      });
    }

    const oneHourMs = 60 * 60 * 1000;
    const windowStart = user.resetPasswordOtpWindowStartedAt
      ? new Date(user.resetPasswordOtpWindowStartedAt).getTime()
      : 0;

    if (!windowStart || now - windowStart >= oneHourMs) {
      user.resetPasswordOtpWindowStartedAt = new Date(now);
      user.resetPasswordOtpSendCount = 0;
    }

    if ((user.resetPasswordOtpSendCount || 0) >= RESET_OTP_MAX_SENDS_PER_HOUR) {
      user.resetPasswordOtpBlockedUntil = new Date(now + RESET_OTP_BLOCK_MINUTES * 60 * 1000);
      await user.save();
      const retryAfterSeconds = getRemainingSeconds(user.resetPasswordOtpBlockedUntil);
      return res.status(429).json({
        message: getOtpRateLimitMessage(retryAfterSeconds),
        retryAfterSeconds
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = await bcrypt.hash(otp, 8);
    user.resetPasswordExpires = now + RESET_OTP_EXPIRY_MINUTES * 60 * 1000;
    user.resetPasswordOtpAttempts = 0;
    user.resetPasswordOtpBlockedUntil = undefined;
    user.resetPasswordOtpLastSentAt = new Date(now);
    user.resetPasswordOtpSendCount = (user.resetPasswordOtpSendCount || 0) + 1;
    await user.save();

    const resetEmail = buildPasswordResetEmail({ otp, email });
    const mailOptions = {
      from: config.emailUser,
      to: email,
      subject: resetEmail.subject,
      text: resetEmail.text,
      html: resetEmail.html
    };

    if (!config.emailUser || !config.emailPass) {
      if (config.authDebugOtp) {
        console.log("---- TEST OTP: ", otp, " for ", email, " ----");
      }
      return res.json({
        success: true,
        message: config.authDebugOtp
          ? `OTP sent to your email (valid for ${RESET_OTP_EXPIRY_MINUTES} minutes and logged to console for testing)`
          : `OTP generated for testing mode. Configure email credentials to deliver it automatically.`
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.emailUser,
        pass: config.emailPass
      }
    });

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: `OTP sent to your email. It is valid for ${RESET_OTP_EXPIRY_MINUTES} minutes.` });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Error sending OTP" });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const { otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const blockedSeconds = getRemainingSeconds(user.resetPasswordOtpBlockedUntil);
    if (blockedSeconds > 0) {
      return res.status(429).json({
        message: getOtpRateLimitMessage(blockedSeconds),
        retryAfterSeconds: blockedSeconds
      });
    }

    const isOtpValid = Boolean(
      user.resetPasswordOTP &&
      user.resetPasswordExpires &&
      new Date(user.resetPasswordExpires).getTime() > Date.now() &&
      (await matchesStoredOtp(user.resetPasswordOTP, otp))
    );

    if (!isOtpValid) {
      user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;

      if (user.resetPasswordOtpAttempts >= RESET_OTP_MAX_VERIFY_ATTEMPTS) {
        // Exponential backoff: block duration doubles with each completed cycle of failed attempts.
        // cycle = Math.floor(totalAttempts / maxAttemptsPerCycle), capped at 24 hours.
        const cycle = Math.floor(user.resetPasswordOtpAttempts / RESET_OTP_MAX_VERIFY_ATTEMPTS);
        const blockMinutes = Math.min(RESET_OTP_BLOCK_MINUTES * Math.pow(2, cycle - 1), RESET_OTP_MAX_BLOCK_MINUTES);
        user.resetPasswordOtpBlockedUntil = new Date(Date.now() + blockMinutes * 60 * 1000);
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
      }

      await user.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.resetPasswordOtpAttempts = 0;
    user.resetPasswordOtpBlockedUntil = undefined;
    await user.save();

    res.json({ success: true, message: "OTP verified. Proceed to reset password." });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const { otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP and new password are required" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const blockedSeconds = getRemainingSeconds(user.resetPasswordOtpBlockedUntil);
    if (blockedSeconds > 0) {
      return res.status(429).json({
        message: getOtpRateLimitMessage(blockedSeconds),
        retryAfterSeconds: blockedSeconds
      });
    }

    const isOtpValid = Boolean(
      user.resetPasswordOTP &&
      user.resetPasswordExpires &&
      new Date(user.resetPasswordExpires).getTime() > Date.now() &&
      (await matchesStoredOtp(user.resetPasswordOTP, otp))
    );

    if (!isOtpValid) {
      user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;

      if (user.resetPasswordOtpAttempts >= RESET_OTP_MAX_VERIFY_ATTEMPTS) {
        const cycle = Math.floor(user.resetPasswordOtpAttempts / RESET_OTP_MAX_VERIFY_ATTEMPTS);
        const blockMinutes = Math.min(RESET_OTP_BLOCK_MINUTES * Math.pow(2, cycle - 1), RESET_OTP_MAX_BLOCK_MINUTES);
        user.resetPasswordOtpBlockedUntil = new Date(Date.now() + blockMinutes * 60 * 1000);
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
      }

      await user.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordOtpAttempts = 0;
    user.resetPasswordOtpBlockedUntil = undefined;
    user.resetPasswordOtpLastSentAt = undefined;
    user.resetPasswordOtpWindowStartedAt = undefined;
    user.resetPasswordOtpSendCount = 0;
    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
};

// Delete User Account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting account"
    });
  }
};
