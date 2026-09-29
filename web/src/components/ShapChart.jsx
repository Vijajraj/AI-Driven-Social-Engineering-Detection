import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ShapChart({ features }) {
  if (!features || features.length === 0) return null;

  // Sort by absolute magnitude descending
  const sorted = [...features].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  const chartData = sorted.map((f) => ({
    name: f.feature,
    impact: f.impact,
    absImpact: Math.abs(f.impact),
  }));

  return (
    <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
      <div className="mb-4">
        <h3 className="text-sm uppercase tracking-wider font-bold text-white flex items-center gap-2">
          <span>Top SHAP Feature Importances</span>
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Key linguistic features influencing the classification.
        </p>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
            <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }} />
            <YAxis dataKey="name" type="category" tick={{ fill: '#d4d4d8', fontSize: 11, fontFamily: 'monospace' }} width={110} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
              labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
              itemStyle={{ color: '#d4d4d8' }}
              formatter={(value) => [`Impact: ${value}`, 'SHAP Value']}
            />
            <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.impact >= 0 ? '#ffffff' : '#52525b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-white rounded-sm" />
          <span>Positive Indicator (Threat Push)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-zinc-600 rounded-sm" />
          <span>Negative Indicator (Benign Pull)</span>
        </div>
      </div>
    </div>
  );
}
