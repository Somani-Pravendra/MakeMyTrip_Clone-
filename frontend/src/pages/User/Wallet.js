import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getWalletSummary } from "../../services/walletService";
import { formatCurrency } from "../../utils/currency";
import "./Wallet.css";

const Wallet = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalCredited: 0,
    totalDebited: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchWallet = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await getWalletSummary();
        if (!mounted) return;

        setSummary(result.summary || {
          totalTransactions: 0,
          totalCredited: 0,
          totalDebited: 0
        });
        setTransactions(result.transactions || []);
        setWalletBalance(typeof result.walletBalance === "number" ? result.walletBalance : 0);

        if (typeof result.walletBalance === "number" && result.walletBalance !== user?.walletBalance) {
          updateUser({
            ...user,
            walletBalance: result.walletBalance
          });
        }
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to load wallet details.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchWallet();

    return () => {
      mounted = false;
    };
  }, [updateUser, user]);

  const filteredTransactions = useMemo(() => {
    if (filter === "all") {
      return transactions;
    }

    return transactions.filter((item) => item.type === filter);
  }, [filter, transactions]);

  const formatTransactionTitle = (transaction) => {
    if (transaction.description) {
      return transaction.description;
    }

    if (transaction.source === "booking_refund") {
      return `Refund for ${transaction.metadata?.category || "booking"} booking`;
    }

    if (transaction.source === "booking_payment") {
      return `Wallet payment for ${transaction.metadata?.category || "booking"} booking`;
    }

    return "Wallet transaction";
  };

  const formatTransactionMeta = (transaction) => {
    const pieces = [];

    if (transaction.bookingId) {
      pieces.push(`Booking ${String(transaction.bookingId).slice(-8).toUpperCase()}`);
    }

    if (transaction.metadata?.paymentMethod) {
      pieces.push(`via ${transaction.metadata.paymentMethod}`);
    }

    if (transaction.metadata?.refundPercentage >= 0) {
      pieces.push(`${transaction.metadata.refundPercentage}% refund`);
    }

    return pieces.join(" | ");
  };

  return (
    <div className="wallet-page">
      <div className="wallet-shell">
        <div className="wallet-hero">
          <div>
            <p className="wallet-eyebrow">MakeMyTrip Wallet</p>
            <h1>Your travel wallet</h1>
            <p className="wallet-subtext">
              Refunds from cancellations are credited here automatically, and you can use this balance for full or partial payment on your next booking.
            </p>
          </div>
          <div className="wallet-balance-card">
            <span>Available Balance</span>
            <strong>{formatCurrency(walletBalance || 0)}</strong>
            <Link to="/flights" className="wallet-cta-link">Use Wallet Now</Link>
          </div>
        </div>

        <div className="wallet-stats-grid">
          <div className="wallet-stat-card">
            <span>Total Credited</span>
            <strong>{formatCurrency(summary.totalCredited || 0)}</strong>
          </div>
          <div className="wallet-stat-card">
            <span>Total Used</span>
            <strong>{formatCurrency(summary.totalDebited || 0)}</strong>
          </div>
          <div className="wallet-stat-card">
            <span>Transactions</span>
            <strong>{summary.totalTransactions || 0}</strong>
          </div>
        </div>

        <div className="wallet-ledger-card">
          <div className="wallet-ledger-head">
            <div>
              <h2>Transaction History</h2>
              <p>Every refund credit and wallet payment is recorded here.</p>
            </div>
            <div className="wallet-filter-group">
              {[
                { id: "all", label: "All" },
                { id: "credit", label: "Credits" },
                { id: "debit", label: "Debits" }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`wallet-filter-btn ${filter === item.id ? "active" : ""}`}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {loading && <div className="wallet-state">Loading wallet details...</div>}
          {!loading && error && <div className="wallet-state wallet-state-error">{error}</div>}
          {!loading && !error && filteredTransactions.length === 0 && (
            <div className="wallet-state">
              No wallet transactions yet. Once you cancel a booking or pay using wallet, it will appear here.
            </div>
          )}

          {!loading && !error && filteredTransactions.length > 0 && (
            <div className="wallet-transaction-list">
              {filteredTransactions.map((transaction) => (
                <div key={transaction._id} className="wallet-transaction-item">
                  <div className="wallet-transaction-copy">
                    <div className="wallet-transaction-title-row">
                      <h3>{formatTransactionTitle(transaction)}</h3>
                      <span className={`wallet-amount-chip ${transaction.type}`}>
                        {transaction.type === "credit" ? "+" : "-"}{formatCurrency(transaction.amount || 0)}
                      </span>
                    </div>
                    <p>{formatTransactionMeta(transaction) || "Wallet activity"}</p>
                  </div>
                  <div className="wallet-transaction-meta">
                    <span>{new Date(transaction.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}</span>
                    <strong>Balance: {formatCurrency(transaction.balanceAfter || 0)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
