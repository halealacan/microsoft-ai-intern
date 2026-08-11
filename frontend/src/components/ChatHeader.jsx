import React from 'react';
import { Sparkles, RefreshCw, Cpu, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function ChatHeader({ healthStatus, onCheckHealth, isStreaming }) {
  return (
    <header className="h-16 px-6 glass-panel border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/80 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h2 className="text-base font-semibold text-slate-100">
            Study Assistant Workstation
          </h2>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          Gemini 3.5 Flash
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Connection Indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            healthStatus === 'connected'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : healthStatus === 'warning'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          {healthStatus === 'connected' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          {healthStatus === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
          {healthStatus === 'disconnected' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
          <span>
            {healthStatus === 'connected'
              ? 'Gemini API Active'
              : healthStatus === 'warning'
              ? 'Check Endpoint'
              : 'Gemini API Disconnected'}
          </span>
        </div>

        {/* Refresh health button */}
        <button
          onClick={onCheckHealth}
          title="Re-check local model status"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
