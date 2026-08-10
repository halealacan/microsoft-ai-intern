import React from 'react';
import { PlusCircle, MessageSquare, Trash2, Cpu, Sparkles, BookOpen, ShieldCheck } from 'lucide-react';

export default function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onClearHistory,
  healthStatus
}) {
  return (
    <aside className="w-72 h-full glass-panel flex flex-col justify-between p-4 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-slate-200 select-none">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-2 py-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide gradient-text">
              AI Study Assistant
            </h1>
            <p className="text-xs text-slate-400 font-medium">Phi-4 Mini • Foundry Local</p>
          </div>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-md shadow-indigo-600/20 transition-all duration-200 active:scale-[0.98] mb-6"
        >
          <PlusCircle className="w-5 h-5" />
          <span>New Study Session</span>
        </button>

        {/* History Section */}
        <div className="mb-2">
          <div className="flex items-center justify-between px-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Recent Sessions</span>
            {conversations.length > 0 && (
              <button
                onClick={onClearHistory}
                title="Clear all chat history"
                className="hover:text-rose-400 transition-colors p-1 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {conversations.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500 italic rounded-lg border border-dashed border-slate-800">
                No previous sessions yet
              </div>
            ) : (
              conversations.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onSelectConversation(chat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-200 ${
                    chat.id === activeId
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 shrink-0 ${chat.id === activeId ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="truncate">{chat.title || 'Untitled Session'}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Info / Local Status */}
      <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
        {/* Connection status badge */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-300 font-medium">Local AI Model</span>
          </div>
          <span className="flex items-center gap-1.5 font-semibold text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus === 'connected'
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : healthStatus === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-rose-500 animate-pulse'
              }`}
            />
            <span
              className={
                healthStatus === 'connected'
                  ? 'text-emerald-400'
                  : healthStatus === 'warning'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }
            >
              {healthStatus === 'connected' ? 'Ready' : healthStatus === 'warning' ? 'Warning' : 'Offline'}
            </span>
          </span>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-2 px-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />
          <span>100% Private & Offline (Phi-4 Mini)</span>
        </div>
      </div>
    </aside>
  );
}
