import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2, Loader2, MessageCircle, ShoppingBag, ExternalLink } from 'lucide-react';
import './ChatWidget.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/ProFitSuppsDB';
const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:8000';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: `Xin chào! 👋 Mình là trợ lý ảo của ProFit. Mình có thể giúp bạn:

• Tư vấn về sản phẩm protein, creatine, pre-workout
• Thông tin về chính sách đổi trả, vận chuyển
• Giờ mở cửa showroom
• Chương trình tích điểm thành viên
• Cách sử sản phẩm

Bạn cần hỏi gì nào? 😊`,
  products: []
};

const ChatWidget = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const threadIdRef = useRef(`web_${Date.now()}`);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Streaming SSE chat with token-by-token text + final products payload
  const callChatStream = async (userMessage, assistantMessageId) => {
    const response = await fetch(`${CHAT_API_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        thread_id: threadIdRef.current,
        user_id: 'web_user',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || 'API request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';
    let currentEvent = 'message';

    // Reset assistant content at start
    setMessages(prev => prev.map(msg =>
      msg.id === assistantMessageId ? { ...msg, content: '', products: [] } : msg
    ));

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const raw of lines) {
        const line = raw.replace(/\r$/, '');
        if (!line) {
          // Empty line = end of SSE record; reset event name
          currentEvent = 'message';
          continue;
        }
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (currentEvent === 'token') {
            fullResponse += data;
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullResponse }
                : msg
            ));
          } else if (currentEvent === 'metadata') {
            // optional: route_id, session_id — stored in state if needed
            try { console.debug('[chat] metadata', JSON.parse(data)); } catch (_) { /* noop */ }
          } else if (currentEvent === 'products') {
            try {
              const products = JSON.parse(data) || [];
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId ? { ...msg, products } : msg
              ));
            } catch (e) {
              console.error('Failed to parse products', e);
            }
          } else if (currentEvent === 'error') {
            throw new Error(data);
          }
          // 'done' ignored (full text already in state)
        }
      }
    }

    return fullResponse;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    const userMsg = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    const assistantMsgId = generateId();
    const assistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      products: [],
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    try {
      await callChatStream(userMessage, assistantMsgId);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: 'Xin lỗi, mình đang gặp trục trặc kỹ thuật. Bạn có thể thử lại sau hoặc liên hệ hotline 1900 6868 để được hỗ trợ trực tiếp nhé!' }
          : msg
      ));
      setError('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
    setIsMinimized(false);
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setIsMinimized(prev => !prev);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`chat-widget-container ${className}`}>
      <button
        className={`chat-toggle-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? 'Đóng chat' : 'Mở chat'}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!isOpen && (
          <span className="chat-toggle-badge">1</span>
        )}
      </button>

      <div className={`chat-window ${isOpen ? 'open' : ''} ${isMinimized ? 'minimized' : ''}`}>
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">
              <Bot size={20} />
            </div>
            <div className="chat-header-text">
              <h3>ProFit Assistant</h3>
              <span className="chat-status">
                <span className="status-dot"></span>
                Đang trực tuyến
              </span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button
              className="chat-action-btn"
              onClick={toggleMinimize}
              aria-label={isMinimized ? 'Phóng to' : 'Thu nhỏ'}
            >
              {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>
            <button
              className="chat-action-btn"
              onClick={toggleChat}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.role}`}
                >
                  {message.role === 'assistant' && (
                    <div className="message-avatar">
                      <Bot size={16} />
                    </div>
                  )}
                  <div className="message-content">
                    {message.content && (
                      <div className="message-bubble">
                        {message.content.split('\n').map((line, i) => (
                          <p key={i}>{line || <br />}</p>
                        ))}
                      </div>
                    )}

                    {message.products && message.products.length > 0 && (
                      <div className="message-products">
                        <div className="message-products-header">
                          <ShoppingBag size={14} />
                          <span>Sản phẩm gợi ý ({message.products.length})</span>
                        </div>
                        <div className="product-cards">
                          {message.products.map((product, idx) => (
                            <div key={product.name || product.product_url || idx} className="product-card">
                              {product.image_url && (
                                <div className="product-card-image">
                                  <img
                                    src={product.image_url}
                                    alt={product.name || 'Product'}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                </div>
                              )}
                              <div className="product-card-body">
                                {product.brand && (
                                  <span className="product-card-brand">{product.brand}</span>
                                )}
                                <h4 className="product-card-name">
                                  {product.name || 'Sản phẩm'}
                                </h4>
                                {product.price_display && (
                                  <div className="product-card-price">
                                    {product.price_display}
                                  </div>
                                )}
                                {product.product_url && (
                                  <a
                                    className="product-card-link"
                                    href={product.product_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Xem chi tiết <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.timestamp && (
                      <span className="message-time">
                        {formatTime(message.timestamp)}
                      </span>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="message-avatar user">
                      <User size={16} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="message assistant">
                  <div className="message-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="message-content">
                    <div className="message-bubble typing">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="message error">
                  <div className="message-bubble error">
                    {error}
                    <button
                      className="retry-btn"
                      onClick={() => {
                        setError(null);
                        const lastUserMsg = messages.filter(m => m.role === 'user').pop();
                        if (lastUserMsg) {
                          setMessages(prev => prev.slice(0, -1));
                          setInputValue(lastUserMsg.content);
                        }
                      }}
                    >
                      Thử lại
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSubmit}>
              <div className="chat-input-wrapper">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập câu hỏi của bạn..."
                  rows={1}
                  disabled={isLoading}
                  maxLength={500}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!inputValue.trim() || isLoading}
                  aria-label="Gửi"
                >
                  {isLoading ? (
                    <Loader2 size={20} className="spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
              <p className="chat-disclaimer">
                ProFit Assistant có thể đưa ra thông tin không chính xác. Hãy kiểm chứng trước khi sử dụng.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatWidget;
