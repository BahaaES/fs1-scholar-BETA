"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from 'framer-motion';
import { Mail, AlertCircle, ArrowRight, X, LifeBuoy } from 'lucide-react';
import { useRouter } from "next/navigation";

export default function SupportPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUser();
  }, []);

  const handleExit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    router.push(session ? '/' : '/auth');
  };

  const techFormLink = `https://docs.google.com/forms/d/e/1FAIpQLSczmE_Hpl_CPlFHkAXIeqkyQf0qAy-3ZVGsqblnTtbKTCY-uw/viewform?usp=pp_url&entry.81587044=${encodeURIComponent(userEmail)}`;
  const academicFormLink = `https://docs.google.com/forms/d/e/1FAIpQLSdq3c1tAw9loi3_0Dvm0wwkyj0uL-YqHi-10Wss97pYVrLR9w/viewform?usp=dialog`;

  return (
    <div className="min-h-screen bg-[#020202] text-white pt-24 pb-20 selection:bg-[#6366f1]/30 relative z-[999] overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[#6366f1]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* SMART EXIT */}
      <div className="fixed top-8 right-8 z-[1000]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleExit}
          className="p-4 bg-white/5 border border-white/10 rounded-full text-white/40 hover:text-white hover:bg-[#6366f1]/20 hover:border-[#6366f1]/50 transition-all backdrop-blur-xl"
        >
          <X size={24} />
        </motion.button>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        <header className="text-center mb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-2 text-[#6366f1] mb-4">
              <LifeBuoy size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Concierge Services</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase mb-4 leading-none italic">
              Support <span className="text-[#6366f1] not-italic">Portal</span>
            </h1>
            <p className="text-white/30 text-xs md:text-sm font-medium uppercase tracking-widest">How can we assist your academic journey?</p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Technical Support Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            whileHover={{ y: -8 }}
            className="p-10 rounded-[3.5rem] bg-white/[0.02] border border-white/5 hover:border-[#6366f1]/30 backdrop-blur-md relative overflow-hidden group transition-all"
          >
            <div className="absolute -top-10 -right-10 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity rotate-12">
              <Mail size={200} />
            </div>
            
            <div className="w-14 h-14 bg-[#6366f1]/10 rounded-2xl flex items-center justify-center text-[#6366f1] mb-8">
              <Mail size={28} />
            </div>
            <h3 className="font-black uppercase text-3xl mb-3 tracking-tighter">System Issues</h3>
            <p className="text-sm text-white/40 mb-12 leading-relaxed max-w-[260px]">
              Experiencing bugs, login errors, or performance issues with the portal?
            </p>
            
            <a 
              href={techFormLink} target="_blank" rel="noopener noreferrer"
              className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#6366f1]/20"
            >
              Contact Dev Team <ArrowRight size={16} />
            </a>
          </motion.div>

          {/* Academic Error Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            whileHover={{ y: -8 }}
            className="p-10 rounded-[3.5rem] bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 backdrop-blur-md relative overflow-hidden group transition-all"
          >
            <div className="absolute -top-10 -right-10 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity -rotate-12">
              <AlertCircle size={200} />
            </div>

            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-8">
              <AlertCircle size={28} />
            </div>
            <h3 className="font-black uppercase text-3xl mb-3 tracking-tighter">Academic Data</h3>
            <p className="text-sm text-white/40 mb-12 leading-relaxed max-w-[260px]">
              Found an error in a solved exam or want to request missing content?
            </p>
            
            <a 
              href={academicFormLink} target="_blank" rel="noopener noreferrer" 
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
            >
              Submit Feedback <ArrowRight size={16} />
            </a>
          </motion.div>
        </div>

        <footer className="mt-32 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-10">
            Faculty of Science • UI Version 2.5
          </p>
        </footer>
      </div>
    </div>
  );
}