import React from 'react';

export default function RiskGauge({ score }) {
  const boundedScore = Math.max(0, Math.min(100, score || 0));

  // Monochrome risk band hierarchy
  let band = { label: 'Low Risk', color: '#71717a', textColor: 'text-zinc-400', badgeBg: 'bg-zinc-800/50 border-zinc-700' };
  if (boundedScore >= 70) {
    band = { label: 'High Risk', color: '#ffffff', textColor: 'text-white font-extrabold', badgeBg: 'bg-white/10 border-white/30' };
  } else if (boundedScore >= 40) {
    band = { label: 'Medium Risk', color: '#d4d4d8', textColor: 'text-zinc-200 font-bold', badgeBg: 'bg-zinc-800/80 border-zinc-600' };
  }

  // Semi-circle math
  const radius = 80;
  const strokeWidth = 12;
  const circumference = Math.PI * radius; // Half circumference
  const strokeDashoffset = circumference - (boundedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
      <div className="relative w-48 h-28 flex items-end justify-center">
        <svg className="w-48 h-48 -rotate-180" viewBox="0 0 200 200">
          {/* Background Arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
          {/* Gauge Value Arc (Monochrome) */}
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
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-4xl font-mono font-extrabold text-white tracking-tighter">
            {boundedScore}
            <span className="text-xs font-normal text-zinc-500 ml-1">/100</span>
          </span>
          <span className={`text-[11px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border mt-1 ${band.textColor} ${band.badgeBg}`}>
            {band.label}
          </span>
        </div>
      </div>
    </div>
  );
}
