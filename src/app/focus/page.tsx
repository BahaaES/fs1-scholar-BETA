"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  ArrowLeft, Play, Pause, RotateCcw, 
  Volume2, VolumeX, ListTodo, Plus, Trash2, 
  CheckCircle2, Sparkles, Moon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // Ensure this import exists

export default function FocusPage() {
  const router = useRouter();
  
  // --- TIMER STATE ---
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");

  // --- TASKS STATE ---
  const [tasks, setTasks] = useState<{id: string, text: string, done: boolean}[]>([]);
  const [inputValue, setInputValue] = useState("");

  // --- AUDIO STATE ---
  const [isMuted, setIsMuted] = useState(true);

  // --- NEW: DATABASE CONNECTION ---
  const logStudySession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Inserting into your 'study_sessions' table
      const { error } = await supabase.from('study_sessions').insert([
        {
          user_id: user.id,
          duration_minutes: 25, // Based on pomodoro length
          type: 'work_session',
          created_at: new Date().toISOString()
        }
      ]);

      if (error) throw error;
      console.log("Session saved to database.");
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  }, []);

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
          // --- TIMER FINISHED ---
          setIsActive(false);
          if (mode === "work") {
            logStudySession(); // <--- Connects to DB here
            setMode("break");
            setMinutes(5);
          } else {
            setMode("work");
            setMinutes(25);
          }
          // Optional sound notification
          new Audio("/notif.mp3").play().catch(() => {});
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, minutes, mode, logStudySession]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setMinutes(mode === "work" ? 25 : 5);
    setSeconds(0);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setTasks([...tasks, { id: Date.now().toString(), text: inputValue, done: false }]);
    setInputValue("");
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6">
      
      {/* BACKGROUND AMBIENCE */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#6366f1]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* LEFT: TIMER SECTION (The look you liked) */}
        <div className="flex flex-col items-center text-center">
          <button 
            onClick={() => router.back()}
            className="absolute top-[-80px] left-0 flex items-center gap-2 text-white/20 hover:text-white transition-all group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Exit Focus</span>
          </button>

          <div className="mb-8 flex p-1 bg-white/5 rounded-2xl border border-white/5">
            <button 
              onClick={() => { setMode("work"); setMinutes(25); setSeconds(0); setIsActive(false); }}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === "work" ? "bg-[#6366f1] text-white" : "text-white/40 hover:text-white"}`}
            >
              Deep Work
            </button>
            <button 
              onClick={() => { setMode("break"); setMinutes(5); setSeconds(0); setIsActive(false); }}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === "break" ? "bg-[#6366f1] text-white" : "text-white/40 hover:text-white"}`}
            >
              Short Break
            </button>
          </div>

          <motion.div key={mode} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <h1 className="text-[120px] md:text-[180px] font-black italic tracking-tighter leading-none flex items-center select-none">
              {String(minutes).padStart(2, '0')}
              <span className="animate-pulse opacity-20 text-[#6366f1]">:</span>
              {String(seconds).padStart(2, '0')}
            </h1>
            <p className="text-[#6366f1] font-black uppercase tracking-[0.5em] text-xs mb-8 opacity-60 italic">
              {mode === "work" ? "Stay Locked In" : "Recharge Brain"}
            </p>
          </motion.div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTimer}
              className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10"
            >
              {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button 
              onClick={resetTimer}
              className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* RIGHT: TASKS SECTION */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-8 backdrop-blur-md">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#6366f1]/20 rounded-xl text-[#6366f1]">
                <ListTodo size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tighter uppercase italic">Session Goals</h2>
            </div>
          </div>

          <form onSubmit={addTask} className="relative mb-6">
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="What are we finishing?"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm focus:border-[#6366f1]/50 outline-none transition-all font-bold"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#6366f1] rounded-xl hover:scale-105 transition-all">
              <Plus size={20} />
            </button>
          </form>

          <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
            <AnimatePresence initial={false}>
              {tasks.map((task) => (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${task.done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleTask(task.id)}>
                    <CheckCircle2 size={24} className={task.done ? "text-emerald-500" : "text-white/10 group-hover:text-white/30"} />
                    <span className={`text-sm font-bold ${task.done ? 'line-through opacity-30' : 'text-white/80'}`}>{task.text}</span>
                  </div>
                  <button onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all">
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-10 flex items-center gap-6 px-8 py-4 bg-white/[0.02] border border-white/10 rounded-full backdrop-blur-xl">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`flex items-center gap-2 transition-all ${isMuted ? 'text-white/20' : 'text-[#6366f1]'}`}
        >
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