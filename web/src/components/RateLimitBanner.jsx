import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

export default function RateLimitBanner({ retryAfterSeconds }) {
  const [timeLeft, setTimeLeft] = useState(retryAfterSeconds || 0);

  useEffect(() => {
    setTimeLeft(retryAfterSeconds);
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  if (!retryAfterSeconds) return null;

  // Calculate retry target time formatted as HH:MM AM/PM
  const targetTime = new Date(Date.now() + timeLeft * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-xl flex items-start gap-3 text-amber-200 mb-6 animate-fade-in">
      <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold text-amber-300 text-sm md:text-base">
          Analysis Limit Reached (20 checks per hour)
        </h4>
        <p className="text-xs md:text-sm text-amber-200/80 mt-1">
          You have reached the free rate limit of 20 message analyses per hour per IP. Please try again at{' '}
          <span className="font-bold text-white underline">{targetTime}</span>.
        </p>
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 mt-2 bg-amber-950/40 px-2.5 py-1 rounded w-fit border border-amber-500/20">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {hours > 0 && `${hours}h `}
            {minutes}m {seconds}s remaining
          </span>
        </div>
      </div>
    </div>
  );
}
