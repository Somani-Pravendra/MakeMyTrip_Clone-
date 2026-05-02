const User = require("../models/User");

const normalizeWalletFromTransactions = async (user) => {
  const transactions = [...(user.walletTransactions || [])].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

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

  return {
    transactions,
    credited,
    debited,
    walletBalance: computedBalance
  };
};

exports.getWalletSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("walletBalance walletTransactions");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const { transactions, credited, debited, walletBalance } = await normalizeWalletFromTransactions(user);

    res.status(200).json({
      success: true,
      walletBalance,
      summary: {
        totalTransactions: transactions.length,
        totalCredited: credited,
        totalDebited: debited
      },
      transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet details"
    });
  }
};
