import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, ChevronRight, MessageCircle, Send, Sparkles, Trash2, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../utils/api";
import "./ChatbotWidget.css";

const makeMessage = (role, text, extras = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  ...extras
});

const PROMPT_MESSAGE_MAP = {
  "Your account": "Help me with my account",
  "My bookings": "Show my current bookings",
  "Reset password": "I want to reset my password",
  "Payment help": "Help me with payment",
  "Wallet balance": "Show my wallet balance",
  "Support and FAQ": "Show support and FAQ help",
  "Contact support": "I need contact support"
};

const DEFAULT_PROMPTS = [
  "Your account",
  "My bookings",
  "Reset password",
  "Payment help",
  "Wallet balance",
  "Contact support"
];

const FALLBACK_REPLY =
  "I'm unable to reach the chatbot service right now. You can still use Flights, Hotels, Trains, Buses, Cabs, Packages, Wallet, and FAQ pages from the top navigation.";

const INITIAL_ASSISTANT_MESSAGE = makeMessage(
  "assistant",
  "Hi, I'm your MakeMyTrip assistant. Ask me about flights, hotels, trains, buses, cabs, packages, bookings, wallet, refunds, or account help.",
  { suggestions: DEFAULT_PROMPTS, actions: [] }
);

const ChatbotWidget = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([INITIAL_ASSISTANT_MESSAGE]);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  const quickPrompts = useMemo(
    () => [
      "Your account",
      "My bookings",
      "Reset password",
      "Payment help",
      "Wallet balance",
      "Support and FAQ"
    ],
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const updateLastAssistantMessage = (payload) => {
    setMessages((prev) => {
      const next = [...prev];
      const lastIndex = next.length - 1;
      if (lastIndex >= 0 && next[lastIndex].role === "assistant" && next[lastIndex].pending) {
        next[lastIndex] = {
          ...next[lastIndex],
          pending: false,
          text: payload.reply || next[lastIndex].text,
          suggestions: Array.isArray(payload.suggestions) && payload.suggestions.length > 0 ? payload.suggestions : next[lastIndex].suggestions,
          actions: Array.isArray(payload.actions) ? payload.actions : []
        };
        return next;
      }

      next.push(
        makeMessage("assistant", payload.reply || FALLBACK_REPLY, {
          suggestions: payload.suggestions || DEFAULT_PROMPTS,
          actions: payload.actions || []
        })
      );
      return next;
    });
  };

  const sendMessage = async (messageText) => {
    const trimmed = String(messageText || "").trim();
    if (!trimmed || loading) return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const userMessage = makeMessage("user", trimmed);
    const pendingAssistant = makeMessage("assistant", "Typing...", { pending: true, suggestions: [], actions: [] });
    const conversationHistory = [...messages.slice(-5), userMessage].map((item) => ({
      role: item.role,
      text: item.text
    }));

    setMessages((prev) => [...prev, userMessage, pendingAssistant]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/chat/message`,
        {
          message: trimmed,
          context: {
            pathname: location.pathname,
            search: location.search,
            title: document.title
          },
          history: conversationHistory
        },
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          : undefined
      );

      if (requestIdRef.current !== requestId) return;
      updateLastAssistantMessage({
        reply: response.data?.reply || FALLBACK_REPLY,
        suggestions: response.data?.suggestions || DEFAULT_PROMPTS,
        actions: response.data?.actions || []
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      updateLastAssistantMessage({
        reply: error.response?.data?.message || FALLBACK_REPLY,
        suggestions: DEFAULT_PROMPTS,
        actions: [
          { label: "FAQ", path: "/faq" },
          { label: "Contact Us", path: "/contact" },
          { label: "Flights", path: "/flights" }
        ]
      });
    } finally {
      if (requestIdRef.current !== requestId) return;
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const handleQuickPrompt = (prompt) => {
    sendMessage(PROMPT_MESSAGE_MAP[prompt] || prompt);
  };

  const handleActionClick = (path) => {
    if (!path) return;
    setIsOpen(false);
    navigate(path);
  };

  const handleClearChat = () => {
    requestIdRef.current += 1;
    setLoading(false);
    setInput("");
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
  };

  return (
    <div className={`chatbot-shell ${isOpen ? "open" : ""}`}>
      {!isOpen ? (
        <button
          type="button"
          className="chatbot-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open travel assistant"
        >
          <MessageCircle size={20} />
          <span>Travel Help</span>
        </button>
      ) : (
        <div className="chatbot-panel" role="dialog" aria-label="Travel assistant chat">
          <div className="chatbot-header">
            <div className="chatbot-brand">
              <div className="chatbot-brand-icon">
                <Bot size={18} />
              </div>
              <div>
                <div className="chatbot-title-row">
                  <h3>Travel Assistant</h3>
                  <Sparkles size={14} />
                </div>
                <p>{user?.name ? `Hi ${user.name.split(" ")[0]}, I can help with your trip.` : "Ask anything about travel, booking, or support."}</p>
              </div>
            </div>

            <button type="button" className="chatbot-icon-btn" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>

          <div className="chatbot-summary-bar">
            <span>Powered by your booking backend</span>
            <button type="button" className="chatbot-reset-btn" onClick={handleClearChat} aria-label="Clear chat history">
              <Trash2 size={13} />
              Clear chat
            </button>
          </div>

          <div className="chatbot-messages" ref={listRef}>
            {messages.map((message) => (
              <div key={message.id} className={`chatbot-message ${message.role}`}>
                <div className="chatbot-bubble">
                  <p>{message.text}</p>

                  {message.role === "assistant" && Array.isArray(message.actions) && message.actions.length > 0 && (
                    <div className="chatbot-actions">
                      {message.actions.slice(0, 4).map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          className="chatbot-action-btn"
                          onClick={() => handleActionClick(action.path)}
                        >
                          <span>{action.label}</span>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                    </div>
                  )}

                  {message.role === "assistant" && Array.isArray(message.suggestions) && message.suggestions.length > 0 && (
                    <div className="chatbot-suggestions">
                      {message.suggestions.slice(0, 4).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          className="chatbot-chip"
                          onClick={() => handleQuickPrompt(prompt)}
                          disabled={loading}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chatbot-message assistant">
                <div className="chatbot-bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <div className="chatbot-quick-row">
            {quickPrompts.slice(0, 3).map((prompt) => (
              <button key={prompt} type="button" className="chatbot-mini-chip" onClick={() => handleQuickPrompt(prompt)} disabled={loading}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="chatbot-input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about flights, hotels, refunds..."
              aria-label="Chat message"
            />
            <button type="submit" className="chatbot-send-btn" disabled={loading || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
