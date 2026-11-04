"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClosingAlertBar } from "@/components/ClosingAlertBar";
import {
  DeskIcon,
  PlugIcon,
  WindowIcon,
  ClockIcon,
  CheckIcon,
  AlertTriangleIcon,
  LogOutIcon,
  QrCodeIcon,
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

export default function SeatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [desk, setDesk] = useState<Desk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load saved student credentials from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem("smart_library_student_id") || "";
    const savedName = localStorage.getItem("smart_library_student_name") || "";
    if (savedId) setStudentId(savedId);
    if (savedName) setStudentName(savedName);
  }, []);

  const fetchDesk = async () => {
    try {
      const res = await fetch(`/api/seats/${id}`);
      const json = await res.json();
      if (json.success) {
        setDesk(json.desk);
      } else {
        setError(json.message);
      }
    } catch {
      setError("Failed to load desk data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesk();
  }, [id]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      alert("Please enter your Student ID or Roll Number");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/seats/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deskId: id,
          studentId: studentId.trim(),
          studentName: studentName.trim() || `Student ${studentId.trim()}`,
          durationMinutes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        localStorage.setItem("smart_library_student_id", studentId.trim());
        if (studentName.trim()) {
          localStorage.setItem("smart_library_student_name", studentName.trim());
        }
        localStorage.setItem("smart_library_student_seat", id);

        setSuccessMessage(`Checked into ${id} successfully!`);
        setTimeout(() => {
          router.push("/");
        }, 1500);
      } else {
        alert(json.message);
      }
    } catch {
      alert("Check-in request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/seats/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deskId: id }),
      });
      const json = await res.json();
      if (json.success) {
        localStorage.removeItem("smart_library_student_seat");
        setSuccessMessage("Checked out successfully!");
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        alert(json.message);
      }
    } catch {
      alert("Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtend = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/seats/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deskId: id, extraMinutes: 60 }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage("Desk reservation extended by 1 hour!");
        fetchDesk();
      } else {
        alert(json.message);
      }
    } catch {
      alert("Extend failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Checking desk #{id}...</p>
        </div>
      </div>
    );
  }

  if (error || !desk) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <ClosingAlertBar />
        <div className="flex-1 max-w-md mx-auto px-4 py-16 text-center">
          <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Desk Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">{error || "This desk QR code is invalid."}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm"
          >
            Go to Seat Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isAvailable = desk.status === "available";
  const savedSeat = typeof window !== "undefined" ? localStorage.getItem("smart_library_student_seat") : null;
  const isMySeat = savedSeat === desk.id || (desk.occupiedBy?.studentId && desk.occupiedBy.studentId === studentId);

  const minutesLeft = desk.occupiedBy?.expiresAt
    ? Math.max(0, Math.round((new Date(desk.occupiedBy.expiresAt).getTime() - new Date().getTime()) / 60000))
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <ClosingAlertBar />

      <div className="max-w-md mx-auto w-full px-4 py-8 flex-1 flex flex-col justify-center">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium"
          >
            ← Back to Seat Dashboard
          </Link>
          <span className="text-xs text-slate-400 font-mono">QR Desk Scan</span>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Desk Detail Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 overflow-hidden relative">
          {/* Status Header Stripe */}
          <div
            className={`absolute top-0 left-0 right-0 h-2 ${
              isAvailable ? "bg-emerald-500" : isMySeat ? "bg-blue-600" : "bg-red-500"
            }`}
          />

          <div className="flex items-start justify-between mb-4 mt-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {desk.floorName}
              </span>
              <h1 className="text-3xl font-black text-slate-900 font-mono mt-0.5">
                Desk {desk.id}
              </h1>
            </div>

            <div
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isAvailable
                  ? "bg-emerald-100 text-emerald-800"
                  : isMySeat
                  ? "bg-blue-100 text-blue-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAvailable ? "bg-emerald-500" : isMySeat ? "bg-blue-600" : "bg-red-500"
                }`}
              />
              <span>{isAvailable ? "Available" : isMySeat ? "Your Seat" : "Occupied"}</span>
            </div>
          </div>

          {/* Desk Amenities Pills */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs">
              <DeskIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Seat #{desk.seatNumber}</span>
            </div>
            {desk.hasSocket && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                <PlugIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Power Socket</span>
              </div>
            )}
            {desk.nearWindow && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium">
                <WindowIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>Window View</span>
              </div>
            )}
          </div>

          {/* Case 1: Desk is AVAILABLE -> Check In Form */}
          {isAvailable && (
            <form onSubmit={handleCheckIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Student ID / Roll Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2024-CS-042"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expected Study Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[60, 120, 180].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        durationMinutes === mins
                          ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {mins / 60} Hour{mins > 60 ? "s" : ""}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  ⏱️ Auto-release timer frees the seat if not extended.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckIcon className="w-4 h-4" />
                <span>{submitting ? "Checking In..." : "Check In to This Desk"}</span>
              </button>
            </form>
          )}

          {/* Case 2: Desk is OCCUPIED by CURRENT STUDENT */}
          {!isAvailable && isMySeat && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm mb-1">
                  <ClockIcon className="w-4 h-4 text-blue-600" />
                  <span>Time Remaining: {minutesLeft} minutes</span>
                </div>
                <p className="text-xs text-blue-700">
                  Checked in by you ({desk.occupiedBy?.studentName || studentId}).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExtend}
                  disabled={submitting}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  +1 Hour Extension
                </button>

                <button
                  type="button"
                  onClick={handleCheckOut}
                  disabled={submitting}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOutIcon className="w-3.5 h-3.5" />
                  <span>Check Out Now</span>
                </button>
              </div>
            </div>
          )}

          {/* Case 3: Desk is OCCUPIED by SOMEONE ELSE */}
          {!isAvailable && !isMySeat && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center">
                <ClockIcon className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-sm">Desk is Currently Occupied</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reserved by <span className="font-medium text-slate-700">{desk.occupiedBy?.studentName}</span>
                </p>
                <div className="inline-block mt-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                  Approx. {minutesLeft} minutes remaining
                </div>
              </div>

              <Link
                href="/"
                className="w-full block text-center py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                Find an Available Desk on Floor {desk.floor}
              </Link>
            </div>
          )}
        </div>

        {/* Bottom helper tip */}
        <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
          <QrCodeIcon className="w-3.5 h-3.5" />
          <span>Laminated QR stickers are located at the front edge of each table.</span>
        </p>
      </div>
    </div>
  );
}
