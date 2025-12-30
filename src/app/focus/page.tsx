"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  ArrowLeft, Play, Pause, RotateCcw, 
  Volume2, VolumeX, ListTodo, Plus, Trash2, 
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function FocusPage() {
  const router = useRouter();
  
  // --- TIMER STATE ---
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");

  // --- TASKS/GOALS STATE ---
  const [tasks, setTasks] = useState<{id: string, text: string, done: boolean}[]>([]);
  const [inputValue, setInputValue] = useState("");

  // --- AUDIO STATE ---
  const [isMuted, setIsMuted] = useState(true);

  // --- REFS FOR ACCURATE TRACKING ---
  const startTimeRef = useRef<number | null>(null);

  // 1. Fetch existing goals on load
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('study_sessions')
          .select('goals')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.goals) setTasks(data.goals);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    loadSessionData();
  }, []);

  // 2. The Sync Function (Skips if in Break Mode)
  const syncWithDatabase = useCallback(async (additionalSeconds: number = 0, currentTasks = tasks) => {
    // Check checkpoint: Don't save study time if user is on break
    if (mode === "break" && additionalSeconds > 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentEntry } = await supabase
        .from('study_sessions')
        .select('duration_seconds')
        .eq('user_id', user.id)
        .maybeSingle();

      const newTotalSeconds = (currentEntry?.duration_seconds || 0) + additionalSeconds;

      const { error } = await supabase.from('study_sessions').upsert({
        user_id: user.id,
        duration_seconds: newTotalSeconds,
        goals: currentTasks, 
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;
      console.log(additionalSeconds > 0 ? `Study time synced: ${newTotalSeconds}s` : "Goals saved ✨");
    } catch (err) {
      console.error("Sync Error:", err);
    }
  }, [tasks, mode]);

  // 3. Helper to calculate elapsed time
  const handlePauseAndSave = useCallback(() => {
    if (startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (elapsed > 0) {
        syncWithDatabase(elapsed);
      }
      startTimeRef.current = null;
    }
  }, [syncWithDatabase]);

  // Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          handlePauseAndSave(); 
          setIsActive(false);
          if (mode === "work") {
            setMode("break");
            setMinutes(5);
          } else {
            setMode("work");
            setMinutes(25);
          }
          new Audio("/notif.mp3").play().catch(() => {});
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, minutes, mode, handlePauseAndSave]);

  const toggleTimer = () => {
    if (!isActive) {
      startTimeRef.current = Date.now();
      setIsActive(true);
    } else {
      setIsActive(false);
      handlePauseAndSave();
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    startTimeRef.current = null;
    setMinutes(mode === "work" ? 25 : 5);
    setSeconds(0);
  };

  // --- GOAL ACTIONS WITH IMMEDIATE SYNC ---
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const newTasks = [...tasks, { id: Date.now().toString(), text: inputValue, done: false }];
    setTasks(newTasks);
    setInputValue("");
    syncWithDatabase(0, newTasks); // Immediate sync for goals
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    syncWithDatabase(0, updated); // Immediate sync for goal status
  };

  const deleteTask = (id: string) => {
    const filtered = tasks.filter(t => t.id !== id);
    setTasks(filtered);
    syncWithDatabase(0, filtered); // Immediate sync for deletion
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6">
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#6366f1]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* TIMER */}
        <div className="flex flex-col items-center text-center">
          <button onClick={() => router.back()} className="absolute top-[-80px] left-0 flex items-center gap-2 text-white/20 hover:text-white transition-all group">
            <ArrowLeft size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Exit Focus</span>
          </button>

          <div className="mb-8 flex p-1 bg-white/5 rounded-2xl border border-white/5">
            <button onClick={() => { setMode("work"); setMinutes(25); setSeconds(0); setIsActive(false); }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === "work" ? "bg-[#6366f1] text-white" : "text-white/40 hover:text-white"}`}>
              Deep Work
            </button>
            <button onClick={() => { setMode("break"); setMinutes(5); setSeconds(0); setIsActive(false); }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === "break" ? "bg-[#6366f1] text-white" : "text-white/40 hover:text-white"}`}>
              Short Break
            </button>
          </div>

          <motion.div key={mode} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <h1 className="text-[120px] md:text-[180px] font-black italic tracking-tighter leading-none flex items-center select-none">
              {String(minutes).padStart(2, '0')}<span className="animate-pulse opacity-20 text-[#6366f1]">:</span>{String(seconds).padStart(2, '0')}
            </h1>
            <p className="text-[#6366f1] font-black uppercase tracking-[0.5em] text-xs mb-8 opacity-60 italic">
              {mode === "work" ? "Stay Locked In" : "Recharge Brain"}
            </p>
          </motion.div>

          <div className="flex items-center gap-4">
            <button onClick={toggleTimer} className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl">
              {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={resetTimer} className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* GOALS */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-8 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[#6366f1]/20 rounded-xl text-[#6366f1]"><ListTodo size={20} /></div>
            <h2 className="text-xl font-black tracking-tighter uppercase italic">Session Goals</h2>
          </div>

          <form onSubmit={addTask} className="relative mb-6">
            <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="What are we finishing?" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm outline-none font-bold" />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#6366f1] rounded-xl hover:scale-105 transition-all">
              <Plus size={20} />
            </button>
          </form>

          <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
            <AnimatePresence>
              {tasks.map((task) => (
                <motion.div key={task.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`group flex items-center justify-between p-4 rounded-2xl border ${task.done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleTask(task.id)}>
                    <CheckCircle2 size={24} className={task.done ? "text-emerald-500" : "text-white/10"} />
                    <span className={`text-sm font-bold ${task.done ? 'line-through opacity-30' : 'text-white/80'}`}>{task.text}</span>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="fixed bottom-10 flex items-center gap-6 px-8 py-4 bg-white/[0.02] border border-white/10 rounded-full backdrop-blur-xl">
        <button onClick={() => setIsMuted(!isMuted)} className={`flex items-center gap-2 transition-all ${isMuted ? 'text-white/20' : 'text-[#6366f1]'}`}>
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span className="text-[10px] font-black uppercase tracking-widest">Lo-fi Static</span>
        </button>
      </div>

      {!isMuted && (
        <iframe width="0" height="0" src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&loop=1" allow="autoplay" className="hidden" />
      )}
    </div>
  );
}