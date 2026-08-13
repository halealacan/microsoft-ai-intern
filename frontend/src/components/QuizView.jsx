import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Loader2,
  Sparkles,
  Award,
  BookOpen,
  AlertCircle
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function QuizView({ onClose, initialQuizData = null, initialStage = null }) {
  // States: 'setup' | 'loading' | 'active' | 'result'
  const [stage, setStage] = useState(initialStage || (initialQuizData ? 'active' : 'setup'));
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [quizData, setQuizData] = useState(initialQuizData);
  const [errorMsg, setErrorMsg] = useState('');

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionIdx]: selectedOptionIdx }
  const [selectedOption, setSelectedOption] = useState(null);

  React.useEffect(() => {
    if (initialQuizData) {
      setQuizData(initialQuizData);
      setStage(initialStage || 'active');
      setCurrentIndex(0);
      setUserAnswers({});
      setSelectedOption(null);
    }
  }, [initialQuizData, initialStage]);

  const handleGenerateQuiz = async (e) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    setStage('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          question_count: Number(questionCount)
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Quiz oluşturulurken bir hata meydana geldi.');
      }

      const data = await res.json();
      setQuizData(data);
      setCurrentIndex(0);
      setUserAnswers({});
      setSelectedOption(null);
      setStage('active');
    } catch (err) {
      console.error(err);
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        setErrorMsg('⏳ Gemini kullanım limiti geçici olarak doldu. Lütfen kısa bir süre sonra tekrar deneyin.');
      } else {
        setErrorMsg(err.message || 'Quiz oluşturulamadı.');
      }
      setStage('setup');
    }
  };

  const handleSelectOption = (optionIdx) => {
    setSelectedOption(optionIdx);
  };

  const handleNextQuestion = () => {
    if (selectedOption === null) return;

    // Save answer
    const newAnswers = { ...userAnswers, [currentIndex]: selectedOption };
    setUserAnswers(newAnswers);

    if (currentIndex + 1 < quizData.questions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(newAnswers[currentIndex + 1] ?? null);
    } else {
      // Quiz finished
      setStage('result');
    }
  };

  const calculateScore = () => {
    if (!quizData) return { score: 0, total: 0, percent: 0 };
    let score = 0;
    quizData.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct_answer) {
        score++;
      }
    });
    const total = quizData.questions.length;
    const percent = Math.round((score / total) * 100);
    return { score, total, percent };
  };

  const resetQuiz = () => {
    if (initialQuizData && onClose) {
      onClose();
      return;
    }
    setStage('setup');
    setTopic('');
    setQuizData(null);
    setUserAnswers({});
    setSelectedOption(null);
    setErrorMsg('');
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center relative z-10">
      {/* Container Card */}
      <div className="w-full max-w-2xl glass-card p-6 sm:p-8 bg-slate-900/90 border border-slate-700/60 shadow-2xl rounded-3xl relative">
        
        {/* STAGE 1: SETUP FORM */}
        {stage === 'setup' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
                AI Interactive Quiz
              </h2>
              <p className="text-sm text-slate-400">
                İstediğin konuda Gemini 3.5 Flash ile anında çoktan seçmeli test oluştur.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleGenerateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Quiz Konusu
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Örn: Python Veri Yapıları, Hücre Biyolojisi, Osmanlı Tarihi..."
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Soru Sayısı ({questionCount})
                </label>
                <div className="flex items-center gap-3">
                  {[3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        questionCount === num
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {num} Soru
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!topic.trim()}
                className={`w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                  topic.trim()
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.01]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Quiz Oluştur</span>
              </button>
            </form>
          </div>
        )}

        {/* STAGE 2: LOADING */}
        {stage === 'loading' && (
          <div className="py-12 text-center space-y-4 animate-fade-in">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-slate-200">Quiz Hazırlanıyor...</h3>
              <p className="text-xs text-slate-400 mt-1">
                Gemini 3.5 Flash "{topic}" konusunda özgün sorular oluşturuyor.
              </p>
            </div>
          </div>
        )}

        {/* STAGE 3: ACTIVE QUIZ */}
        {stage === 'active' && quizData && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Progress */}
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-indigo-400">{quizData.title}</span>
                <span>Soru {currentIndex + 1} / {quizData.questions.length}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / quizData.questions.length) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Current Question */}
            {(() => {
              const currentQ = quizData.questions[currentIndex];
              return (
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-100 leading-snug">
                    {currentQ.question}
                  </h3>

                  {/* Options List */}
                  <div className="space-y-2.5">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = selectedOption === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectOption(optIdx)}
                          className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-600/10 font-medium'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center border ${
                                isSelected
                                  ? 'bg-indigo-500 text-white border-indigo-400'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Next Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleNextQuestion}
                disabled={selectedOption === null}
                className={`px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${
                  selectedOption !== null
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>
                  {currentIndex + 1 === quizData.questions.length ? 'Testi Bitir' : 'Sonraki Soru'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: RESULT SCREEN */}
        {stage === 'result' && quizData && (
          <div className="space-y-6 animate-fade-in max-h-[75vh] overflow-y-auto pr-1">
            {/* Header Score */}
            {(() => {
              const { score, total, percent } = calculateScore();
              return (
                <div className="text-center space-y-3 border-b border-slate-800 pb-6">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-100">Quiz Tamamlandı!</h2>
                    <p className="text-xs text-slate-400">{quizData.title}</p>
                  </div>

                  <div className="inline-flex items-center gap-4 bg-slate-950/80 px-6 py-3 rounded-2xl border border-slate-800">
                    <div className="text-center">
                      <div className="text-2xl font-black text-indigo-400">{score} / {total}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Doğru Cevap</div>
                    </div>
                    <div className="w-px h-8 bg-slate-800" />
                    <div className="text-center">
                      <div className="text-2xl font-black text-purple-400">%{percent}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Başarı Oranı</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Answer Explanations Review */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Soru ve Cevap Detayları
              </h3>

              {quizData.questions.map((q, idx) => {
                const userAns = userAnswers[idx];
                const isCorrect = userAns === q.correct_answer;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isCorrect
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400">Soru {idx + 1}</span>
                        <p className="text-sm font-medium text-slate-200">{q.question}</p>
                      </div>
                    </div>

                    <div className="text-xs space-y-1 pl-7">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Seçiminiz:</span>
                        <span className={`font-semibold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {userAns !== undefined ? `${String.fromCharCode(65 + userAns)}) ${q.options[userAns]}` : 'Boş'}
                        </span>
                      </div>

                      {!isCorrect && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Doğru Cevap:</span>
                          <span className="font-semibold text-emerald-400">
                            {String.fromCharCode(65 + q.correct_answer)}) {q.options[q.correct_answer]}
                          </span>
                        </div>
                      )}

                      {q.explanation && (
                        <div className="mt-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs italic">
                          💡 <span className="font-semibold not-italic text-indigo-300">Açıklama:</span> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Restart Button */}
            <div className="pt-2">
              <button
                onClick={resetQuiz}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm flex items-center justify-center gap-2 transition-all border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Yeni Quiz Yap</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
