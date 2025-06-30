"use client";

import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function StatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastActivity, setLastActivity] = useState(new Date());

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    const updateActivity = () => setLastActivity(new Date());

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-sm">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <Wifi className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-sm font-medium text-green-700">Online</span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <WifiOff className="h-4 w-4 text-red-600" />
            </div>
            <span className="text-sm font-medium text-red-700">Offline</span>
          </>
        )}
      </div>
    </div>
  );
}