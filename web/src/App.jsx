import React, { useState } from 'react';
import { Search, History as HistoryIcon, Send, AlertCircle, Loader2, Shield } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import RiskGauge from './components/RiskGauge';
import AttackTypeBadge from './components/AttackTypeBadge';
import ShapChart from './components/ShapChart';
import ProbabilityBars from './components/ProbabilityBars';
import RuleSignalsList from './components/RuleSignalsList';
import LlmExplanationCard from './components/LlmExplanationCard';
import RateLimitBanner from './components/RateLimitBanner';
import HistoryTable from './components/HistoryTable';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('analyze'); // 'analyze' | 'history'
  const [text, setText] = useState('');
  const [source, setSource] = useState('email');
  const [result, setResult] = useState(null);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: async (payload) => {
      setRateLimitInfo(null);
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        const errorData = await res.json();
        const retryAfter = errorData.detail?.retry_after_seconds || 25200;
        setRateLimitInfo({ retryAfterSeconds: retryAfter });
        throw new Error(errorData.detail?.message || 'Rate limit reached');
      }

      if (!res.ok) {
        throw new Error('Analysis failed. Please check backend connection.');
      }

      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || text.trim().length < 5) return;
    analyzeMutation.mutate({ text, source });
  };

  const isTruncatedWarning = text.length > 2000;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Background Decorative Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-brand-600/10 blur-[120px] pointer-events-none rounded-full -z-10" />

      {/* Header / Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img 
              src="/logo.png" 
              alt="Social Engineering Detector Logo" 
              className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(0,168,150,0.3)]" 
            />
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                <span>Social Engineering Detector</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-brand-500/20 text-brand-accent px-2 py-0.5 rounded border border-brand-500/30">
                  Security Platform
                </span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('analyze')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'analyze'
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Threat Analysis</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <HistoryIcon className="w-4 h-4" />
              <span>History Log</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'analyze' ? (
          <div className="space-y-6">
            {/* Rate Limit Error Banner */}
            {rateLimitInfo && (
              <RateLimitBanner retryAfterSeconds={rateLimitInfo.retryAfterSeconds} />
            )}

            {/* Input Panel */}
            <div className="bg-slate-900/80 p-5 md:p-6 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-600 via-brand-accent to-brand-700" />
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <label className="block text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
                    <Shield className="w-4 h-4 text-brand-accent" />
                    <span>Paste suspicious message or text snippet to inspect:</span>
                  </label>

                  {/* Channel Source Selector */}
                  <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Channel:</span>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-brand-accent outline-none cursor-pointer"
                    >
                      <option value="email" className="bg-slate-900 text-slate-100">Email Body</option>
                      <option value="sms" className="bg-slate-900 text-slate-100">SMS Text</option>
                      <option value="whatsapp" className="bg-slate-900 text-slate-100">WhatsApp Message</option>
                      <option value="instagram_dm" className="bg-slate-900 text-slate-100">Instagram DM</option>
                      <option value="instagram_comment" className="bg-slate-900 text-slate-100">Instagram Comment</option>
                      <option value="other" className="bg-slate-900 text-slate-100">Other / Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. URGENT: Your account has been suspended due to suspicious activity. Click here http://verify-sec.net to restore access..."
                    rows={5}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-y font-mono"
                  />
                  <div className="absolute bottom-3 right-3 text-xs font-mono text-slate-500 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                    {text.length} chars
                  </div>
                </div>

                {/* Character truncation warning note */}
                {isTruncatedWarning && (
                  <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 p-3 rounded-xl border border-amber-500/30">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Long message detected. Text preprocessor automatically truncates input for feature extraction.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={analyzeMutation.isPending || !!rateLimitInfo || text.trim().length < 5}
                    className="flex items-center gap-2.5 px-7 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-xl shadow-brand-500/25 active:scale-95"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
                        <span>Running Threat Analysis...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Run Threat Inspection</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {analyzeMutation.isError && !rateLimitInfo && (
                <div className="mt-4 p-3.5 bg-red-950/40 border border-red-500/40 text-red-300 rounded-xl text-xs font-medium">
                  {analyzeMutation.error.message}
                </div>
              )}
            </div>

            {/* Results Panel */}
            {result && (
              <div className="space-y-6 animate-fade-in">
                {/* AI Explanation Header Callout */}
                <LlmExplanationCard reasoning={result.llm_reasoning} />

                {/* Top Row: Risk Gauge & Classification Badge */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <RiskGauge score={result.risk_score} />
                  <div className="md:col-span-2 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs uppercase tracking-widest font-extrabold text-brand-accent mb-3">
                        Primary Threat Classification
                      </h3>
                      <AttackTypeBadge label={result.label} confidence={result.confidence} />
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800">
                      <RuleSignalsList signals={result.rule_signals} />
                    </div>
                  </div>
                </div>

                {/* Middle Row: SHAP Chart & Probability Bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ShapChart features={result.shap_top_features} />
                  <ProbabilityBars
                    probabilities={result.all_probabilities}
                    predictedLabel={result.label}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <HistoryPage />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 p-4 text-center text-xs text-slate-400 font-medium">
        Social Engineering Detector Security Platform &copy; 2026
      </footer>
    </div>
  );
}

function HistoryPage() {
  return (
    <div className="space-y-6">
      <HistoryTable />
    </div>
  );
}
