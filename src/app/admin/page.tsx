"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { QrImage } from "@/components/QrImage";
import {
  DeskIcon,
  ShieldIcon,
  Volume2Icon,
  RefreshCwIcon,
  LogOutIcon,
  CheckIcon,
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

interface LibraryConfig {
  name: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
  announcement: string;
}

export default function AdminPage() {
  const [desks, setDesks] = useState<Desk[]>([]);
  const [config, setConfig] = useState<LibraryConfig | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "qr-print" | "settings">("live");
  const [loading, setLoading] = useState(true);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [closeTime, setCloseTime] = useState("22:00");
  const [updating, setUpdating] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const [origin, setOrigin] = useState("");

   useEffect(() => {
    if (typeof window !== "undefined") {
      
      setOrigin(window.location.origin);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/seats");
      const json = await res.json();
      if (json.success) {
        setDesks(json.desks);
        setConfig(json.config);
        setBroadcastMessage(json.config.announcement || "");
        setCloseTime(json.config.closeTime || "22:00");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
     fetchData();
  }, [fetchData]);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch("/api/library/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closeTime,
          announcement: broadcastMessage,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedNote("Library settings & closing broadcast updated!");
        setTimeout(() => setSavedNote(null), 3000);
        fetchData();
      }
    } catch {
      alert("Failed to update settings");
    } finally {
      setUpdating(false);
    }
  };

  const handleForceFree = async (deskId: string) => {
    if (!confirm(`Are you sure you want to force-clear ${deskId}?`)) return;
    try {
      const res = await fetch("/api/seats/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deskId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch {
      alert("Failed to free desk");
    }
  };

  const triggerClosingNotice = async (minutes: number) => {
    const text = `🚨 Security Announcement: Library will close in ${minutes} minutes. Security guard floor sweep will begin shortly. Please pack all books and personal items.`;
    setBroadcastMessage(text);
    try {
      await fetch("/api/library/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement: text }),
      });
      setSavedNote(`Broadcasted ${minutes}-minute closing warning to all student screens!`);
      setTimeout(() => setSavedNote(null), 3500);
      fetchData();
    } catch {
      alert("Broadcast failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col print:bg-white">
      {/* Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 print:hidden sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold">
              <ShieldIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">Librarian & Security Desk</h1>
              <p className="text-xs text-slate-400">Manage Closing Alerts & Printable QR Stickers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
              title="Refresh desk status"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCwIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
            >
              ← Student Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-4">
          <button
            onClick={() => setActiveTab("live")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "live"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Live Desk Overview ({desks.filter((d) => d.status === "occupied").length} Occupied)
          </button>

          <button
            onClick={() => setActiveTab("qr-print")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "qr-print"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            🖨️ Printable QR Stickers ({desks.length} Desks)
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "settings"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📢 Closing Broadcast & Guard Tools
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        {savedNote && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 print:hidden animate-in fade-in">
            <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedNote}</span>
          </div>
        )}

        {/* TAB 1: LIVE DESK OVERVIEW */}
        {activeTab === "live" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 print:hidden">
              <div>
                <h2 className="text-xl font-black text-slate-900">Current Occupancy Table</h2>
                <p className="text-xs text-slate-500">
                  Real-time list of all study desks across all floors.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  {desks.filter((d) => d.status === "available").length} Free
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
                  {desks.filter((d) => d.status === "occupied").length} Occupied
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Desk</th>
                      <th className="py-3 px-4">Floor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Time Left</th>
                      <th className="py-3 px-4 text-right">Guard Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {desks.map((d) => {
                      const isOcc = d.status === "occupied";
                      const diffMins = d.occupiedBy?.expiresAt
                        ? Math.max(0, Math.round((new Date(d.occupiedBy.expiresAt).getTime() - new Date().getTime()) / 60000))
                        : null;

                      return (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {d.id}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{d.floorName}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                isOcc ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isOcc ? "Occupied" : "Free"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isOcc ? (
                              <div>
                                <span className="font-semibold text-slate-800">
                                  {d.occupiedBy?.studentName}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  {d.occupiedBy?.studentId}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {diffMins !== null ? `${diffMins} min` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isOcc && (
                              <button
                                onClick={() => handleForceFree(d.id)}
                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                Clear Seat
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRINTABLE QR STICKERS */}
        {activeTab === "qr-print" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 print:hidden">
              <div>
                <h2 className="text-xl font-black text-slate-900">Desk QR Code Stickers</h2>
                <p className="text-xs text-slate-500">
                  Print these labels and stick them to each library desk. When students scan with their phone camera, it opens their check-in page automatically.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <span>🖨️ Print All Stickers Now</span>
              </button>
            </div>

            {/* Sticker Grid (Print formatted) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3 print:gap-3">
              {desks.map((d) => {
                const targetUrl = `${origin || "https://library.college.edu"}/seat/${d.id}`;
                return (
                  <div
                    key={d.id}
                    className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-between text-center print:border-slate-800 print:break-inside-avoid print:shadow-none"
                  >
                    <div className="w-full pb-2 border-b border-slate-100 mb-2">
                      <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase block">
                        {config?.name || "University Library"}
                      </span>
                      <h3 className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                        {d.id}
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Floor {d.floor} • Seat #{d.seatNumber}
                      </p>
                    </div>

                    <QrImage data={targetUrl} size={150} />

                    <div className="mt-3 pt-2 border-t border-slate-100 w-full text-center">
                      <p className="text-[10px] font-bold text-slate-700">
                        📱 Scan to Check In / Free Seat
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {targetUrl.replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CLOSING BROADCAST & GUARD TOOLS */}
        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto space-y-6 print:hidden">
            {/* Quick 1-Click Guard Broadcast */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-2 text-red-900 font-black text-lg mb-1">
                <Volume2Icon className="w-5 h-5 text-red-600" />
                <span>Security Guard 1-Click Floor Announcement</span>
              </div>
              <p className="text-xs text-red-700 mb-4 leading-relaxed">
                Instead of the guard walking floor-to-floor shouting at students, tap one of these buttons. It immediately flashes an alert banner on every student’s phone screen and plays the warning bell chime!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => triggerClosingNotice(30)}
                  className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2Icon className="w-4 h-4" />
                  <span>Broadcast 30-Min Warning</span>
                </button>

                <button
                  onClick={() => triggerClosingNotice(15)}
                  className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2Icon className="w-4 h-4" />
                  <span>Broadcast 15-Min FINAL Call</span>
                </button>
              </div>
            </div>

            {/* Library Schedule Form */}
            <form onSubmit={handleUpdateConfig} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Library Schedule & Live Banner</h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daily Closing Time (24-Hour Format)
                </label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <span className="text-xs text-slate-500 ml-2">Current closing: {closeTime}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Live Announcement Message (shown on all student screens)
                </label>
                <textarea
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="e.g. Please keep quiet in the Silent Study zone."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                {updating ? "Saving..." : "Save Configuration"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
