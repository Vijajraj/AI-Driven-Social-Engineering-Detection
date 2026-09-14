import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Filter, RefreshCw } from 'lucide-react';
import AttackTypeBadge from './AttackTypeBadge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function HistoryTable() {
  const [labelFilter, setLabelFilter] = useState('all');
  const [limit, setLimit] = useState(20);
  const [expandedId, setExpandedId] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['history', labelFilter, limit],
    queryFn: async () => {
      let url = `${API_BASE_URL}/history?limit=${limit}`;
      if (labelFilter !== 'all') {
        url += `&label=${labelFilter}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
  });

  const analyses = data?.analyses || [];

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-xl overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Analysis History Log</span>
          </h2>
          <p className="text-xs text-slate-400">
            Recent message scans stored in Neon PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Label Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">All Attack Types</option>
              <option value="benign">Benign</option>
              <option value="phishing">Phishing</option>
              <option value="impersonation">Impersonation</option>
              <option value="urgency_manipulation">Urgency Manipulation</option>
              <option value="baiting">Baiting</option>
              <option value="pretexting">Pretexting</option>
            </select>
          </div>

          {/* Limit Selector */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value={20}>Show 20</option>
            <option value={50}>Show 50</option>
            <option value={100}>Show 100</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading analysis history...
        </div>
      ) : isError ? (
        <div className="p-12 text-center text-red-400 text-sm">
          Failed to load history log from backend.
        </div>
      ) : analyses.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          No analysis records found for this filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-900/60 text-slate-400 uppercase font-semibold text-xs border-b border-slate-700/60">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {analyses.map((row) => {
                const isExpanded = expandedId === row.id;
                const formattedDate = new Date(row.created_at).toLocaleString();

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => toggleExpand(row.id)}
                      className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 capitalize font-medium">
                        {row.source || 'unknown'}
                      </td>
                      <td className="py-3.5 px-4">
                        <AttackTypeBadge label={row.label} confidence={row.confidence} />
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span
                          className={
                            row.risk_score >= 70
                              ? 'text-red-400'
                              : row.risk_score >= 40
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {row.risk_score}/100
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button className="text-slate-400 hover:text-white p-1">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Inline Expanded Row */}
                    {isExpanded && (
                      <tr className="bg-slate-900/80 border-b border-slate-700/60">
                        <td colSpan={5} className="p-4 text-xs md:text-sm text-slate-300">
                          <div className="space-y-2">
                            <div className="font-semibold text-brand-400">
                              LLM Reasoning Explanation:
                            </div>
                            <p className="italic bg-slate-800 p-3 rounded-lg border border-slate-700/60">
                              "{row.llm_reasoning || 'No explanation generated.'}"
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
