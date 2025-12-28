import { CircleStopIcon, PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TimeEntry, Category } from "@/lib/types";

type SavePayload = {
  id?: string;
  description: string;
  durationMinutes: number;
  categoryId?: string;
};

export function EntryModal({
  date,
  onClose,
  onSave,
  categories,
  entry,
}: {
  date: Date;
  onClose: () => void;
  onSave: (d: SavePayload) => void;
  categories: Category[];
  entry?: TimeEntry | null;
}) {
  const [desc, setDesc] = useState(entry?.description || "");
  const [h, setH] = useState(
    entry ? Math.floor(entry.durationMinutes / 60) : 0
  );
  const [m, setM] = useState(entry ? entry.durationMinutes % 60 : 0);
  const [catId, setCatId] = useState(entry?.categoryId || categories[0]?.id);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => setTimer((t) => t + 1), 1000);
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const stopTimer = () => {
    setIsRunning(false);
    const total = Math.round(timer / 60);
    setH(Math.floor(total / 60));
    setM(total % 60);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black text-indigo-700 mb-2">
          {entry ? "Edit Entry" : "Log Time"}
        </h2>
        <p className="text-sm text-slate-400 mb-6">{date.toDateString()}</p>

        <div className="mb-6 p-6 bg-indigo-50 rounded-2xl text-center border border-indigo-100">
          <p className="text-4xl font-black text-indigo-600 mb-4">
            {Math.floor(timer / 3600)
              .toString()
              .padStart(2, "0")}
            :
            {Math.floor((timer % 3600) / 60)
              .toString()
              .padStart(2, "0")}
            :{String(timer % 60).padStart(2, "0")}
          </p>
          <button
            onClick={isRunning ? stopTimer : () => setIsRunning(true)}
            className={`w-full py-3 rounded-xl font-black flex items-center justify-center gap-2 transition ${
              isRunning ? "bg-red-500 text-white" : "bg-indigo-600 text-white"
            }`}
          >
            {isRunning ? (
              <>
                <CircleStopIcon /> Stop
              </>
            ) : (
              <>
                <PlayIcon /> Start Timer
              </>
            )}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
              Description
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What did you do?"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
              Category
            </label>
            <select
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                Hours
              </label>
              <input
                type="number"
                value={h}
                onChange={(e) => setH(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                Minutes
              </label>
              <input
                type="number"
                value={m}
                onChange={(e) => setM(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-8">
          <button onClick={onClose} className="py-3 font-bold text-slate-400">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                id: entry?.id,
                description: desc,
                durationMinutes: h * 60 + m,
                categoryId: catId,
              })
            }
            className="py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
          >
            Save Entry
          </button>
        </div>
      </div>
    </div>
  );
}
