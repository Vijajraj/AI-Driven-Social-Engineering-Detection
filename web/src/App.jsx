import React, { useState } from 'react';
import { ShieldAlert, Search, History as HistoryIcon, Send, AlertCircle, Loader2 } from 'lucide-react';
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
  const [rateLimitInfo, setRateLimitInfo] = useState(null); // { retryAfterSeconds }

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
      // Invalidate history query so new row appears automatically
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header / Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600/20 text-brand-500 rounded-xl border border-brand-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-none">
                Social Engineering Detector
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Hybrid ML + SHAP + Groq LLM Security Platform
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('analyze')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeTab === 'analyze'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Analyze</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
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
            <div className="bg-slate-800/80 p-5 md:p-6 rounded-2xl border border-slate-700/60 shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <label className="block text-sm font-semibold text-slate-200">
                    Paste suspicious message or text snippet to inspect:
                  </label>

                  {/* Channel Source Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Source:</span>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs font-medium text-slate-200 outline-none focus:border-brand-500"
                    >
                      <option value="email">Email Body</option>
                      <option value="sms">SMS Text</option>
                      <option value="whatsapp">WhatsApp Message</option>
                      <option value="instagram_dm">Instagram DM</option>
                      <option value="instagram_comment">Instagram Comment</option>
                      <option value="other">Other / Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. URGENT: Your bank account has been locked due to suspicious activity. Click here http://verify-sec.net to restore access..."
                    rows={5}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-y"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                    {text.length} chars
                  </div>
                </div>

                {/* Character truncation warning note */}
                {isTruncatedWarning && (
                  <div className="flex items-center gap-2 text-xs text-amber-400/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Long message detected. Backend preprocessor truncates input to 2,000 characters for feature extraction.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={analyzeMutation.isPending || !!rateLimitInfo || text.trim().length < 5}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-brand-600/30"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing Pipeline...</span>
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
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-xs">
                  {analyzeMutation.error.message}
                </div>
              )}
            </div>

            {/* Results Panel */}
            {result && (
              <div className="space-y-6 animate-fade-in">
                {/* LLM Explanation Header Callout */}
                <LlmExplanationCard reasoning={result.llm_reasoning} />

                {/* Top Row: Risk Gauge & Classification Badge */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <RiskGauge score={result.risk_score} />
                  <div className="md:col-span-2 bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 shadow-lg flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                        Primary Classification Result
                      </h3>
                      <AttackTypeBadge label={result.label} confidence={result.confidence} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700/60">
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
      <footer className="border-t border-slate-800 bg-slate-950/80 p-4 text-center text-xs text-slate-500">
        AI-Driven Social Engineering Detection System &copy; 2026 — XGBoost + SHAP + Groq LLM + Neon DB
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
