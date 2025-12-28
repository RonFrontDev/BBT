'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

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

// --- DATABASE SERVICE (IndexedDB) ---
const DB_NAME = 'BookingBoardDB';
const DB_VERSION = 1;
const ENTRIES_STORE = 'entries';
const CATEGORIES_STORE = 'categories';

const db = {
open: (): Promise<IDBDatabase> => {
return new Promise((resolve, reject) => {
if (typeof window === 'undefined') return;
const request = indexedDB.open(DB_NAME, DB_VERSION);
request.onupgradeneeded = (event) => {
const database = (event.target as IDBOpenDBRequest).result;
if (!database.objectStoreNames.contains(ENTRIES_STORE)) {
const store = database.createObjectStore(ENTRIES_STORE, { keyPath: 'id' });
store.createIndex('date', 'date', { unique: false });
}
if (!database.objectStoreNames.contains(CATEGORIES_STORE)) {
database.createObjectStore(CATEGORIES_STORE, { keyPath: 'id' });
}
};
request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
});
},
getAllEntries: async (): Promise<FlatTimeEntry[]> => {
const database = await db.open();
return new Promise((resolve, reject) => {
const transaction = database.transaction([ENTRIES_STORE], 'readonly');
const store = transaction.objectStore(ENTRIES_STORE);
const request = store.getAll();
request.onsuccess = () => resolve(request.result as FlatTimeEntry[]);
request.onerror = () => reject(request.error);
});
},
saveEntry: async (entry: FlatTimeEntry): Promise<void> => {
const database = await db.open();
return new Promise((resolve, reject) => {
const transaction = database.transaction([ENTRIES_STORE], 'readwrite');
const store = transaction.objectStore(ENTRIES_STORE);
const request = store.put(entry);
request.onsuccess = () => resolve();
request.onerror = () => reject(request.error);
});
},
deleteEntry: async (id: string): Promise<void> => {
const database = await db.open();
return new Promise((resolve, reject) => {
const transaction = database.transaction([ENTRIES_STORE], 'readwrite');
const store = transaction.objectStore(ENTRIES_STORE);
const request = store.delete(id);
request.onsuccess = () => resolve();
request.onerror = () => reject(request.error);
});
},
getAllCategories: async (): Promise<Category[]> => {
const database = await db.open();
return new Promise((resolve, reject) => {
const transaction = database.transaction([CATEGORIES_STORE], 'readonly');
const store = transaction.objectStore(CATEGORIES_STORE);
const request = store.getAll();
request.onsuccess = () => resolve(request.result as Category[]);
request.onerror = () => reject(request.error);
});
},
saveCategory: async (category: Category): Promise<void> => {
const database = await db.open();
return new Promise((resolve, reject) => {
const transaction = database.transaction([CATEGORIES_STORE], 'readwrite');
const store = transaction.objectStore(CATEGORIES_STORE);
const request = store.put(category);
request.onsuccess = () => resolve();
request.onerror = () => reject(request.error);
});
},
deleteCategory: async (id: string): Promise<void> => {
const database = await db.open();
return new Promise((resolve, reject) => {
const transaction = database.transaction([CATEGORIES_STORE], 'readwrite');
const store = transaction.objectStore(CATEGORIES_STORE);
const request = store.delete(id);
request.onsuccess = () => resolve();
request.onerror = () => reject(request.error);
});
},
initCategories: async (categories: Category[]): Promise<void> => {
const database = await db.open();
return new Promise((resolve, reject) => {
const transaction = database.transaction([CATEGORIES_STORE], 'readwrite');
const store = transaction.objectStore(CATEGORIES_STORE);
const countRequest = store.count();
countRequest.onsuccess = () => {
if (countRequest.result === 0) {
categories.forEach(cat => store.put(cat));
transaction.oncomplete = () => resolve();
} else resolve();
};
countRequest.onerror = () => reject(countRequest.error);
});
}
};

