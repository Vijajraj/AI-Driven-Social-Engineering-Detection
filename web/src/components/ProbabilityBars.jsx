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
    <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/60 shadow-lg flex flex-col justify-between">
      <h3 className="text-base font-semibold text-slate-100 mb-3">
        Class Probabilities
      </h3>

      <div className="space-y-2.5">
        {Object.entries(probabilities).map(([key, prob]) => {
          const isPredicted = key === predictedLabel;
          const pct = Math.round(prob * 100);

          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className={isPredicted ? 'text-white font-bold' : 'text-slate-300'}>
                  {CLASS_LABELS[key] || key} {isPredicted && '(Predicted)'}
                </span>
                <span className={isPredicted ? 'text-brand-500 font-bold' : 'text-slate-400'}>
                  {pct}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isPredicted ? 'bg-brand-500 font-bold' : 'bg-slate-500'
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
