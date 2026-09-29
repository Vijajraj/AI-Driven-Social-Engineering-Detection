import React from 'react';

const CLASS_LABELS = {
  benign: 'Benign',
  phishing: 'Phishing',
  impersonation: 'Impersonation',
  urgency_manipulation: 'Urgency Manipulation',
  baiting: 'Baiting',
  pretexting: 'Pretexting',
};

export default function ProbabilityBars({ probabilities, predictedLabel }) {
  if (!probabilities) return null;

  return (
    <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-sm uppercase tracking-wider font-bold text-white">
          Class Probability Breakdown
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Distribution across all 6 attack classifications.
        </p>
      </div>

      <div className="space-y-3">
        {Object.entries(probabilities).map(([key, prob]) => {
          const isPredicted = key === predictedLabel;
          const pct = Math.round(prob * 100);

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className={isPredicted ? 'text-white font-bold flex items-center gap-1.5' : 'text-zinc-400'}>
                  {isPredicted && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  {CLASS_LABELS[key] || key} {isPredicted && <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">Predicted</span>}
                </span>
                <span className={`font-mono ${isPredicted ? 'text-white font-bold' : 'text-zinc-500'}`}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isPredicted ? 'bg-white shadow-sm shadow-white/30' : 'bg-zinc-600'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