// --- GEMINI SERVICE ---
const analyzeWithGemini = async (entriesData: Entries, categories: Category[]): Promise<string> => {
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
const flattened = Object.entries(entriesData).flatMap(([date, dateEntries]) =>
dateEntries.map(entry => ({
date,
...entry,
cat: entry.categoryId ? categoryMap.get(entry.categoryId) : 'Uncategorized'
}))
);
if (flattened.length === 0) return "No entries to analyze.";
const list = flattened.map(e => `- ${e.date}, ${e.cat}, ${e.description}, ${(e.durationMinutes/60).toFixed(2)}h`).join('\n');
const prompt = `# Time Analysis Request\nAnalyze these entries:\n${list}\n\nGroup by category, show total hours, and give productivity insights in Markdown.`;
try {
const response = await ai.models.generateContent({
model: "gemini-3-flash-preview",
contents: prompt,
});
return response.text ?? "Error generating analysis.";
} catch (e) {
return "Gemini Error: " + String(e);
}
};

// --- SHEET SYNC SERVICE ---
const normalizeSheetDate = (rawDate: any): string => {
const today = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
if (!rawDate) return iso(today);
const num = Number(rawDate);
if (!isNaN(num) && num > 30000 && num < 60000) return iso(new Date((num - 25569) _ 86400 _ 1000));
const str = String(rawDate).trim();
const euro = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (euro) {
        let [_, d, m, y] = euro;
        if (y.length === 2) y = '20' + y;
        return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    const standard = str.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (standard) return `${standard[1]}-${standard[2].padStart(2,'0')}-${standard[3].padStart(2,'0')}`;
const parsed = new Date(str);
return isNaN(parsed.getTime()) ? iso(today) : iso(parsed);
};

const fetchSheetEntries = async (categories: Category[]): Promise<FlatTimeEntry[]> => {
const SHEETDB_URL = 'https://sheetdb.io/api/v1/0gk9td6xjzv9s';
try {
const res = await fetch(SHEETDB_URL);
const data = await res.json();
return data.map((row: any) => {
const keys = Object.keys(row);
const dateKey = keys.find(k => ['date','dato','timestamp','tid'].includes(k.toLowerCase()));
const type = row.type || '';
const desc = row.name && type ? `${row.name} (${type})` : (row.name || type || 'Imported');
const cat = categories.find(c => c.name.toLowerCase().includes(type.toLowerCase()));
return {
id: row.id ? `sheet-${row.id}` : `sheet-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
date: normalizeSheetDate(row[dateKey || '']),
description: desc,
durationMinutes: parseInt(row.min || row.minutes || '0', 10),
categoryId: cat?.id
};
}).filter((e: any) => e.durationMinutes > 0);
} catch (e) { return []; }
};

// --- CSV EXPORTER ---
const exportToCSV = (entries: Entries, categories: Category[]) => {
const catMap = new Map(categories.map(c => [c.id, c.name]));
const rows = [['Date', 'Category', 'Description', 'Hours']];
Object.entries(entries).forEach(([date, dayEntries]) => {
dayEntries.forEach(e => {
rows.push([date, e.categoryId ? catMap.get(e.categoryId) || '' : '', `"${e.description.replace(/"/g, '""')}"`, (e.durationMinutes/60).toFixed(2)]);
});
});
const csv = rows.map(r => r.join(',')).join('\n');
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `time-export-${new Date().toISOString().split('T')[0]}.csv`;
a.click();
};

// ==========================================
// 3. ICONS
// ==========================================

const ChevronLeft = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronRight = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const ChevronDown = ({ className }: {className?: string}) => <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const PlusIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const TrashIcon = ({ className }: {className?: string}) => <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PlayIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;
const StopIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>;

// ==========================================
// 4. MAIN APP COMPONENT
// ==========================================

