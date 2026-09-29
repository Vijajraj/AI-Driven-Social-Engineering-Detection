import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

export default function LlmExplanationCard({ reasoning }) {
  if (!reasoning) return null;

  return (
    <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-700/80 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2 text-white font-bold tracking-wide text-xs uppercase">
          <Sparkles className="w-4 h-4 text-white" />
          <span>AI Threat Analysis & Explanation</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-800/80 px-3 py-1 rounded-full border border-zinc-700 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
          <span>Verified Evaluation</span>
        </div>
      </div>

      <p className="text-sm md:text-base text-zinc-200 leading-relaxed font-normal italic pl-3 border-l-2 border-white">
        "{reasoning}"
      </p>
    </div>
  );
}
