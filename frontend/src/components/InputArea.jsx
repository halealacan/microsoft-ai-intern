import React, { useRef, useEffect } from 'react';
import { Send, Square, Sparkles } from 'lucide-react';

export default function InputArea({ input, setInput, onSend, onStop, isStreaming, disabled }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
      if (input) {
        textareaRef.current.focus();
      }
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !disabled && !isStreaming) {
        onSend();
      }
    }
  };

  return (
    <div className="p-4 glass-panel border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/90 relative z-10">
      <div className="max-w-4xl mx-auto relative">
        <div className="glass-card flex items-end gap-2 p-2 pr-3 bg-slate-900/80 border border-slate-700/60 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all rounded-2xl">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ders sorusu sorun veya notlarınızı yapıştırın (Göndermek için Enter, yeni satır için Shift+Enter)..."
            disabled={disabled}
            className="flex-1 bg-transparent border-0 resize-none outline-none text-slate-100 placeholder-slate-500 text-sm px-3 py-2 max-h-44 min-h-[42px]"
          />

          {isStreaming ? (
            <button
              onClick={onStop}
              className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-all flex items-center gap-1.5 text-xs font-medium"
              title="Üretimi durdur"
            >
              <Square className="w-4 h-4 fill-rose-300" />
              <span className="hidden sm:inline">Durdur</span>
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim() || disabled}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                input.trim() && !disabled
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 hover:scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-2 mt-2 text-[11px] text-slate-500">
          <span>Gemini 3.5 Flash ile çalışan Yapay Zeka Çalışma Asistanı</span>
          <span>Göndermek için Enter ↵ tuşuna basın</span>
        </div>
      </div>
    </div>
  );
}
