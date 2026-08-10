import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Check, Sparkles } from 'lucide-react';

export default function ChatMessage({ message, isLast, isStreaming }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group w-full py-4 px-4 sm:px-6 flex gap-4 transition-colors animate-fade-in ${
        isUser
          ? 'bg-transparent'
          : 'bg-slate-900/40 border-y border-slate-800/40'
      }`}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {isUser ? (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-semibold text-sm">
            <User className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/60 flex items-center justify-center text-indigo-400 shadow-md">
            <Bot className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-200">
              {isUser ? 'You' : 'AI Study Assistant'}
            </span>
            {!isUser && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-mono border border-indigo-500/20">
                Phi-4 Mini
              </span>
            )}
          </div>

          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 text-xs flex items-center gap-1"
              title="Copy answer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-xs">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="text-sm leading-relaxed text-slate-300 prose prose-invert max-w-none">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              
              {isLast && isStreaming && (
                <div className="flex items-center gap-1.5 mt-2 py-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
