import React from 'react';
import { HelpCircle, BookOpen, Code, FileText, Lightbulb, Compass, Edit3, Send } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: Lightbulb,
    title: 'Kavram Açıklaması',
    examplePrompt: 'Yapay Sinir Ağları ve geri yayılım (backpropagation) kavramını basit bir benzetmeyle açıkla.',
    color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30'
  },
  {
    icon: FileText,
    title: 'Ders Notlarını Özetle',
    examplePrompt: 'Nesne Yönelimli Programlamanın (OOP) temel ilkelerini maddeler halinde özetle.',
    color: 'from-indigo-500/20 to-cyan-500/20 text-indigo-300 border-indigo-500/30'
  },
  {
    icon: Code,
    title: 'Kod İnceleme ve Pratik',
    examplePrompt: 'Bana ikili arama ağaçları (BST) üzerine çözümüyle birlikte pratik bir Python algoritma sorusu ver.',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30'
  },
  {
    icon: Compass,
    title: 'Sınav Hazırlık Planı',
    examplePrompt: 'Veri Yapıları ve Algoritmalar sınavı için 3 günlük bir tekrar çalışma programı oluştur.',
    color: 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30'
  }
];

export default function SuggestionChips({ onSelect, onFillInput }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-center space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold tracking-tight text-slate-100">
          Bugün ne çalışmak istersiniz?
        </h3>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Örnek bir şablon seçip metni kendiniz düzenleyebilir veya doğrudan soru sorabilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        {SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="glass-card p-4.5 rounded-2xl border border-slate-700/60 bg-slate-900/60 flex flex-col justify-between gap-3 group transition-all hover:border-indigo-500/40 hover:bg-slate-900/80"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br border ${item.color} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h4>
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 italic">
                  "{item.examplePrompt}"
                </p>
              </div>

              {/* Action options */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => onFillInput(item.examplePrompt)}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 border border-slate-700/60 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                  title="Metni girdi alanına aktar ve kendin düzenle"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Düzenle</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelect(item.examplePrompt)}
                  className="py-1.5 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                  title="Örnek soruyu doğrudan gönder"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Örneği Gönder</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
