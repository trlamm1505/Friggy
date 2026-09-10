import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  RefreshCw, 
  ChefHat, 
  Maximize2,
  Minimize2
} from 'lucide-react';
import mascotImg from '../../assets/images/mascot.png';

export const AiChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Xin chào! Mình là Friggy AI 🥑. Hôm nay tủ lạnh nhà bạn có những nguyên liệu gì? Để mình gợi ý món ăn ngon & mẹo bảo quản nhé!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    // Simulate AI intelligent response
    setTimeout(() => {
      let aiText = 'Cảm ơn bạn đã hỏi! Friggy AI gợi ý bạn nên tận dụng các nguyên liệu sẵn có trong tủ lạnh. Bạn có thể kiểm tra mục "Gợi ý món ăn" trong ứng dụng Friggy để xem công thức chi tiết nhé! 🥗';
      
      const lower = text.toLowerCase();
      if (lower.includes('trứng') || lower.includes('cà chua')) {
        aiText = 'Với trứng và cà chua, bạn có thể chế biến ngay: \n1. Trứng sốt cà chua đậm đà 🍳\n2. Canh trứng cà chua thanh mát 🍲\n3. Trứng chiên cà chua hành tây 🥘\n\n💡 *Mẹo:* Bạn nhớ để cà chua ở ngăn mát 10-12°C để giữ được độ mọng nước nhé!';
      } else if (lower.includes('bảo quản') || lower.includes('rau')) {
        aiText = '🥦 *Mẹo bảo quản rau xanh tươi lâu đến 2 tuần:*\n- Rửa sạch, để thật ráo nước trước khi cất.\n- Bọc rau bằng khăn giấy khô rồi cho vào túi zip đựng thực phẩm.\n- Đặt ở ngăn mát chuyên dụng (3-5°C).';
      } else if (lower.includes('thực đơn') || lower.includes('tối')) {
        aiText = '🍲 *Thực đơn dinh dưỡng 4 người tối nay:*\n1. Thịt kho tàu trứng cút 🥩\n2. Canh bí đao nấu tôm 🥣\n3. Rau muống xào tỏi 🥗\n4. Tráng miệng: Dưa hấu 🍉';
      } else if (lower.includes('rã đông') || lower.includes('thịt')) {
        aiText = '🥩 *3 Cách rã đông chuẩn chef:*\n1. Chuyển thịt từ ngăn đá sang ngăn mát từ tối hôm trước (An toàn nhất).\n2. Ngâm trong nước lạnh có thêm chút muối và giấm (Nhanh & giữ vị).\n3. Dùng chế độ Rã đông của lò vi sóng (Dùng ngay).';
      }

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Trigger Button - AI Chat above BackToTop */}
      <div className="fixed bottom-24 right-8 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative z-50 w-12 h-12 rounded-full overflow-hidden shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 border-2 border-emerald-400/80 bg-white flex items-center justify-center cursor-pointer group"
          aria-label="Toggle Friggy AI Chat"
        >
          {isOpen ? (
            <div className="w-full h-full bg-rose-500 text-white flex items-center justify-center transition-all">
              <X className="w-5 h-5" />
            </div>
          ) : (
            <div className="relative w-full h-full bg-white flex items-center justify-center rounded-full overflow-hidden">
              <img 
                src={mascotImg} 
                alt="Friggy AI Mascot" 
                className="w-full h-full object-cover scale-[1.55] transition-transform duration-300 group-hover:scale-[1.7]" 
              />
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full z-10"></span>
            </div>
          )}
        </motion.button>
      </div>

      {/* Chat Window Modal / Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-24 right-4 sm:right-8 z-50 w-[calc(100vw-2rem)] ${
              isExpanded ? 'sm:w-[650px] sm:h-[680px]' : 'sm:w-[420px] sm:h-[580px]'
            } h-[530px] bg-white rounded-3xl shadow-2xl border border-emerald-200/80 flex flex-col overflow-hidden transition-all duration-300`}
          >
            {/* Top Banner & Header featuring mascot.png */}
            <div className="relative bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-4 sm:p-5 overflow-hidden flex-shrink-0">
              {/* Background Mascot Overlay */}
              <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none transform translate-x-4 translate-y-4">
                <img src={mascotImg} alt="Mascot Background" className="w-36 h-36 object-contain" />
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden">
                    <img src={mascotImg} alt="Friggy Mascot" className="w-full h-full object-cover scale-[1.65] drop-shadow-md" />
                    <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-emerald-700 rounded-full z-10"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-black text-lg tracking-tight text-white">Friggy AI Chat</h3>
                      <span className="bg-emerald-400/30 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300/30">
                        PRO
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/90 font-medium flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-emerald-300" /> Trợ lý bếp & tủ lạnh thông minh
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 relative z-10">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="hidden sm:flex p-2 rounded-xl hover:bg-white/10 text-emerald-100 transition-colors"
                    title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl hover:bg-white/10 text-emerald-100 transition-colors"
                    title="Đóng chat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Body Background & Mascot Watermark */}
            <div className="relative flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-emerald-50/30 via-white to-emerald-50/20">
              {/* Mascot background watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
                <img src={mascotImg} alt="Watermark" className="w-64 h-64 object-contain filter grayscale" />
              </div>

              {/* Messages list */}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.sender === 'ai' ? (
                    <div className="w-11 h-11 rounded-full bg-emerald-100/90 border border-emerald-200 flex items-center justify-center flex-shrink-0 shadow-xs overflow-hidden">
                      <img src={mascotImg} alt="AI" className="w-full h-full object-cover scale-[1.65]" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[80%] space-y-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none font-medium'
                          : 'bg-white text-emerald-950 border border-emerald-100 rounded-tl-none font-semibold'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className={`block text-[10px] text-emerald-700/60 font-semibold px-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.time}
                    </span>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                  <div className="w-10 h-10 rounded-full bg-emerald-100/90 flex items-center justify-center overflow-hidden">
                    <img src={mascotImg} alt="AI" className="w-full h-full object-cover scale-[1.65] animate-bounce" />
                  </div>
                  <span className="italic text-emerald-700/80">Friggy AI đang suy nghĩ...</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <div className="p-3 bg-white border-t border-emerald-100 flex items-center gap-2 flex-shrink-0">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Nhập câu hỏi hoặc nguyên liệu tủ lạnh..."
                className="flex-1 px-4 py-2.5 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 text-xs sm:text-sm font-medium text-emerald-950 placeholder-emerald-800/50 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim()}
                className={`p-2.5 rounded-2xl font-bold transition-all ${
                  inputMessage.trim()
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 cursor-pointer'
                    : 'bg-emerald-100 text-emerald-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiChatWidget;
