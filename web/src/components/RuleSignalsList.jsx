import React from 'react';

const RULE_LABELS = {
  url_count: 'URLs Detected',
  email_count: 'Email Addresses',
  phone_count: 'Phone Numbers',
  urgency_score: 'Urgency Signals',
  authority_score: 'Authority Signals',
  credential_score: 'Credential Harvesting',
  bait_score: 'Baiting Signals',
  brand_mention_count: 'Brand Mentions',
  is_short: 'Short Message',
  exclamation_count: 'Exclamations',
  all_caps_word_ratio: 'ALL CAPS Words',
  has_greeting: 'Greeting Present',
};

export default function RuleSignalsList({ signals }) {
  if (!signals) return null;

  // Filter signals that are active (> 0)
  const activeSignals = Object.entries(signals).filter(([_, val]) => val > 0);

  return (
    <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/60 shadow-lg">
      <h3 className="text-base font-semibold text-slate-100 mb-3">
        Engine Rule Signals
      </h3>

      {activeSignals.length === 0 ? (
        <p className="text-xs text-slate-400">No rule triggers detected in input text.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {activeSignals.map(([key, val]) => {
            const label = RULE_LABELS[key] || key;
            const displayVal = typeof val === 'number' && val < 1 && val > 0 ? (val * 100).toFixed(0) + '%' : val;

            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200"
              >
                <span className="font-medium">{label}:</span>
                <span className="font-bold text-brand-500">{displayVal}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
