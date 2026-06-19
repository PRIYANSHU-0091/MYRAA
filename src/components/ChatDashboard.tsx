import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Command, 
  CornerDownLeft, 
  User, 
  Smile,
  Mic,
  ArrowDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => void;
  onToggleConnection?: () => void;
  state: string; // disconnected, connecting, listening, speaking
  themeColor: string;
}

export function ChatDashboard({
  isOpen,
  onClose,
  chatHistory,
  onSendMessage,
  onToggleConnection,
  state,
  themeColor
}: ChatDashboardProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Suggested quick prompts with Myraa-specific triggers
  const chatSuggestions = [
    "Say something sweet! 💕",
    "Change atmosphere to celestial 🌌",
    "What is on my screen? 🖥️",
    "Tell me a clever programmer joke! 💻",
    "Change atmosphere to crimson 🌋"
  ];

  // Helper theme configuration
  const getThemeColorClass = () => {
    switch (themeColor) {
      case "violet": return "text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-purple-500/10";
      case "crimson": return "text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-rose-500/10";
      case "emerald": return "text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-500/10";
      case "celestial": return "text-sky-400 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.15)] bg-sky-500/10";
      case "gold": return "text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-amber-500/10";
      case "rose": return "text-pink-400 border-pink-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-pink-500/10";
      case "charcoal":
      default:
        return "text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] bg-indigo-500/10";
    }
  };

  const getThemeAccentBorder = () => {
    switch (themeColor) {
      case "violet": return "border-purple-500/35 focus-within:border-purple-500/60";
      case "crimson": return "border-rose-500/35 focus-within:border-rose-500/60";
      case "emerald": return "border-emerald-500/35 focus-within:border-emerald-500/60";
      case "celestial": return "border-sky-500/35 focus-within:border-sky-500/60";
      case "gold": return "border-amber-500/35 focus-within:border-amber-500/60";
      case "rose": return "border-pink-500/35 focus-within:border-pink-500/60";
      case "charcoal":
      default:
        return "border-indigo-500/35 focus-within:border-indigo-500/60";
    }
  };

  const getThemeButtonBg = () => {
    switch (themeColor) {
      case "violet": return "bg-purple-500 hover:bg-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]";
      case "crimson": return "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]";
      case "emerald": return "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]";
      case "celestial": return "bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-[0_0_15px_rgba(14,165,233,0.4)]";
      case "gold": return "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]";
      case "rose": return "bg-pink-500 hover:bg-pink-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]";
      case "charcoal":
      default:
        return "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]";
    }
  };

  const getThemeTextGlow = () => {
    switch (themeColor) {
      case "violet": return "text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]";
      case "crimson": return "text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]";
      case "emerald": return "text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]";
      case "celestial": return "text-sky-400 drop-shadow-[0_0_10px_rgba(14,165,233,0.5)]";
      case "gold": return "text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]";
      case "rose": return "text-pink-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]";
      case "charcoal":
      default:
        return "text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]";
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll downwards when message length increases
  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow container layouts to resolve
      setTimeout(scrollToBottom, 60);
    }
  }, [chatHistory.length, isOpen]);

  // Keep bottom scrolling sticky when the last streamed response is updating
  const lastMsgText = chatHistory[chatHistory.length - 1]?.text;
  useEffect(() => {
    if (chatHistory[chatHistory.length - 1]?.isStreaming) {
      scrollToBottom();
    }
  }, [lastMsgText]);

  // Handle scroll detection for the floating scroll bottom indicator
  const handleScrollDetection = () => {
    const el = messageContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollDown(!isAtBottom && el.scrollHeight > el.clientHeight);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleSuggestionClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  const formatMessageTime = (date: Date) => {
    try {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Now";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent Backdrop Mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />

          {/* Slide-over Drawer Pane */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 210 }}
            className="absolute inset-y-0 right-0 w-full max-w-lg bg-[#020206]/95 border-l border-white/15 backdrop-blur-2xl z-50 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.85)]"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${getThemeColorClass()}`}>
                  <MessageSquare size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-lg tracking-tight text-white flex items-center gap-2">
                    Myraa Holographic Chat
                    <Sparkles size={14} className="text-cyan-400" />
                  </h3>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-0.5">
                    Live Session Text Link ({state})
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Offline notification card when Live link turned off */}
            {state === "disconnected" && (
              <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 text-xs text-amber-300 font-mono">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span>Myraa is dormant. Click to awaken her:</span>
                </div>
                {onToggleConnection && (
                  <button
                    onClick={onToggleConnection}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition hover:scale-105 active:scale-95 duration-150 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.3)] shrink-0 self-end sm:self-auto text-[10px]"
                  >
                    AWAKEN CORE
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Messages Container */}
            <div 
              ref={messageContainerRef}
              onScroll={handleScrollDetection}
              className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10"
            >
              <AnimatePresence initial={false}>
                {chatHistory.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8"
                  >
                    <div className="p-4 rounded-full border border-dashed border-white/10 bg-white/[0.02] mb-4">
                      <Smile size={32} className="opacity-40" />
                    </div>
                    <h4 className="text-sm font-semibold tracking-wide text-slate-300">Start the conversation</h4>
                    <p className="text-xs max-w-xs mt-2 leading-relaxed font-mono">
                      Type and transmit sweet text logs to Myraa, or ask questions! Myraa corresponds in real-time, accompanied by matching vocalized projections.
                    </p>
                  </motion.div>
                ) : (
                  chatHistory.map((m, index) => {
                    const isUser = m.role === "user";
                    return (
                      <motion.div
                        key={m.id || index}
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                          
                          {/* Chat Avatar bubble */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono border shrink-0 mt-0.5 ${
                            isUser 
                              ? "bg-slate-900 border-white/15 text-slate-300"
                              : "bg-[#0b0c16] border-cyan-500/20 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.1)]"
                          }`}>
                            {isUser ? <User size={14} /> : "M"}
                          </div>

                          {/* Chat Content Balloon */}
                          <div>
                            <div className={`p-3.5 rounded-2xl relative ${
                              isUser 
                                ? "bg-slate-900 border border-white/10 text-slate-100 rounded-tr-none" 
                                : "bg-indigo-950/30 border border-indigo-500/10 text-white rounded-tl-none backdrop-blur-md"
                            }`}>
                              <span className={`text-[9px] font-mono tracking-wider block mb-1 opacity-40 uppercase ${isUser ? "text-right" : "text-left"}`}>
                                {isUser ? "Priyanshu / Caller" : "Myraa Companion"}
                              </span>
                              <p className="text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap select-text selection:bg-cyan-500/30">
                                {m.text}
                              </p>
                              {m.isStreaming && (
                                <span className="inline-flex gap-1 items-center mt-1 text-[10px] font-mono text-cyan-400 tracking-widest uppercase">
                                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
                                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                  <span className="ml-1 text-[8px] opacity-60">streaming</span>
                                </span>
                              )}
                            </div>
                            <span className={`text-[8px] font-mono text-slate-500 mt-1 block ${isUser ? "text-right" : "text-left"}`}>
                              {formatMessageTime(m.timestamp)}
                            </span>
                          </div>

                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Floating Quick Action Suggestion Chips inside conversational drawer */}
            <div className="px-5 py-3 border-t border-white/5 bg-black/20 shrink-0 flex flex-nowrap gap-2 overflow-x-auto no-scrollbar scroll-smooth">
              {chatSuggestions.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(prompt.replace(/[💕🌌🖥️💻🌋]/g, "").trim())}
                  disabled={state === "disconnected"}
                  className="px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15 text-[10px] font-mono tracking-wider text-slate-300 transition shrink-0 whitespace-nowrap cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Float Bottom Scroller */}
            {showScrollDown && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-28 right-6 p-2 rounded-full bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white shadow-xl transition-all float duration-200 z-50 animate-bounce"
                title="Scroll To Latest Message"
              >
                <ArrowDown size={14} />
              </button>
            )}

            {/* Input Form Footer */}
            <div className="p-5 border-t border-white/10 bg-[#020206]/85 shrink-0">
              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <div className={`p-1 rounded-2xl border ${getThemeAccentBorder()} bg-black/45 backdrop-blur-xl flex items-center transition duration-200`}>
                  
                  {/* Decorative Command icon */}
                  <div className="p-2 ml-1 text-slate-500">
                    <Command size={14} />
                  </div>
                  
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={state === "disconnected"}
                    placeholder={
                      state === "disconnected" 
                        ? "Connect to awaken Myraa..." 
                        : "Type something sweet to Myraa..."
                    }
                    className="flex-1 min-w-0 bg-transparent text-xs p-2 text-white placeholder-slate-500 focus:outline-none focus:ring-0 disabled:text-slate-500 font-sans"
                  />
                  
                  <button
                    type="submit"
                    disabled={state === "disconnected" || !inputText.trim()}
                    className={`p-2.5 rounded-xl transition duration-150 flex items-center justify-center shrink-0 disabled:bg-white/5 disabled:text-slate-600 disabled:shadow-none mr-1 cursor-pointer ${getThemeButtonBg()}`}
                    title="Send Msg"
                  >
                    <Send size={12} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between px-2 text-[9px] font-mono text-slate-500">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[8px]">
                    <CornerDownLeft size={10} className="text-slate-600" />
                    <span>Press Enter to Send</span>
                  </span>
                  <span className="uppercase tracking-wider">WebSocket text uplink ready</span>
                </div>
              </form>
            </div>

            {/* Technical visual footer */}
            <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between text-[9px] font-mono text-slate-600 tracking-wider shrink-0 select-none">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${state === "disconnected" ? "bg-red-500" : "bg-cyan-400 animate-pulse"}`} />
                <span>MYRAA CHAT v2.10</span>
              </span>
              <span>SECURE PACKET LOGS</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
