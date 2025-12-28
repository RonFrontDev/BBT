"use client";

import React, { useState, useMemo, useEffect } from "react";
import { EntryModal } from "./entrymodal";
import { createClient } from "@/lib/supabase/client";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface TimeEntry {
  id: string;
  description: string;
  durationMinutes: number;
  categoryId?: string;
}

export interface Entries {
  [date: string]: TimeEntry[];
}

export interface FlatTimeEntry extends TimeEntry {
  date: string;
}

// ==========================================
// 2. SERVICES (DB, API, EXPORT)
// ==========================================

// --- DATABASE SERVICE (Supabase) ---
// Replace IndexedDB with Supabase-only persistence. All data is stored in
// the `time_tracker` table and categories live in `categories` table.

const supabaseGetEntries = async (): Promise<FlatTimeEntry[]> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("time_tracker").select("*");
    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>)
      .map((row) => {
        const rawDate = row.date ?? row.created_at ?? "";
        const name = String(row.name ?? row.description ?? "Imported");
        const mins = Number(row.min ?? row.minutes ?? 0);
        const categoriesVal =
          row.categories ?? row.category_id ?? row.categoryId;
        return {
          id: String(row.id),
          date: normalizeSheetDate(rawDate),
          description: name,
          durationMinutes: Number.isNaN(mins) ? 0 : Math.round(mins),
          categoryId: categoriesVal ? String(categoriesVal) : undefined,
        } as FlatTimeEntry;
      })
      .filter((e) => e.durationMinutes > 0);
  } catch {
    return [];
  }
};

const supabaseSaveEntry = async (entry: FlatTimeEntry): Promise<void> => {
  const supabase = createClient();
  // Try to include the authenticated user's id so RLS policies that require
  // ownership (user_id = auth.uid()) will succeed for logged-in users.
  let user_id: string | null = null;
  try {
    // supabase.auth.getUser() returns { data: { user } }
    // If the user is not signed in this will be null and we send null.
    // This requires the client SDK (browser) to have an active session.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userResp: any = await supabase.auth.getUser();
    user_id = userResp?.data?.user?.id ?? null;
  } catch {
    user_id = null;
  }

  const payload = {
    id: entry.id,
    date: entry.date,
    name: entry.description,
    min: Number(entry.durationMinutes),
    categories: entry.categoryId ?? null,
    user_id,
  };
  const { error } = await supabase.from("time_tracker").upsert([payload]);
  if (error) {
    // Normalize Supabase error into a real Error with a message so callers
    // can display useful text instead of an empty object.
    const msg = error
      ? String(
          error.message ?? error.details ?? error.hint ?? JSON.stringify(error)
        )
      : "Unknown error";
    throw new Error(msg);
  }
};

const supabaseDeleteEntry = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from("time_tracker").delete().eq("id", id);
  if (error) {
    const msg = error
      ? String(
          error.message ?? error.details ?? error.hint ?? JSON.stringify(error)
        )
      : "Unknown error";
    throw new Error(msg);
  }
};

const supabaseGetCategories = async (): Promise<Category[]> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("categories").select("*");
    if (error) return INITIAL_CATEGORIES;
    if (!data || data.length === 0) {
      // Seed initial categories into Supabase
      await supabase.from("categories").insert(INITIAL_CATEGORIES);
      return INITIAL_CATEGORIES;
    }
    return (data as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      color: String(r.color),
    }));
  } catch {
    return INITIAL_CATEGORIES;
  }
};

// Initial default categories used when DB is empty
const INITIAL_CATEGORIES: Category[] = [
  { id: "1", name: "Kundemøde", color: "#3b82f6" },
  { id: "2", name: "Telefontid", color: "#16a34a" },
  { id: "3", name: "Onboarding", color: "#f97316" },
];

// --- GEMINI SERVICE ---
// AI analysis (Gemini) removed — button and modal were requested to be removed.
// If you want the feature re-added later, I can restore a guarded dynamic import and UI.

