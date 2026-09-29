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
    <div>
      <h4 className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-2.5">
        Heuristic Rule Triggers
      </h4>

      {activeSignals.length === 0 ? (
        <p className="text-xs text-zinc-500 italic">No structural threat triggers detected in input text.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {activeSignals.map(([key, val]) => {
            const label = RULE_LABELS[key] || key;
            const displayVal = typeof val === 'number' && val < 1 && val > 0 ? (val * 100).toFixed(0) + '%' : val;

            return (
              <span
                key={key}
                className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-950/90 border border-zinc-800 rounded-lg text-xs text-zinc-300 shadow-sm"
              >
                <span className="text-zinc-400">{label}:</span>
                <span className="font-mono font-bold text-white">{displayVal}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
