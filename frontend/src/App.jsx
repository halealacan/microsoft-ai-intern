import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatHeader from './components/ChatHeader';
import ChatMessage from './components/ChatMessage';
import SuggestionChips from './components/SuggestionChips';
import InputArea from './components/InputArea';
import { AlertCircle, Terminal, RefreshCw } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function App() {
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem('study_conversations');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [healthStatus, setHealthStatus] = useState('checking');
  const [healthDetails, setHealthDetails] = useState(null);
  const messagesEndRef = useRef(null);

  // Save conversations to localStorage
  useEffect(() => {
    localStorage.setItem('study_conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Check health status on mount
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Update messages when active conversation changes
  useEffect(() => {
    if (activeId) {
      const active = conversations.find((c) => c.id === activeId);
      if (active) {
        setMessages(active.messages);
      }
    } else {
      setMessages([]);
    }
  }, [activeId, conversations]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data.status);
        setHealthDetails(data);
      } else {
        setHealthStatus('disconnected');
      }
    } catch (e) {
      setHealthStatus('disconnected');
    }
  };

  const handleNewConversation = () => {
    const newId = Date.now().toString();
    const newChat = {
      id: newId,
      title: 'New Study Session',
      createdAt: new Date().toISOString(),
      messages: []
    };
    setConversations([newChat, ...conversations]);
    setActiveId(newId);
    setMessages([]);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all past sessions?')) {
      setConversations([]);
      setActiveId(null);
      setMessages([]);
    }
  };

  const updateActiveConversationMessages = (newMessages, autoTitle = '') => {
    let currentId = activeId;
    if (!currentId) {
      currentId = Date.now().toString();
      setActiveId(currentId);
    }

    setConversations((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === currentId);
      const title = autoTitle || (newMessages.find((m) => m.role === 'user')?.content.slice(0, 30) + '...') || 'Study Session';

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          title: updated[existingIdx].title === 'New Study Session' ? title : updated[existingIdx].title,
          messages: newMessages
        };
        return updated;
      } else {
        return [{
          id: currentId,
          title,
          createdAt: new Date().toISOString(),
          messages: newMessages
        }, ...prev];
      }
    });
  };

  const handleSendMessage = async (customPrompt = '') => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isStreaming) return;

    // Clean previous history to remove empty/placeholder/system messages
    const cleanedPrevMessages = messages.filter(
      (m) => (m.role === 'user' || m.role === 'assistant') && m.content && m.content.trim() !== ''
    );

    const userMessage = { role: 'user', content: textToSend };
    const updatedMessages = [...cleanedPrevMessages, userMessage];

    const requestPayload = {
      messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
    };

    console.log('[FRONTEND CHAT PAYLOAD]:', JSON.stringify(requestPayload, null, 2));
    
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        // Fallback to standard post endpoint if stream fails
        console.warn('Stream endpoint returned non-OK status, falling back to standard /chat endpoint');
        const fallbackRes = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        });

        if (!fallbackRes.ok) {
          const errData = await fallbackRes.json();
          throw new Error(errData.detail || 'Failed to get response from local AI.');
        }

        const data = await fallbackRes.json();
        const finalMessages = [...updatedMessages, { role: 'assistant', content: data.reply }];
        setMessages(finalMessages);
        updateActiveConversationMessages(finalMessages);
        setIsStreaming(false);
        return;
      }

      // Handle SSE Stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedReply = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                accumulatedReply += parsed.chunk;
                setMessages([
                  ...updatedMessages,
                  { role: 'assistant', content: accumulatedReply }
                ]);
              } else if (parsed.error) {
                accumulatedReply += `\n\n*[Error: ${parsed.error}]*`;
              }
            } catch (e) {
              // ignore partial chunk parse errors
            }
          }
        }
      }

      const finalStreamMessages = [
        ...updatedMessages,
        { role: 'assistant', content: accumulatedReply || 'No response generated.' }
      ];
      setMessages(finalStreamMessages);
      updateActiveConversationMessages(finalStreamMessages);

    } catch (err) {
      console.error(err);
      const errorMsg = {
        role: 'assistant',
        content: `⚠️ **Connection Error**: ${err.message}\n\nPlease verify that **Microsoft Foundry Local** is running locally and serving the **Phi-4 Mini** model.`
      };
      const finalErrorMessages = [...updatedMessages, errorMsg];
      setMessages(finalErrorMessages);
      updateActiveConversationMessages(finalErrorMessages);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => setActiveId(id)}
        onNewConversation={handleNewConversation}
        onClearHistory={handleClearHistory}
        healthStatus={healthStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary)] relative">
        {/* Background ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Header */}
        <ChatHeader
          healthStatus={healthStatus}
          onCheckHealth={checkHealth}
          isStreaming={isStreaming}
        />

        {/* Local AI Offline Alert Banner if disconnected */}
        {healthStatus === 'disconnected' && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300 z-10">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Microsoft Foundry Local endpoint is currently unreachable at <code className="font-mono bg-amber-950/60 px-1 py-0.5 rounded text-amber-200">http://localhost:5272/v1</code>.
              </span>
            </div>
            <button
              onClick={checkHealth}
              className="flex items-center gap-1 font-semibold hover:underline px-2 py-1 rounded bg-amber-500/20"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Chat / Suggestion Body */}
        <div className="flex-1 overflow-y-auto relative z-0">
          {messages.length === 0 ? (
            <SuggestionChips onSelect={(prompt) => handleSendMessage(prompt)} />
          ) : (
            <div className="max-w-4xl mx-auto py-6">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  message={msg}
                  isLast={idx === messages.length - 1}
                  isStreaming={isStreaming}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <InputArea
          input={input}
          setInput={setInput}
          onSend={() => handleSendMessage()}
          onStop={() => setIsStreaming(false)}
          isStreaming={isStreaming}
          disabled={false}
        />
      </main>
    </div>
  );
}
