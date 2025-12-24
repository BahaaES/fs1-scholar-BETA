"use client";
import { useEffect, useState, useContext, useCallback } from "react";
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from "@/lib/supabase";
import { 
  ArrowRight, GraduationCap, Target, Loader2, 
  Beaker, Clock, BrainCircuit,
  LayoutDashboard, Bookmark, Trash2, FileText
} from 'lucide-react';
import { LanguageContext } from "./layout";
import { translations } from "./translations";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { lang } = useContext(LanguageContext);
  const t = translations[lang as 'en' | 'fr'] || translations['en'];
  const router = useRouter();
  
  const [userName, setUserName] = useState<string>("Scholar");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFocusTime, setTotalFocusTime] = useState({ hours: 0, minutes: 0 });
  const [overallStats, setOverallStats] = useState({ totalItems: 0, totalDone: 0, percent: 0 });

  // PERFORMANCE: Parallel Data Fetching to eliminate waterfalls
  const fetchAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const [profile, saved, sessions, progress, chapters, subData] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', user.id).single(),
        supabase.from('bookmarks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('study_sessions').select('duration_seconds').eq('user_id', user.id),
        supabase.from('user_progress').select('chapter_id').eq('user_id', user.id),
        supabase.from('chapters').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*').is('parent_slug', null).order('slug', { ascending: true })
      ]);

      if (profile.data) setUserName(profile.data.username || user.email?.split('@')[0] || "Scholar");
      if (saved.data) setBookmarks(saved.data);
      if (subData.data) setSubjects(subData.data);

      if (sessions.data) {
        const totalSeconds = sessions.data.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
        setTotalFocusTime({ hours: Math.floor(totalSeconds / 3600), minutes: Math.floor((totalSeconds % 3600) / 60) });
      }

      const totalCount = chapters.count || 0;
      const completedCount = progress.data?.length || 0;
      setOverallStats({ 
        totalItems: totalCount, 
        totalDone: completedCount, 
        percent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0 
      });

    } catch (error) {
      console.error("Optimized Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // FUNCTION: Remove Bookmark
  const removeBookmark = async (id: string) => {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (!error) {
      setBookmarks(prev => prev.filter(b => b.id !== id));
    }
  };

  useEffect(() => {
    fetchAllData();
    const handleFocus = () => fetchAllData(true);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAllData]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-[#3A6EA5]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-[#3A6EA5]/30">
      <div className="max-w-7xl mx-auto px-5 py-8 md:py-16">
        
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 md:mb-16">
          <div className="flex-1">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
                <Beaker size={12} /> Official LU Portal
              </div>
              <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 text-[#3A6EA5] font-black text-[10px] uppercase tracking-widest bg-[#3A6EA5]/10 px-4 py-1.5 rounded-full border border-[#3A6EA5]/20 hover:bg-[#3A6EA5]/20 transition-all">
                <LayoutDashboard size={12} /> Dashboard
              </button>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-[0.85] uppercase">
              {t.welcome} <br /> 
              <span className="text-[#3A6EA5] italic lowercase block truncate pb-2">{userName}</span>
            </h1>
            <p className="text-sm md:text-lg opacity-40 max-w-md border-l-2 border-[#3A6EA5] pl-6 leading-relaxed font-medium">
              {t.heroSub}
            </p>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.03] backdrop-blur-2xl p-8 rounded-[3rem] w-full lg:w-[400px] border border-white/10 shadow-2xl">
            <div className="flex items-center gap-6 mb-8">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                  <motion.circle 
                    initial={{ strokeDashoffset: 276.5 }} 
                    animate={{ strokeDashoffset: 276.5 - (276.5 * overallStats.percent) / 100 }} 
                    cx="50" cy="50" r="44" stroke="#3A6EA5" strokeWidth="10" fill="transparent" strokeDasharray="276.5" strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-[#3A6EA5]">{overallStats.percent}%</div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2"><Target size={12}/> {t.masterGoal}</p>
                <p className="text-sm font-bold opacity-60 mt-1">{overallStats.totalDone} / {overallStats.totalItems} Done</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Clock size={18} /></div>
                <div>
                  <p className="text-[9px] font-black opacity-30 uppercase">Focus Time</p>
                  <p className="text-sm font-black tracking-tight">{totalFocusTime.hours}h {totalFocusTime.minutes}m</p>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">Verified</p>
            </div>
          </motion.div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Link href="/archives">
            <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-br from-[#3A6EA5] to-[#1a3a5a] p-8 rounded-[2.5rem] flex items-center justify-between border border-white/10 group transform-gpu">
              <div className="flex items-center gap-6">
                <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md"><GraduationCap className="text-white" size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black uppercase text-white leading-none">Archives</h2>
                  <p className="text-[11px] font-bold opacity-70 uppercase tracking-widest mt-1 text-white/80">Full Exam Bank</p>
                </div>
              </div>
              <ArrowRight className="text-white/40 group-hover:translate-x-2 transition-transform" />
            </motion.div>
          </Link>
          <Link href="/quiz">
            <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-br from-emerald-600 to-teal-900 p-8 rounded-[2.5rem] flex items-center justify-between border border-white/10 group transform-gpu">
              <div className="flex items-center gap-6">
                <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md"><BrainCircuit size={28} className="text-white" /></div>
                <div>
                  <h2 className="text-2xl font-black uppercase text-white leading-none">Practice Hub</h2>
                  <p className="text-[11px] font-bold opacity-70 uppercase tracking-widest mt-1 text-white/80">Active Quizzes</p>
                </div>
              </div>
              <div className="bg-white text-emerald-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase group-hover:bg-[#3A6EA5] group-hover:text-white transition-colors">Start</div>
            </motion.div>
          </Link>
        </section>

        <div className="min-h-[100px]">
          <AnimatePresence mode="popLayout">
            {bookmarks.length > 0 && (
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-16">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Bookmark size={16} className="text-[#3A6EA5]" />
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/40">Recently Saved</h2>
                  </div>
                  {/* SEE ALL BUTTON */}
                  {bookmarks.length > 2 && (
                    <Link href="/saved">
                      <button className="text-[#3A6EA5] text-[10px] font-black uppercase tracking-widest hover:underline px-2">
                        See All ({bookmarks.length})
                      </button>
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookmarks.slice(0, 2).map((item) => (
                    <motion.div key={item.id} layout className="bg-white/[0.03] border border-white/10 p-5 rounded-[2rem] flex items-center justify-between hover:bg-white/[0.05] transition-colors">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-12 h-12 shrink-0 bg-[#3A6EA5]/10 rounded-2xl flex items-center justify-center text-[#3A6EA5]"><FileText size={20} /></div>
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-sm truncate pr-4">{item.resource_name}</h3>
                          <p className="text-[9px] opacity-30 uppercase tracking-widest">Saved Document</p>
                        </div>
                      </div>
                      <button onClick={() => removeBookmark(item.id)} className="p-3 text-white/10 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32">
          {subjects.map((subject, index) => (
            <Link href={`/${subject.slug}`} key={subject.id}>
              <motion.div 
                whileHover={{ y: -8 }} 
                whileTap={{ scale: 0.98 }} 
                className="group relative p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-md overflow-hidden h-full flex flex-col transform-gpu"
                style={{ contain: 'layout' }}
              >
                <span className="absolute -right-2 top-0 text-[9rem] font-black opacity-[0.03] pointer-events-none uppercase select-none group-hover:opacity-[0.07] transition-opacity duration-500">
                  {index + 1}
                </span>

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
                    {subject.icon || "📚"}
                  </div>
                  <span className="text-[9px] font-black px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-white/40 group-hover:border-[#3A6EA5]/30 transition-colors uppercase tracking-tighter">
                    {subject.slug}
                  </span>
                </div>

                <div className="flex-grow relative z-10">
                  <h3 className="text-lg font-black text-white group-hover:text-[#3A6EA5] transition-colors leading-tight uppercase">
                    {lang === 'en' ? subject.title : (subject.title_fr || subject.title)}
                  </h3>
                </div>

                <div className="mt-6 flex items-center gap-2 text-[#3A6EA5] font-black text-[10px] uppercase tracking-widest relative z-10 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight size={14} />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}