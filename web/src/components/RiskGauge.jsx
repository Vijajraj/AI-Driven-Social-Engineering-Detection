import React from 'react';

export default function RiskGauge({ score }) {
  const boundedScore = Math.max(0, Math.min(100, score || 0));

  // Determine risk band
  let band = { label: 'Low Risk', color: '#10b981', textColor: 'text-emerald-400' };
  if (boundedScore >= 70) {
    band = { label: 'High Risk', color: '#ef4444', textColor: 'text-red-400' };
  } else if (boundedScore >= 40) {
    band = { label: 'Medium Risk', color: '#f59e0b', textColor: 'text-amber-400' };
  }

  // Semi-circle math
  const radius = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half circumference
  const strokeDashoffset = circumference - (boundedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-lg">
      <div className="relative w-48 h-28 flex items-end justify-center">
        <svg className="w-48 h-48 -rotate-180" viewBox="0 0 200 200">
          {/* Background Arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#334155"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
          {/* Gauge Value Arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={band.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Score & Label Overlay */}
        <div className="absolute bottom-2 flex flex-col items-center">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {boundedScore}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </span>
          <span className={`text-xs font-semibold uppercase tracking-wider ${band.textColor}`}>
            {band.label}
          </span>
        </div>
      </div>
    </div>
  );
}
