import React from 'react';

const CLASS_CONFIG = {
  benign: {
    name: 'Benign Message',
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  phishing: {
    name: 'Phishing Attack',
    bg: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  impersonation: {
    name: 'Impersonation Attack',
    bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  urgency_manipulation: {
    name: 'Urgency Manipulation',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  baiting: {
    name: 'Baiting Scam',
    bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  },
  pretexting: {
    name: 'Pretexting Attack',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
};

export default function AttackTypeBadge({ label, confidence }) {
  const cfg = CLASS_CONFIG[label] || {
    name: label ? label.replace('_', ' ').toUpperCase() : 'Unknown',
    bg: 'bg-slate-700 text-slate-300 border-slate-600',
  };

  const confidencePct = confidence ? Math.round(confidence * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border ${cfg.bg}`}>
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
        {cfg.name}
      </span>
      <span className="text-sm font-medium text-slate-400">
        Confidence: <span className="text-white font-semibold">{confidencePct}%</span>
      </span>
    </div>
  );
}
