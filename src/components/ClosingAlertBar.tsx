"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlertTriangleIcon, ClockIcon, Volume2Icon, BellIcon } from "./icons";

interface StatusData {
  config: {
    name: string;
    closeTime: string;
    announcement: string;
  };
  minutesUntilClose: number;
  status: "open" | "closing_soon" | "closed";
  alertLevel: "none" | "warning_30" | "warning_15" | "final";
}

export function ClosingAlertBar() {
  const [data, setData] = useState<StatusData | null>(null);
  const [hasPlayedChime, setHasPlayedChime] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Synthesize pleasant 2-tone library chime using Web Audio API (zero external assets needed)
  const playChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(659.25, now, 0.6); // E5
      playTone(523.25, now + 0.35, 0.9); // C5
    } catch {
      // AudioContext blocked by browser autoplay policy until user gesture
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/library/status");
      const json = await res.json();
      if (json.success) {
        setData(json);

        // Auto trigger gentle chime once if under 15 mins
        if (json.minutesUntilClose <= 15 && json.minutesUntilClose > 0 && !hasPlayedChime && soundEnabled) {
          playChime();
          setHasPlayedChime(true);
        }
      }
    } catch (e) {
      console.error("Failed to fetch library status", e);
    }
  }, [hasPlayedChime, playChime, soundEnabled]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (!data) return null;

  const { minutesUntilClose, config } = data;

  // Determine appearance based on urgency
  let bannerClass = "bg-blue-600 text-white";
  let urgencyText = `Closes at ${config.closeTime}`;
  let isUrgent = false;

  if (minutesUntilClose <= 0) {
    bannerClass = "bg-slate-900 text-slate-100 border-b border-red-500";
    urgencyText = "Library is now CLOSED for the night";
    isUrgent = true;
  } else if (minutesUntilClose <= 15) {
    bannerClass = "bg-red-600 text-white animate-pulse";
    urgencyText = `🚨 URGENT: Closes in ${minutesUntilClose} min! Security closing sweep in progress. Pack your books & return to hostels.`;
    isUrgent = true;
  } else if (minutesUntilClose <= 30) {
    bannerClass = "bg-amber-500 text-slate-950";
    urgencyText = `⚠️ Reminder: Closes in ${minutesUntilClose} min (${config.closeTime}). Please wrap up studies.`;
    isUrgent = true;
  }

  return (
    <div className={`w-full py-2.5 px-4 transition-colors duration-300 shadow-sm ${bannerClass}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 text-center sm:text-left">
          {isUrgent ? (
            <AlertTriangleIcon className="w-5 h-5 shrink-0" />
          ) : (
            <ClockIcon className="w-5 h-5 shrink-0 text-blue-200" />
          )}
          <span className="font-medium">{urgencyText}</span>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0">
          {config.announcement && (
            <span className="hidden md:inline-block opacity-90 truncate max-w-md">
              📢 {config.announcement}
            </span>
          )}

          <button
            onClick={playChime}
            title="Test announcement bell chime"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/15 hover:bg-black/25 active:scale-95 transition-all text-xs font-semibold backdrop-blur-sm cursor-pointer"
          >
            <Volume2Icon className="w-3.5 h-3.5" />
            <span>Test Chime</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute alert chime" : "Unmute alert chime"}
            className="p-1 rounded hover:bg-black/15 transition-all cursor-pointer"
          >
            <BellIcon className={`w-4 h-4 ${!soundEnabled ? "opacity-40" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
