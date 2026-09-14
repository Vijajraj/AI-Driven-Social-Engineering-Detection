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
    <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/60 shadow-lg">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <span>Top SHAP Feature Importances</span>
        </h3>
        <p className="text-xs text-slate-400">
          Features driving the model's risk score and attack classification.
        </p>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: '#e2e8f0', fontSize: 12 }} width={110} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
              labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
              formatter={(value) => [`Impact: ${value}`, 'SHAP Value']}
            />
            <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.impact >= 0 ? '#ef4444' : '#10b981'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
