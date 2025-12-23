"use client";
import { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, RotateCcw, Timer, X, Coffee, 
  Trophy, Target, Loader2, Sparkles 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface StudyTimerProps {
  isLargeMode?: boolean;
}

export default function StudyTimer({ isLargeMode = false }: StudyTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ":" : ""}${mins < 10 ? "0" + mins : mins}:${secs < 10 ? "0" + secs : secs}`;
  };

  const handleStop = async () => {
    setIsActive(false);
    setIsFocusMode(false);

    if (time > 10) {
      setIsSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('study_sessions')
            .insert([{ user_id: user.id, duration_seconds: time }]);
          if (error) throw error;
        }
      } catch (error) {
        console.error("Error saving session:", error);
      } finally {
        setIsSaving(false);
        setShowSummary(true);
      }
    } else if (time > 0) {
      setShowSummary(true);
    }
  };

  const reset = () => {
    setTime(0);
    setShowSummary(false);
    setIsActive(false);
  };

  // --- RENDER LOGIC FOR LARGE MODE (DEDICATED PAGE) ---
  if (isLargeMode) {
    return (
      <div className="flex flex-col items-center">
        <AnimatePresence mode="wait">
          {showSummary ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <Trophy size={80} className="mx-auto text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              <h3 className="text-3xl font-black italic uppercase">Session Logged</h3>
              <p className="text-white/40 max-w-xs mx-auto uppercase text-[10px] tracking-widest font-bold">
                {time < 10 ? "Session was too short to record." : `Total Focus Time: ${formatTime(time)}`}
              </p>
              <button onClick={reset} className="px-8 py-3 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">
                Restart Protocol
              </button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="relative mb-12">
                <h2 className="text-[12rem] font-black italic tracking-tighter tabular-nums leading-none bg-gradient-to-b from-white to-white/20 bg-clip-text text-transparent">
                  {formatTime(time)}
                </h2>
                {isActive && (
                  <motion.div 
                    animate={{ opacity: [0.3, 1, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-blue-400"
                  >
                    <Sparkles size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Recording...</span>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center justify-center gap-6">
                {!isActive ? (
                  <button onClick={() => setIsActive(true)} className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-600/20">
                    <Play size={32} fill="white" />
                  </button>
                ) : (
                  <button onClick={handleStop} disabled={isSaving} className="w-24 h-24 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500/20 transition-all">
                    {isSaving ? <Loader2 className="animate-spin" /> : <Pause size={32} fill="currentColor" />}
                  </button>
                )}
                <button onClick={reset} className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white">
                  <RotateCcw size={24} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // --- RENDER LOGIC FOR FLOATING WIDGET (GLOBAL) ---
  return (
    <>
      <AnimatePresence>
        {isFocusMode && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center"
          >
            <div className="text-center">
              <p className="text-blue-500 font-black tracking-[0.5em] uppercase mb-4 text-xs">Deep Focus Mode</p>
              <h2 className="text-9xl font-black text-white tabular-nums italic tracking-tighter">{formatTime(time)}</h2>
              <button onClick={() => setIsFocusMode(false)} className="mt-12 text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest border border-white/10 px-6 py-2 rounded-full transition-all">
                Exit Focus
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 left-8 z-[70] w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center"
      >
        <Timer size={28} />
        {isActive && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-pulse border-2 border-[#050505]" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 left-8 z-[70] w-80 bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Session Control</span>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors opacity-40 hover:opacity-100">
                <X size={18} />
              </button>
            </div>

            {showSummary ? (
              <div className="text-center py-4">
                <Trophy size={40} className="mx-auto text-amber-500 mb-4" />
                <h3 className="font-black italic uppercase text-lg mb-1">Session Saved</h3>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-6">Excellent Progress</p>
                <button onClick={reset} className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]">Start New</button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-6xl font-black italic tracking-tighter tabular-nums">{formatTime(time)}</h2>
                </div>
                <div className="flex gap-3">
                  {!isActive ? (
                    <button onClick={() => setIsActive(true)} className="flex-grow flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                      <Play size={14} fill="white" /> Start
                    </button>
                  ) : (
                    <button onClick={handleStop} disabled={isSaving} className="flex-grow flex items-center justify-center gap-2 bg-red-500/10 text-red-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-500/20">
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : "Stop Session"}
                    </button>
                  )}
                  <button onClick={() => setIsFocusMode(true)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <Target size={20} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}