// --- SHEET SYNC SERVICE ---
const normalizeSheetDate = (rawDate: unknown): string => {
  const today = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  if (!rawDate) return iso(today);
  const num = Number(rawDate);
  if (!isNaN(num) && num > 30000 && num < 60000)
    return iso(new Date((num - 25569) * 86400 * 1000));
  const str = String(rawDate).trim();
  const euro = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (euro) {
    const [, d, m, yRaw] = euro as string[];
    let y = yRaw;
    if (y.length === 2) y = "20" + y;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const standard = str.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (standard)
    return `${standard[1]}-${standard[2].padStart(
      2,
      "0"
    )}-${standard[3].padStart(2, "0")}`;
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? iso(today) : iso(parsed);
};

// remove old fetchSupabaseEntries - supabaseGetEntries covers this behavior

// --- CSV EXPORTER ---
const exportToCSV = (entries: Entries, categories: Category[]) => {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const rows = [["Date", "Category", "Description", "Hours"]];
  Object.entries(entries).forEach(([date, dayEntries]) => {
    dayEntries.forEach((e) => {
      rows.push([
        date,
        e.categoryId ? (catMap.get(e.categoryId) as string) || "" : "",
        `"${e.description.replace(/"/g, '""')}"`,
        (e.durationMinutes / 60).toFixed(2),
      ]);
    });
  });
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `time-export-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
};

// ==========================================
// 3. ICONS
// ==========================================

const ChevronLeft = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
);
const ChevronRight = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);
const PlusIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || "w-5 h-5"}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);
// (Removed unused icons to satisfy linter)

// ==========================================
// 4. MAIN APP COMPONENT
// ==========================================

export default function TrackerApp() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [entries, setEntries] = useState<Entries>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // moved initial categories to module scope (INITIAL_CATEGORIES)

  useEffect(() => {
    const load = async () => {
      // Load categories and entries from Supabase
      const cats = await supabaseGetCategories();
      setCategories(cats);
      const dbEntries = await supabaseGetEntries();
      const map: Entries = {};
      dbEntries.forEach((e: FlatTimeEntry) => {
        if (!map[e.date]) map[e.date] = [];
        map[e.date].push(e);
      });
      setEntries(map);
      // set dates on the client only to avoid nondeterministic server rendering
      const now = new Date();
      setCurrentDate(now);
      setSelectedDate(now);
      setIsLoading(false);
    };
    load();
  }, []);

  const dateKey = useMemo(() => {
    if (!selectedDate) return "";
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const handleSave = async (data: {
    id?: string;
    description: string;
    durationMinutes: number;
    categoryId?: string;
  }) => {
    const newEntry = {
      ...data,
      date: dateKey,
      id: data.id || Date.now().toString(),
    } as FlatTimeEntry;
    try {
      await supabaseSaveEntry(newEntry);
      // Refresh entries from Supabase to ensure consistency
      const latest = await supabaseGetEntries();
      const map: Entries = {};
      latest.forEach((e) => {
        if (!map[e.date]) map[e.date] = [];
        map[e.date].push(e);
      });
      setEntries(map);
      setIsModalOpen(false);
      setEditingEntry(null);
    } catch (err: any) {
      // Common cause: missing NEXT_PUBLIC_SUPABASE_* env vars or RLS blocking the insert.
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object"
          ? JSON.stringify(err)
          : String(err);
      console.error("Failed to save entry:", msg);
      // Show a simple alert so the user notices; can be replaced with nicer UI later.
      window.alert(
        `Failed to save entry: ${msg}\n\nCheck Supabase keys, RLS policies, and that you are signed in.`
      );
    }
  };

  const handleDelete = async (id: string) => {
    await supabaseDeleteEntry(id);
    // Refresh entries
    const latestAfterDelete = await supabaseGetEntries();
    const mapAfterDel: Entries = {};
    latestAfterDelete.forEach((e) => {
      if (!mapAfterDel[e.date]) mapAfterDel[e.date] = [];
      mapAfterDel[e.date].push(e);
    });
    setEntries(mapAfterDel);
  };

  const handleSync = async () => {
    const fetched = await supabaseGetEntries();
    const newMap: Entries = {};
    for (const e of fetched) {
      if (!newMap[e.date]) newMap[e.date] = [];
      newMap[e.date].push(e);
    }
    setEntries(newMap);
  };

  // AI analysis removed — handler removed along with UI.

  if (isLoading || !currentDate || !selectedDate)
    return <div className="p-20 text-center">Loading Tracker...</div>;

  const dayEntries = entries[dateKey] || [];
  const totalMinutes = dayEntries.reduce((s, e) => s + e.durationMinutes, 0);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 bg-slate-50 min-h-screen text-slate-800">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-black text-indigo-700">TRACKER</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(entries, categories)}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold hover:bg-green-200 transition"
          >
            Export
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Side */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              {currentDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() - 1,
                      1
                    )
                  )
                }
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ChevronLeft />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm font-bold border border-slate-200 rounded-lg"
              >
                Today
              </button>
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() + 1,
                      1
                    )
                  )
                }
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ChevronRight />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-bold text-slate-400 py-2"
              >
                {d}
              </div>
            ))}
            {/* Empty start slots */}
            {Array.from({
              length:
                (new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  1
                ).getDay() +
                  6) %
                7,
            }).map((_, i) => (
              <div key={i} />
            ))}
            {/* Days */}
            {Array.from({
              length: new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                0
              ).getDate(),
            }).map((_, i) => {
              const d = i + 1;
              const isSel =
                selectedDate.getDate() === d &&
                selectedDate.getMonth() === currentDate.getMonth() &&
                selectedDate.getFullYear() === currentDate.getFullYear();
              const hasData =
                entries[
                  `${currentDate.getFullYear()}-${String(
                    currentDate.getMonth() + 1
                  ).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                ]?.length > 0;
              return (
                <button
                  key={d}
                  onClick={() =>
                    setSelectedDate(
                      new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        d
                      )
                    )
                  }
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all ${
                    isSel
                      ? "bg-indigo-600 text-white font-bold scale-105 shadow-lg"
                      : "hover:bg-indigo-50 text-slate-600"
                  }`}
                >
                  <span>{d}</span>
                  {hasData && (
                    <div
                      className={`w-1 h-1 mt-1 rounded-full ${
                        isSel ? "bg-white" : "bg-green-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase">
                Today
              </p>
              <p className="text-2xl font-black text-slate-700">
                {(totalMinutes / 60).toFixed(1)}{" "}
                <span className="text-sm font-normal">hours</span>
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase">
                This Month
              </p>
              <p className="text-2xl font-black text-slate-700">
                {(
                  Object.entries(entries).reduce((sum, [date, list]) => {
                    const d = new Date(date);
                    return d.getMonth() === currentDate.getMonth() &&
                      d.getFullYear() === currentDate.getFullYear()
                      ? sum + list.reduce((s, e) => s + e.durationMinutes, 0)
                      : sum;
                  }, 0) / 60
                ).toFixed(1)}{" "}
                <span className="text-sm font-normal">hours</span>
              </p>
            </div>
          </div>
        </div>

        {/* List Side */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-indigo-700">
              {selectedDate.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </h3>
            <button
              onClick={() => {
                setEditingEntry(null);
                setIsModalOpen(true);
              }}
              className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition shadow-md"
            >
              <PlusIcon />
            </button>
          </div>

          <div className="space-y-3">
            {dayEntries.length > 0 ? (
              dayEntries.map((e) => (
                <div
                  key={e.id}
                  className="group flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 transition border border-transparent hover:border-indigo-100"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      setEditingEntry(e);
                      setIsModalOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            categories.find((c) => c.id === e.categoryId)
                              ?.color || "#cbd5e1",
                        }}
                      />
                      <p className="font-bold text-slate-700">
                        {e.description}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400">
                      {Math.floor(e.durationMinutes / 60)}h{" "}
                      {e.durationMinutes % 60}m
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-300 italic">
                No entries for this day
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Entry Modal */}
      {isModalOpen && (
        <EntryModal
          date={selectedDate}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          categories={categories}
          entry={editingEntry}
        />
      )}

      {/* AI analysis UI removed */}
    </div>
  );
}