export default function TrackerApp() {
const [currentDate, setCurrentDate] = useState(new Date());
const [selectedDate, setSelectedDate] = useState<Date>(new Date());
const [entries, setEntries] = useState<Entries>({});
const [categories, setCategories] = useState<Category[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [isModalOpen, setIsModalOpen] = useState(false);
const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
const [isCatModalOpen, setIsCatModalOpen] = useState(false);
const [isOverviewOpen, setIsOverviewOpen] = useState(false);
const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
const [isSyncing, setIsSyncing] = useState(false);
const [analysisResult, setAnalysisResult] = useState('');
const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    const initialCats: Category[] = [
        { id: '1', name: 'Kundemøde', color: '#3b82f6' },
        { id: '2', name: 'Telefontid', color: '#16a34a' },
        { id: '3', name: 'Onboarding', color: '#f97316' },
    ];

    useEffect(() => {
        const load = async () => {
            await db.initCategories(initialCats);
            const cats = await db.getAllCategories();
            setCategories(cats);
            const dbEntries = await db.getAllEntries();
            const map: Entries = {};
            dbEntries.forEach(e => {
                if (!map[e.date]) map[e.date] = [];
                map[e.date].push(e);
            });
            setEntries(map);
            setIsLoading(false);
        };
        load();
    }, []);

    const dateKey = useMemo(() => {
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth()+1).padStart(2,'0');
        const d = String(selectedDate.getDate()).padStart(2,'0');
        return `${y}-${m}-${d}`;
    }, [selectedDate]);

    const handleSave = async (data: any) => {
        const newEntry = { ...data, date: dateKey, id: data.id || Date.now().toString() };
        await db.saveEntry(newEntry);
        setEntries(prev => {
            const list = prev[dateKey] || [];
            const index = list.findIndex(e => e.id === newEntry.id);
            const newList = index > -1 ? list.map(e => e.id === newEntry.id ? newEntry : e) : [...list, newEntry];
            return { ...prev, [dateKey]: newList };
        });
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const handleDelete = async (id: string) => {
        await db.deleteEntry(id);
        setEntries(prev => ({ ...prev, [dateKey]: (prev[dateKey] || []).filter(e => e.id !== id) }));
    };

    const handleSync = async () => {
        setIsSyncing(true);
        const fetched = await fetchSheetEntries(categories);
        const newMap = { ...entries };
        for (const e of fetched) {
            await db.saveEntry(e);
            if (!newMap[e.date]) newMap[e.date] = [];
            if (!newMap[e.date].find(x => x.id === e.id)) newMap[e.date].push(e);
        }
        setEntries(newMap);
        setIsSyncing(false);
    };

    const handleAnalyze = async () => {
        setIsAnalysisOpen(true);
        setAnalysisResult("Analyzing...");
        const res = await analyzeWithGemini(entries, categories);
        setAnalysisResult(res);
    };

    if (isLoading) return <div className="p-20 text-center">Loading Tracker...</div>;

    const dayEntries = entries[dateKey] || [];
    const totalMinutes = dayEntries.reduce((s, e) => s + e.durationMinutes, 0);

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 bg-slate-50 min-h-screen text-slate-800">
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between mb-8 gap-4">
                <h1 className="text-3xl font-black text-indigo-700">TRACKER</h1>
                <div className="flex gap-2">
                    <button onClick={handleSync} className="px-4 py-2 bg-sky-100 text-sky-700 rounded-lg font-bold hover:bg-sky-200 transition">{isSyncing ? 'Syncing...' : 'Sync'}</button>
                    <button onClick={handleAnalyze} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-bold hover:bg-purple-200 transition">AI Analysis</button>
                    <button onClick={() => exportToCSV(entries, categories)} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold hover:bg-green-200 transition">Export</button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar Side */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft /></button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-bold border border-slate-200 rounded-lg">Today</button>
                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>)}
                        {/* Empty start slots */}
                        {Array.from({ length: (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7 }).map((_, i) => <div key={i} />)}
                        {/* Days */}
                        {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0).getDate() }).map((_, i) => {
                            const d = i + 1;
                            const isSel = selectedDate.getDate() === d && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
                            const hasData = entries[`${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`]?.length > 0;
                            return (
                                <button
                                    key={d}
                                    onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), d))}
                                    className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all ${isSel ? 'bg-indigo-600 text-white font-bold scale-105 shadow-lg' : 'hover:bg-indigo-50 text-slate-600'}`}
                                >
                                    <span>{d}</span>
                                    {hasData && <div className={`w-1 h-1 mt-1 rounded-full ${isSel ? 'bg-white' : 'bg-green-500'}`} />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Today</p>
                            <p className="text-2xl font-black text-slate-700">{(totalMinutes/60).toFixed(1)} <span className="text-sm font-normal">hours</span></p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">This Month</p>
                            <p className="text-2xl font-black text-slate-700">
                                {(Object.entries(entries).reduce((sum, [date, list]) => {
                                    const d = new Date(date);
                                    return (d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()) ? sum + list.reduce((s, e) => s + e.durationMinutes, 0) : sum;
                                }, 0) / 60).toFixed(1)} <span className="text-sm font-normal">hours</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* List Side */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-indigo-700">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
                        <button onClick={() => {setEditingEntry(null); setIsModalOpen(true);}} className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition shadow-md"><PlusIcon /></button>
                    </div>

                    <div className="space-y-3">
                        {dayEntries.length > 0 ? dayEntries.map(e => (
                            <div key={e.id} className="group flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 transition border border-transparent hover:border-indigo-100">
                                <div className="flex-1 cursor-pointer" onClick={() => {setEditingEntry(e); setIsModalOpen(true);}}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categories.find(c => c.id === e.categoryId)?.color || '#cbd5e1' }} />
                                        <p className="font-bold text-slate-700">{e.description}</p>
                                    </div>
                                    <p className="text-xs text-slate-400">{Math.floor(e.durationMinutes/60)}h {e.durationMinutes % 60}m</p>
                                </div>
                                <button onClick={() => handleDelete(e.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        )) : (
                            <div className="py-12 text-center text-slate-300 italic">No entries for this day</div>
                        )}
                    </div>
                </div>
            </main>

            {/* Entry Modal */}
            {isModalOpen && <EntryModal date={selectedDate} onClose={() => setIsModalOpen(false)} onSave={handleSave} categories={categories} entry={editingEntry} />}

            {/* Analysis Modal */}
            {isAnalysisOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsAnalysisOpen(false)}>
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-8 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black text-indigo-700 mb-6">AI Insight</h2>
                        <div className="flex-1 overflow-y-auto prose prose-slate">
                            <pre className="whitespace-pre-wrap font-sans text-slate-600 leading-relaxed">{analysisResult}</pre>
                        </div>
                        <button onClick={() => setIsAnalysisOpen(false)} className="mt-8 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Close</button>
                    </div>
                </div>
            )}
        </div>
    );

}

// ==========================================
// 5. SUB-COMPONENTS
// ==========================================

function EntryModal({ date, onClose, onSave, categories, entry }: { date: Date, onClose: () => void, onSave: (d: any) => void, categories: Category[], entry: any }) {
const [desc, setDesc] = useState(entry?.description || '');
const [h, setH] = useState(entry ? Math.floor(entry.durationMinutes/60) : 0);
const [m, setM] = useState(entry ? entry.durationMinutes % 60 : 0);
const [catId, setCatId] = useState(entry?.categoryId || categories[0]?.id);
const [timer, setTimer] = useState(0);
const [isRunning, setIsRunning] = useState(false);
const timerRef = useRef<any>(null);

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    const stopTimer = () => {
        setIsRunning(false);
        const total = Math.round(timer / 60);
        setH(Math.floor(total / 60));
        setM(total % 60);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-black text-indigo-700 mb-2">{entry ? 'Edit Entry' : 'Log Time'}</h2>
                <p className="text-sm text-slate-400 mb-6">{date.toDateString()}</p>

                <div className="mb-6 p-6 bg-indigo-50 rounded-2xl text-center border border-indigo-100">
                    <p className="text-4xl font-black text-indigo-600 mb-4">{Math.floor(timer/3600).toString().padStart(2,'0')}:{Math.floor((timer%3600)/60).toString().padStart(2,'0')}:{String(timer%60).padStart(2,'0')}</p>
                    <button onClick={isRunning ? stopTimer : () => setIsRunning(true)} className={`w-full py-3 rounded-xl font-black flex items-center justify-center gap-2 transition ${isRunning ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'}`}>
                        {isRunning ? <><StopIcon /> Stop</> : <><PlayIcon /> Start Timer</>}
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Description</label>
                        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What did you do?" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Category</label>
                        <select value={catId} onChange={e => setCatId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Hours</label>
                            <input type="number" value={h} onChange={e => setH(Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Minutes</label>
                            <input type="number" value={m} onChange={e => setM(Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                    <button onClick={onClose} className="py-3 font-bold text-slate-400">Cancel</button>
                    <button onClick={() => onSave({ id: entry?.id, description: desc, durationMinutes: (h*60)+m, categoryId: catId })} className="py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition">Save Entry</button>
                </div>
            </div>
        </div>
    );

}
