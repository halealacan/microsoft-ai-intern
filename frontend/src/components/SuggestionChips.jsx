import React from 'react';
import { HelpCircle, BookOpen, Code, FileText, Lightbulb, Compass } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: Lightbulb,
    title: 'Explain a Concept',
    prompt: 'Explain the concept of Neural Networks and backpropagation simply with an analogy.',
    color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30'
  },
  {
    icon: FileText,
    title: 'Summarize Study Material',
    prompt: 'Summarize the core principles of Object-Oriented Programming (OOP) into bullet points.',
    color: 'from-indigo-500/20 to-cyan-500/20 text-indigo-300 border-indigo-500/30'
  },
  {
    icon: Code,
    title: 'Debug & Practice Code',
    prompt: 'Give me a practice Python algorithm problem on binary search trees with solutions.',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30'
  },
  {
    icon: Compass,
    title: 'Exam Preparation Plan',
    prompt: 'Create a 3-day revision study timetable for a Data Structures and Algorithms exam.',
    color: 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30'
  }
];

export default function SuggestionChips({ onSelect }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-center space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold tracking-tight text-slate-100">
          What would you like to study today?
        </h3>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Ask any question from your lectures, request explanations, or choose a starting topic below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(item.prompt)}
              className="glass-card p-4 hover:scale-[1.01] flex items-start gap-3.5 group cursor-pointer text-left"
            >
              <div className={`p-2.5 rounded-xl bg-gradient-to-br border ${item.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <div className="font-semibold text-sm text-slate-200 group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </div>
                <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  "{item.prompt}"
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
