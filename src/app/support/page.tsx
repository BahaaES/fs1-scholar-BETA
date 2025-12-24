"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from 'framer-motion';
import { Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function SupportPage() {
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUser();
  }, []);

  // 1. Technical Form: Still uses the email auto-fill because you need to reply to them
  const techFormLink = `https://docs.google.com/forms/d/e/1FAIpQLSczmE_Hpl_CPlFHkAXIeqkyQf0qAy-3ZVGsqblnTtbKTCY-uw/viewform?usp=pp_url&entry.81587044=${encodeURIComponent(userEmail)}`;
  
  // 2. Academic Form: Just the direct link you provided (no email tracking)
  const academicFormLink = `https://docs.google.com/forms/d/e/1FAIpQLSdq3c1tAw9loi3_0Dvm0wwkyj0uL-YqHi-10Wss97pYVrLR9w/viewform?usp=dialog`;

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 pb-20 selection:bg-[#3A6EA5]/30">
      <div className="max-w-5xl mx-auto px-6 text-center">
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-sm font-black uppercase tracking-[0.4em] text-[#3A6EA5] mb-4">Help Center</h2>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-16 leading-none">
            Support <span className="italic text-[#3A6EA5]">Portal</span>
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          
          {/* Technical Support Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-md relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <Mail size={120} />
            </div>
            
            <Mail className="text-[#3A6EA5] mb-6" size={32} />
            <h3 className="font-black uppercase text-2xl mb-2">Technical Bug</h3>
            <p className="text-sm opacity-40 mb-10 leading-relaxed max-w-[280px]">
              Report issues with your account, login, or website performance.
            </p>
            
            <a 
              href={techFormLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-[#3A6EA5] hover:bg-[#2e5985] text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest inline-flex items-center gap-2 transition-all shadow-lg shadow-[#3A6EA5]/10"
            >
              Report Bug <ArrowRight size={14} />
            </a>
          </motion.div>

          {/* Academic Error Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-md relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <AlertCircle size={120} />
            </div>

            <AlertCircle className="text-emerald-500 mb-6" size={32} />
            <h3 className="font-black uppercase text-2xl mb-2">Academic Error</h3>
            <p className="text-sm opacity-40 mb-10 leading-relaxed max-w-[280px]">
              Suggest corrections for solved sessions or academic documents.
            </p>
            
            <a 
              href={academicFormLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest inline-flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/5"
            >
              Submit Correction <ArrowRight size={14} />
            </a>
          </motion.div>
        </div>

        <p className="mt-20 text-[9px] font-black uppercase tracking-[0.3em] opacity-20">
          Faculty of Science • 2025 Portal
        </p>
      </div>
    </div>
  );
}