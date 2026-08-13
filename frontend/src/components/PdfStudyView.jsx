import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Copy,
  Check,
  FileCheck,
  X
} from 'lucide-react';
import QuizView from './QuizView';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function PdfStudyView() {
  const [file, setFile] = useState(null);
  const [uploadedData, setUploadedData] = useState(null); // { name, uri, mime_type, display_name }
  const [isUploading, setIsUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'summarize' | 'quiz' | null
  const [errorMsg, setErrorMsg] = useState('');
  const [summary, setSummary] = useState('');
  const [pdfQuiz, setPdfQuiz] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const formatError = (errMessage = '') => {
    const s = String(errMessage).toUpperCase();
    if (s.includes('429') || s.includes('RESOURCE_EXHAUSTED') || s.includes('QUOTA')) {
      return '⏳ Gemini kullanım limiti geçici olarak doldu. Lütfen kısa bir süre sonra tekrar deneyin.';
    }
    return errMessage || 'İşlem gerçekleştirilemedi.';
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Lütfen yalnızca geçerli bir .pdf dosyası seçin.');
      return;
    }

    setFile(selectedFile);
    setErrorMsg('');
    setSummary('');
    setPdfQuiz(null);
    setUploadedData(null);

    // Auto-upload file to backend /api/pdf/upload
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_BASE}/pdf/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'PDF yüklenirken bir hata oluştu.');
      }

      const data = await res.json();
      setUploadedData(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(formatError(err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSummarize = async () => {
    if (!uploadedData) return;

    setActionLoading('summarize');
    setErrorMsg('');
    setSummary('');

    try {
      const res = await fetch(`${API_BASE}/pdf/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: uploadedData.name,
          file_uri: uploadedData.uri,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'PDF özetlenirken bir hata oluştu.');
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
      setErrorMsg(formatError(err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateQuiz = async () => {
    if (!uploadedData) return;

    setActionLoading('quiz');
    setErrorMsg('');
    setPdfQuiz(null);

    try {
      const res = await fetch(`${API_BASE}/pdf/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: uploadedData.name,
          file_uri: uploadedData.uri,
          question_count: 5,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'PDF quiz oluşturulurken bir hata oluştu.');
      }

      const data = await res.json();
      setPdfQuiz(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(formatError(err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopySummary = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetFile = () => {
    setFile(null);
    setUploadedData(null);
    setSummary('');
    setPdfQuiz(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // If PDF Quiz has been generated, display interactive QuizView reusing existing quiz components
  if (pdfQuiz) {
    return <QuizView initialQuizData={pdfQuiz} onClose={() => setPdfQuiz(null)} />;
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center relative z-10">
      <div className="w-full max-w-3xl glass-card p-6 sm:p-8 bg-slate-900/90 border border-slate-700/60 shadow-2xl rounded-3xl relative animate-fade-in space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
            PDF Study Workspace
          </h2>
          <p className="text-sm text-slate-400">
            Ders notlarını veya kaynak PDF dosyalarını yükle; Gemini 3.5 Flash ile özet çıkar ya da soru oluştur.
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* FILE SELECTION / UPLOAD BOX */}
        {!uploadedData ? (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-file-upload"
            />
            
            <label
              htmlFor="pdf-file-upload"
              className={`w-full py-10 px-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                isUploading
                  ? 'border-indigo-500/50 bg-indigo-950/20'
                  : 'border-slate-700/80 bg-slate-950/40 hover:bg-slate-950/70 hover:border-indigo-500/70'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                  <span className="text-sm font-medium text-slate-300">
                    PDF Yükleniyor ve İşleniyor...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      PDF Dosyası Seçmek İçin Tıklayın
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Yalnızca .pdf dosyaları kabul edilir
                    </p>
                  </div>
                </div>
              )}
            </label>
          </div>
        ) : (
          /* FILE LOADED & ACTIONS */
          <div className="space-y-6">
            {/* Loaded File Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30">
              <div className="flex items-center gap-3 truncate pr-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-semibold text-slate-200 truncate">
                    {uploadedData.display_name || file?.name || 'Yüklenen PDF'}
                  </h4>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Yüklendi ve Hazır
                  </p>
                </div>
              </div>

              <button
                onClick={handleResetFile}
                title="Başka bir dosya seç"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleSummarize}
                disabled={actionLoading !== null}
                className={`p-4 rounded-2xl border font-medium text-sm flex items-center justify-center gap-2.5 transition-all duration-200 ${
                  actionLoading === 'summarize'
                    ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-indigo-500/30 shadow-lg shadow-indigo-600/20 hover:scale-[1.01]'
                }`}
              >
                {actionLoading === 'summarize' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                    <span>Özet Çıkarılıyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>PDF'yi Özetle</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCreateQuiz}
                disabled={actionLoading !== null}
                className={`p-4 rounded-2xl border font-medium text-sm flex items-center justify-center gap-2.5 transition-all duration-200 ${
                  actionLoading === 'quiz'
                    ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 shadow-md hover:scale-[1.01]'
                }`}
              >
                {actionLoading === 'quiz' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Quiz Hazırlanıyor...</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>PDF'den Quiz Oluştur</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SUMMARY RESULT CARD */}
        {summary && (
          <div className="space-y-3 pt-2 border-t border-slate-800 animate-fade-in">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  PDF Özet Raporu
                </h3>
              </div>

              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Metni Kopyala</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 max-h-[50vh] overflow-y-auto text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-sans space-y-2">
              {summary}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
