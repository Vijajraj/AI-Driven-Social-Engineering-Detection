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
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Background Subtle Monochrome Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-white/[0.015] blur-[140px] pointer-events-none rounded-full -z-10" />

      {/* Header / Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img 
              src="/logo.png" 
              alt="Social Engineering Detector Logo" 
              className="h-9 w-auto object-contain filter grayscale contrast-125" 
            />
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-sm tracking-wide text-white flex items-center gap-2">
                <span>SOCIAL ENGINEERING DETECTOR</span>
                <span className="text-[10px] uppercase font-mono font-semibold tracking-wider bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">
                  Platform
                </span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs (Monochrome Segments) */}
          <nav className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('analyze')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeTab === 'analyze'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Inspection</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeTab === 'history'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <HistoryIcon className="w-3.5 h-3.5" />
              <span>History</span>
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
            <div className="bg-zinc-900/60 p-5 md:p-6 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <label className="block text-xs uppercase tracking-wider font-bold text-zinc-300 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Suspicious Message Input</span>
                  </label>

                  {/* Channel Source Selector */}
                  <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                    <span className="text-[11px] font-mono text-zinc-500 uppercase">Channel:</span>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="bg-transparent border-none text-xs font-semibold text-zinc-200 outline-none cursor-pointer"
                    >
                      <option value="email" className="bg-zinc-900 text-zinc-200">Email Body</option>
                      <option value="sms" className="bg-zinc-900 text-zinc-200">SMS Text</option>
                      <option value="whatsapp" className="bg-zinc-900 text-zinc-200">WhatsApp Message</option>
                      <option value="instagram_dm" className="bg-zinc-900 text-zinc-200">Instagram DM</option>
                      <option value="instagram_comment" className="bg-zinc-900 text-zinc-200">Instagram Comment</option>
                      <option value="other" className="bg-zinc-900 text-zinc-200">Other / Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste message content here to analyze threat signals and social engineering attack patterns..."
                    rows={5}
                    className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 text-xs md:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-y font-mono"
                  />
                  <div className="absolute bottom-3 right-3 text-[11px] font-mono text-zinc-500 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
                    {text.length} chars
                  </div>
                </div>

                {/* Character truncation warning note */}
                {isTruncatedWarning && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <AlertCircle className="w-4 h-4 shrink-0 text-zinc-400" />
                    <span>
                      Long message detected. Text preprocessor automatically truncates input for feature extraction.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={analyzeMutation.isPending || !!rateLimitInfo || text.trim().length < 5}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-white/5 active:scale-95"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>Analyzing Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Run Threat Inspection</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {analyzeMutation.isError && !rateLimitInfo && (
                <div className="mt-4 p-3.5 bg-zinc-950 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-mono">
                  {analyzeMutation.error.message}
                </div>
              )}
            </div>

            {/* Results Panel */}
            {result && (
              <div className="space-y-6">
                {/* AI Explanation Header Callout */}
                <LlmExplanationCard reasoning={result.llm_reasoning} />

                {/* Top Row: Risk Gauge & Classification Badge */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <RiskGauge score={result.risk_score} />
                  <div className="md:col-span-2 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-3">
                        Primary Classification Result
                      </h3>
                      <AttackTypeBadge label={result.label} confidence={result.confidence} />
                    </div>

                    <div className="mt-5 pt-4 border-t border-zinc-800/80">
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
      <footer className="border-t border-zinc-900 bg-black p-4 text-center text-[11px] font-mono text-zinc-600">
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
