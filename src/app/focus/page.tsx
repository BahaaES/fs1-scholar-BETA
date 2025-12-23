"use client";
import { ChevronLeft, Construction, Timer, Zap } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function FocusPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden px-6">
      
      {/* --- BACKGROUND AMBIANCE --- */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#3A6EA5]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* --- NAVIGATION --- */}
      <nav className="absolute top-10 left-10 z-50">
        <Link href="/" className="group flex items-center gap-4">
          <div className="w-12 h-12 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center group-hover:border-[#3A6EA5] transition-all duration-500">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Return to Hub</span>
        </Link>
      </nav>

      {/* --- CONTENT --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 flex flex-col items-center"
      >
        {/* Status Badge */}
        <div className="flex items-center gap-3 mb-8 bg-[#3A6EA5]/10 border border-[#3A6EA5]/20 px-4 py-2 rounded-full">
          <Construction size={14} className="text-[#3A6EA5]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3A6EA5]">Development Phase</span>
        </div>

        {/* Main Glass Card */}
        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-16 md:p-24 shadow-2xl flex flex-col items-center text-center max-w-lg">
          <div className="relative mb-10">
            <Timer size={64} className="text-white/10" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Zap size={24} className="text-[#3A6EA5] opacity-50" />
            </motion.div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">
            Focus Timer <br />
            <span className="text-[#3A6EA5]">Coming Soon</span>
          </h1>
          
          <p className="text-white/40 text-xs font-medium uppercase tracking-[0.2em] leading-relaxed max-w-[280px]">
            We are calibrating the neural clock for peak performance.
          </p>
        </div>

        {/* System Footer */}
        <div className="mt-12 flex items-center gap-6 opacity-20">
          <div className="h-px w-12 bg-white" />
          <span className="text-[9px] font-mono tracking-[0.5em] uppercase text-white">Est. Deployment 2025</span>
          <div className="h-px w-12 bg-white" />
        </div>
      </motion.div>

    </div>
  );
}