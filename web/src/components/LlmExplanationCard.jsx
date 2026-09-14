import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';

export default function LlmExplanationCard({ reasoning }) {
  if (!reasoning) return null;

  return (
    <div className="bg-gradient-to-r from-brand-900/40 via-slate-800 to-purple-900/30 p-6 rounded-xl border border-brand-500/30 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-brand-400 font-semibold">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>AI Explanation & Analysis</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
          <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
          <span>Powered by Groq (llama-3.3-70b)</span>
        </div>
      </div>

      <p className="text-sm md:text-base text-slate-200 leading-relaxed font-normal italic pl-2 border-l-2 border-brand-500">
        "{reasoning}"
      </p>
    </div>
  );
}
