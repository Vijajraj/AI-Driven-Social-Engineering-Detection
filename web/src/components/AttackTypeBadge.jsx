import React from 'react';

const CLASS_CONFIG = {
  benign: {
    name: 'Benign Message',
    bg: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    dot: 'bg-zinc-500',
  },
  phishing: {
    name: 'Phishing Attack',
    bg: 'bg-white text-black border-white font-bold shadow-sm shadow-white/20',
    dot: 'bg-black animate-pulse',
  },
  impersonation: {
    name: 'Impersonation Attack',
    bg: 'bg-zinc-800 text-zinc-100 border-zinc-600 font-semibold',
    dot: 'bg-zinc-300 animate-pulse',
  },
  urgency_manipulation: {
    name: 'Urgency Manipulation',
    bg: 'bg-zinc-800 text-zinc-200 border-zinc-700 font-semibold',
    dot: 'bg-zinc-400 animate-pulse',
  },
  baiting: {
    name: 'Baiting Scam',
    bg: 'bg-zinc-800 text-zinc-200 border-zinc-700 font-semibold',
    dot: 'bg-zinc-400 animate-pulse',
  },
  pretexting: {
    name: 'Pretexting Attack',
    bg: 'bg-zinc-800 text-zinc-200 border-zinc-600 font-semibold',
    dot: 'bg-zinc-300 animate-pulse',
  },
};

export default function AttackTypeBadge({ label, confidence }) {
  const cfg = CLASS_CONFIG[label] || {
    name: label ? label.replace('_', ' ').toUpperCase() : 'Unknown',
    bg: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    dot: 'bg-zinc-600',
  };

  const confidencePct = confidence ? Math.round(confidence * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold border transition-all ${cfg.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.name}
      </span>
      <span className="text-xs font-medium text-zinc-400">
        Confidence: <span className="text-white font-mono font-semibold">{confidencePct}%</span>
      </span>
    </div>
  );
}
