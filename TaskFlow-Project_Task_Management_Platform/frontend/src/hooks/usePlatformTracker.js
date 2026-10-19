import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * usePlatformTracker
 * 
 * Tracks how long the authenticated user actively spends on the platform.
 * Instead of making a dedicated API call, it accumulates minutes locally
 * and flushes them piggy-backed on the next regular API request via
 * the axios interceptor in api.js (which calls getAndResetPending).
 *
 * Flow:
 *  1. Tick every second while tab is visible and user is logged in.
 *  2. Every 60 active seconds → increment the module-level pendingMinutes counter.
 *  3. The axios request interceptor in api.js reads & resets pendingMinutes
 *     before any outgoing request and fires a lightweight POST in the background.
 */

// ── Module-level singleton state (shared with api.js interceptor) ──
let pendingMinutes = 0;
let pendingHour = new Date().getHours();
let pendingDate = new Date().toISOString().split('T')[0];

/** Called by the axios interceptor in api.js */
export function getAndResetPending() {
  if (pendingMinutes <= 0) return null;
  const data = { date: pendingDate, hour: pendingHour, minutes: pendingMinutes };
  pendingMinutes = 0;
  // Update date/hour for the next accumulation window
  const now = new Date();
  pendingHour = now.getHours();
  pendingDate = now.toISOString().split('T')[0];
  return data;
}

export default function usePlatformTracker() {
  const { user } = useAuth();
  const activeSecondsRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      activeSecondsRef.current = 0;
      pendingMinutes = 0;
      return;
    }

    const tick = () => {
      if (document.visibilityState === 'visible') {
        activeSecondsRef.current += 1;

        if (activeSecondsRef.current >= 60) {
          activeSecondsRef.current = 0;
          const now = new Date();
          pendingDate = now.toISOString().split('T')[0];
          pendingHour = now.getHours();
          pendingMinutes += 1;
        }
      }
    };

    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      activeSecondsRef.current = 0;
    };
  }, [user]);
}
