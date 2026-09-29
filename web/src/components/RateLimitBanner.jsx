import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

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

  const targetTime = new Date(Date.now() + timeLeft * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-zinc-900/90 border border-zinc-700/80 p-5 rounded-2xl flex items-start gap-3.5 text-zinc-300 mb-6 shadow-2xl backdrop-blur-xl">
      <AlertCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-bold text-white text-sm md:text-base">
          Rate Limit Reached (20 checks per hour)
        </h4>
        <p className="text-xs md:text-sm text-zinc-400 mt-1">
          You have reached the limit of 20 message analyses per hour per IP. Please retry at{' '}
          <span className="font-bold text-white underline">{targetTime}</span>.
        </p>
        <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-300 mt-2.5 bg-zinc-800/80 px-3 py-1 rounded-lg w-fit border border-zinc-700">
          <Clock className="w-3.5 h-3.5 text-white" />
          <span>
            {hours > 0 && `${hours}h `}
            {minutes}m {seconds}s remaining
          </span>
        </div>
      </div>
    </div>
  );
}
