"use client";
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Code2, Globe, Heart } from 'lucide-react';
import { useRouter } from "next/navigation";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020202] text-white pb-20 selection:bg-[#6366f1]/30">
      <div className="max-w-4xl mx-auto px-6 pt-12">
        
        {/* Back Button */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/20 hover:text-white mb-16 transition-all group"
        >
          <div className="p-2 rounded-xl bg-white/5 group-hover:bg-[#6366f1]/20 group-hover:text-[#6366f1] transition-all">
            <ArrowLeft size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
        </button>

        <header className="mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter uppercase italic leading-none mb-8">
              The <span className="text-[#6366f1]">Mission.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/60 font-medium leading-relaxed max-w-2xl">
              Building the ultimate digital ecosystem for Science students. No distractions, just pure academic growth.
            </p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-12">
            <section>
              <div className="flex items-center gap-3 text-[#6366f1] mb-4">
                <Sparkles size={20} />
                <h2 className="text-xs font-black uppercase tracking-widest">The Vision</h2>
              </div>
              <p className="text-white/40 leading-relaxed text-sm">
                This portal was born out of a need for centralized, high-quality resources. From the Library of past exams to the Focus Mode timer, every pixel is designed to help you stay ahead in your faculty.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 text-[#6366f1] mb-4">
                <Code2 size={20} />
                <h2 className="text-xs font-black uppercase tracking-widest">Built by Students</h2>
              </div>
              <p className="text-white/40 leading-relaxed text-sm">
                Engineered with Next.js, Tailwind, and Supabase. This isn't just a website; it's a student-led initiative to modernize how we study together.
              </p>
            </section>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 flex flex-col justify-between">
            <div>
              <Globe className="text-[#6366f1] mb-6" size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Community Driven</h3>
              <p className="text-sm text-white/40 leading-relaxed">
                Everything here—the notes, the solutions, and the practice exercises—comes from students who want to see their peers succeed.
              </p>
            </div>
            
            <div className="pt-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
              Made with <Heart size={10} className="text-red-500 fill-red-500" /> for the Faculty
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}