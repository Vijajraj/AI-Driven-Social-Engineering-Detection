import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

export default function LlmExplanationCard({ reasoning }) {
  if (!reasoning) return null;

  return (
    <div className="bg-gradient-to-r from-brand-900/90 via-slate-900 to-brand-800/80 p-6 rounded-2xl border border-brand-500/40 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-brand-accent font-semibold tracking-wide text-sm">
          <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" />
          <span>AI Threat Analysis & Explanation</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Response</span>
        </div>
      </div>

      <p className="text-sm md:text-base text-slate-100 leading-relaxed font-medium italic pl-3 border-l-4 border-brand-accent">
        "{reasoning}"
      </p>
    </div>
  );
}
