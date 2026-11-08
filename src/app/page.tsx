"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { ClosingAlertBar } from "@/components/ClosingAlertBar";
import {
  DeskIcon,
  PlugIcon,
  WindowIcon,
  ClockIcon,
  QrCodeIcon,
  UsersIcon,
  RefreshCwIcon,
  LogOutIcon,
  ShieldIcon,
  MapPinIcon,
} from "@/components/icons";

interface Desk {
  id: string;
  floor: number;
  floorName: string;
  seatNumber: number;
  hasSocket: boolean;
  nearWindow: boolean;
  status: "available" | "occupied" | "reserved";
  occupiedBy?: {
    studentId: string;
    studentName: string;
    checkedInAt: string;
    expiresAt: string;
  };
}

interface FloorSummary {
  floor: number;
  name: string;
  total: number;
  available: number;
  occupied: number;
}

interface SeatsResponse {
  stats: {
    totalSeats: number;
    availableSeats: number;
    occupiedSeats: number;
    occupancyPercentage: number;
  };
  floors: FloorSummary[];
  desks: Desk[];
}

export default function HomePage() {
  const [data, setData] = useState<SeatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState<number | "all">("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlySocket, setOnlySocket] = useState(false);
  const [onlyWindow, setOnlyWindow] = useState(false);
  const [activeMySeat, setActiveMySeat] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Load active seat from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("smart_library_student_seat");
    if (saved) setActiveMySeat(saved);
  }, []);

  const fetchSeats = useCallback(async () => {
    try {
      const res = await fetch("/api/seats");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch seats", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ⚡ Real-Time WebSocket Connection (Socket.io)
  useEffect(() => {
    fetchSeats();

    const socket: Socket = io();

    socket.on("connect", () => {
      setIsSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    // Sub-millisecond instant sync when ANY seat is booked or released
    socket.on("seats_updated", () => {
      fetchSeats();
    });

    // Fallback polling every 20 seconds in case of intermittent network
    const interval = setInterval(fetchSeats, 20000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [fetchSeats]);

  const handleQuickCheckout = async (deskId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/seats/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deskId }),
      });
      const json = await res.json();
      if (json.success) {
        localStorage.removeItem("smart_library_student_seat");
        setActiveMySeat(null);
        fetchSeats();
      } else {
        alert(json.message);
      }
    } catch {
      alert("Checkout failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async (deskId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/seats/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deskId, extraMinutes: 60 }),
      });
      const json = await res.json();
      if (json.success) {
        alert("Extended by 1 hour!");
        fetchSeats();
      } else {
        alert(json.message);
      }
    } catch {
      alert("Extend failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter desks
  const filteredDesks = (data?.desks || []).filter((desk) => {
    if (selectedFloor !== "all" && desk.floor !== selectedFloor) return false;
    if (onlyAvailable && desk.status !== "available") return false;
    if (onlySocket && !desk.hasSocket) return false;
    if (onlyWindow && !desk.nearWindow) return false;
    return true;
  });

  const getMinutesRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    return Math.max(0, Math.round(diff / 60000));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 pb-24">
      {/* 1. Automated Library Closing Reminder Bar */}
      <ClosingAlertBar />

      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-200">
              <DeskIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">
                UniSeat <span className="text-blue-600 font-medium text-sm">Live</span>
              </h1>
              <p className="text-xs text-slate-500">Central University Library</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time WebSocket connection indicator */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${isSocketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-slate-600 font-mono">
                {isSocketConnected ? "WebSocket Live" : "Connecting..."}
              </span>
            </div>

            <button
              onClick={() => {
                setLoading(true);
                fetchSeats();
              }}
              title="Refresh seat status"
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCwIcon className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ShieldIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Librarian /</span> Print QRs
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        {/* Hostel Decision Hero Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/20 to-transparent pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
              <MapPinIcon className="w-3.5 h-3.5" />
              <span>Real-Time Hostel Check</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Should you walk to the library now?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mb-6 leading-relaxed">
              Check live seat occupancy before you take the 15-minute walk from your hostel room.
              Scan the desk QR code as soon as you sit down to claim your spot.
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
                <span className="text-xs text-slate-300 block mb-1">Available Desks</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {data?.stats.availableSeats ?? "--"}
                  </span>
                  <span className="text-xs text-slate-400">/ {data?.stats.totalSeats ?? "--"} total</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
                <span className="text-xs text-slate-300 block mb-1">Occupancy Rate</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl sm:text-3xl font-black ${
                    (data?.stats.occupancyPercentage ?? 0) > 85 ? "text-red-400" : "text-blue-300"
                  }`}>
                    {data?.stats.occupancyPercentage ?? "--"}%
                  </span>
                  <span className="text-xs text-slate-400">capacity</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-300 block mb-1">Verdict</span>
                <div className="text-sm font-bold mt-1 text-slate-100 flex items-center gap-1.5">
                  {(data?.stats.availableSeats ?? 0) > 10 ? (
                    <span className="text-emerald-400">✅ Plenty of seats</span>
                  ) : (data?.stats.availableSeats ?? 0) > 0 ? (
                    <span className="text-amber-300">⚠️ Limited seats!</span>
                  ) : (
                    <span className="text-red-400">❌ Full, do not walk!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floor Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {(data?.floors || []).map((floor) => {
            const isSelected = selectedFloor === floor.floor;
            const pct = Math.round((floor.occupied / floor.total) * 100);
            return (
              <button
                key={floor.floor}
                onClick={() => setSelectedFloor(isSelected ? "all" : floor.floor)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-600 shadow-md ring-2 ring-blue-600/20"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-900 text-sm">{floor.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      floor.available > 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {floor.available} Free
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-500">
                  <span>{floor.occupied} occupied</span>
                  <span>{floor.total} total</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          {/* Floor tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedFloor("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedFloor === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Floors ({data?.desks.length ?? 0})
            </button>
            {(data?.floors || []).map((f) => (
              <button
                key={f.floor}
                onClick={() => setSelectedFloor(f.floor)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedFloor === f.floor
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Floor {f.floor} ({f.available} free)
              </button>
            ))}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                onlyAvailable
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyAvailable ? "bg-emerald-500" : "bg-slate-300"}`} />
              Available Only
            </button>

            <button
              onClick={() => setOnlySocket(!onlySocket)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                onlySocket
                  ? "bg-blue-50 border-blue-500 text-blue-800 font-semibold"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <PlugIcon className="w-3.5 h-3.5 text-blue-600" />
              Power Outlet
            </button>

            <button
              onClick={() => setOnlyWindow(!onlyWindow)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                onlyWindow
                  ? "bg-indigo-50 border-indigo-500 text-indigo-800 font-semibold"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <WindowIcon className="w-3.5 h-3.5 text-indigo-600" />
              Near Window
            </button>
          </div>
        </div>

        {/* Seat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredDesks.map((desk) => {
            const isAvailable = desk.status === "available";
            const isMySeat = activeMySeat === desk.id;
            const minutesLeft = getMinutesRemaining(desk.occupiedBy?.expiresAt);

            return (
              <div
                key={desk.id}
                className={`relative rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                  isMySeat
                    ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-md"
                    : isAvailable
                    ? "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md"
                    : "bg-slate-100/80 border-slate-200 opacity-90"
                }`}
              >
                {/* Desk Header */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-base font-mono">
                      {desk.id}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isAvailable ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 truncate mb-2.5">
                    Floor {desk.floor} • Seat #{desk.seatNumber}
                  </p>

                  {/* Amenities Tags */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {desk.hasSocket && (
                      <span
                        title="Has power outlet"
                        className="inline-flex items-center p-1 rounded bg-slate-100 text-slate-600 text-[10px]"
                      >
                        <PlugIcon className="w-3 h-3 text-blue-600" />
                      </span>
                    )}
                    {desk.nearWindow && (
                      <span
                        title="Natural daylight / Window seat"
                        className="inline-flex items-center p-1 rounded bg-slate-100 text-slate-600 text-[10px]"
                      >
                        <WindowIcon className="w-3 h-3 text-amber-600" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Desk Status & Action */}
                <div className="pt-2 border-t border-slate-100">
                  {isAvailable ? (
                    <Link
                      href={`/seat/${desk.id}`}
                      className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      <QrCodeIcon className="w-3.5 h-3.5" />
                      <span>Check In</span>
                    </Link>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="flex items-center gap-1 truncate">
                          <UsersIcon className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{desk.occupiedBy?.studentName || "Occupied"}</span>
                        </span>
                      </div>

                      {minutesLeft !== null && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                          <ClockIcon className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{minutesLeft}m left</span>
                        </div>
                      )}

                      {isMySeat ? (
                        <button
                          onClick={() => handleQuickCheckout(desk.id)}
                          disabled={actionLoading}
                          className="w-full py-1 px-2 rounded bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Check Out
                        </button>
                      ) : (
                        <Link
                          href={`/seat/${desk.id}`}
                          className="block text-center text-[10px] text-slate-500 hover:text-slate-800 underline decoration-slate-300 pt-0.5"
                        >
                          View Status
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredDesks.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <DeskIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700">No desks match your filter</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting the filters above to see more seats.</p>
          </div>
        )}
      </main>

      {/* Floating Sticky Banner if the Student has an Active Seat */}
      {activeMySeat && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-in slide-in-from-bottom">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold font-mono text-sm">
              {activeMySeat}
            </div>
            <div>
              <p className="text-xs text-blue-300 font-medium">Your Active Seat</p>
              <p className="text-sm font-bold text-slate-100">Checked into {activeMySeat}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExtend(activeMySeat)}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-600 transition-colors cursor-pointer"
            >
              +1 Hr
            </button>
            <button
              onClick={() => handleQuickCheckout(activeMySeat)}
              disabled={actionLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <LogOutIcon className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
