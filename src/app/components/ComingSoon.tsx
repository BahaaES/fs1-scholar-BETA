"use client";
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Binary, Construction, Zap, Database } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  subtitle: string;
  progress?: number; // 0 to 100
  icon?: "quiz" | "data" | "default";
}

export default function ComingSoon({ title, subtitle, progress = 45, icon = "default" }: ComingSoonProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md w-full text-center"
      >
        {/* Animated Icon Container */}
        <div className="mb-10 relative inline-block">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-4 border border-dashed border-white/10 rounded-full"
          />
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-[2rem] border border-white/10 flex items-center justify-center text-indigo-400 shadow-2xl backdrop-blur-xl">
            {icon === "quiz" ? <Binary size={40} /> : icon === "data" ? <Database size={40} /> : <Zap size={40} />}
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
          {title}
        </h1>
        <p className="text-white/40 text-sm font-medium leading-relaxed mb-8 px-4">
          {subtitle}
        </p>

        {/* Progress Bar Area */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-3xl mb-8">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Sync Status</span>
            <span className="text-[10px] font-black text-white/40">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-400 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft size={16} /> Go Back to Portal
          </button>
          
          <div className="py-4">
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
               University System • v2.0.4
             </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}