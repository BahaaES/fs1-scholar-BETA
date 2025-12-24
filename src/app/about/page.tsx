"use client";
import { motion } from 'framer-motion';
import { Beaker, ShieldCheck, GraduationCap, Target } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        <header className="mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="inline-flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20 mb-6"
          >
            <Beaker size={12} /> Our Mission
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none mb-6">
            Academic <span className="text-[#3A6EA5] italic">Excellence</span>
          </h1>
          <p className="text-lg opacity-40 max-w-2xl border-l-2 border-[#3A6EA5] pl-6 leading-relaxed font-medium">
            The Official LU Academic Portal is designed to centralize resources for the Faculty of Science, providing students with instant access to archives, interactive practice, and performance tracking.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              icon: <GraduationCap size={32} />, 
              title: "Archive Access", 
              desc: "Digitalized past exams and solved sessions at your fingertips, optimized for quick searching." 
            },
            { 
              icon: <Target size={32} />, 
              title: "Precision Study", 
              desc: "Track your progress and focus time with advanced analytics built specifically for science students." 
            },
            { 
              icon: <ShieldCheck size={32} />, 
              title: "Verified Content", 
              desc: "All resources are vetted by the Faculty of Science academic board to ensure accuracy." 
            }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.05] transition-colors"
            >
              <div className="text-[#3A6EA5] mb-6">{item.icon}</div>
              <h3 className="font-black uppercase tracking-tight text-xl mb-3">{item.title}</h3>
              <p className="text-sm opacity-40 leading-relaxed font-medium">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}