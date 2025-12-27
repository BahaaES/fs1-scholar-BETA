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

  const primaryIndigo = "#6366f1";

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
      <Loader2 className="animate-spin text-indigo-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-indigo-500/30">
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.05) 0%, transparent 70%)` }} />

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-8 md:py-16">
        
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 md:mb-16">
          <div className="flex-1">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
                <Beaker size={12} /> University Portal
              </div>
              <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-widest bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                <LayoutDashboard size={12} /> Overview
              </button>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-[0.85]">
              <span className="uppercase">{t.welcome}</span> <br /> 
              <span className="text-indigo-500 italic block truncate pb-2">{userName}</span>
            </h1>
            <p className="text-sm md:text-lg opacity-40 max-w-md border-l-2 border-indigo-500/50 pl-6 leading-relaxed font-medium">
              Access your academic resources and track your learning progress.
            </p>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.03] backdrop-blur-2xl p-8 rounded-[3rem] w-full lg:w-[400px] border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative w-20 h-20">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                      <motion.circle 
                        initial={{ strokeDashoffset: 276.5 }} 
                        animate={{ strokeDashoffset: 276.5 - (276.5 * overallStats.percent) / 100 }} 
                        cx="50" cy="50" r="44" stroke={primaryIndigo} strokeWidth="10" fill="transparent" strokeDasharray="276.5" strokeLinecap="round" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-indigo-400">{overallStats.percent}%</div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2"><Target size={12}/> Syllabus Status</p>
                    <p className="text-sm font-bold opacity-60 mt-1">{overallStats.totalDone} / {overallStats.totalItems} Completed</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Clock size={18} /></div>
                    <div>
                      <p className="text-[9px] font-black opacity-30 uppercase">Study Time</p>
                      <p className="text-sm font-black tracking-tight">{totalFocusTime.hours}h {totalFocusTime.minutes}m</p>
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">Logged</p>
                </div>
            </div>
          </motion.div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Link href="/library">
            <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-[2.5rem] flex items-center justify-between border border-white/10 group transform-gpu shadow-xl hover:border-indigo-500/30 transition-all">
              <div className="flex items-center gap-6">
                <div className="bg-white/5 p-5 rounded-2xl backdrop-blur-md border border-white/10 group-hover:border-indigo-500/50 transition-colors"><GraduationCap className="text-indigo-400" size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black uppercase text-white leading-none">Library</h2>
                  <p className="text-[11px] font-bold opacity-70 uppercase tracking-widest mt-1 text-white/40">Reference Documents</p>
                </div>
              </div>
              <ArrowRight className="text-white/20 group-hover:translate-x-2 group-hover:text-indigo-400 transition-all" />
            </motion.div>
          </Link>
          <Link href="/quiz">
            <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] flex items-center justify-between border border-white/10 group transform-gpu shadow-xl hover:border-indigo-500/30 transition-all">
              <div className="flex items-center gap-6">
                <div className="bg-white/5 p-5 rounded-2xl backdrop-blur-md border border-white/10 group-hover:border-indigo-500/50 transition-colors"><BrainCircuit size={28} className="text-indigo-400" /></div>
                <div>
                  <h2 className="text-2xl font-black uppercase text-white leading-none">Self-Test</h2>
                  <p className="text-[11px] font-bold opacity-70 uppercase tracking-widest mt-1 text-white/40">Knowledge Review</p>
                </div>
              </div>
              <div className="bg-indigo-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase group-hover:bg-white group-hover:text-indigo-900 transition-all shadow-lg shadow-indigo-500/20">Begin</div>
            </motion.div>
          </Link>
        </section>

        {/* RECENTLY SAVED SECTION */}
        <div className="min-h-[100px]">
          <AnimatePresence mode="popLayout">
            {bookmarks.length > 0 && (
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-16">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Bookmark size={16} className="text-indigo-500" />
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/40">Bookmarked</h2>
                  </div>
                  {bookmarks.length > 2 && (
                    <Link href="/saved">
                      <button className="text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors px-2">
                        View All ({bookmarks.length})
                      </button>
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookmarks.slice(0, 2).map((item) => (
                    <motion.div key={item.id} layout className="bg-white/[0.03] border border-white/10 p-5 rounded-[2rem] flex items-center justify-between hover:bg-white/[0.05] hover:border-indigo-500/20 transition-all group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-12 h-12 shrink-0 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all"><FileText size={20} /></div>
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-sm truncate pr-4">{item.resource_name}</h3>
                          <p className="text-[9px] opacity-30 uppercase tracking-widest">Saved Material</p>
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

        {/* SUBJECT GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32">
          {subjects.map((subject, index) => (
            <Link href={`/${subject.slug}`} key={subject.id}>
              <motion.div 
                whileHover={{ y: -8 }} 
                whileTap={{ scale: 0.98 }} 
                className="group relative p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10 backdrop-blur-md overflow-hidden h-full flex flex-col transform-gpu hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all"
                style={{ contain: 'layout' }}
              >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
                    {subject.icon || "📚"}
                  </div>
                  <span className="text-[9px] font-black px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-white/40 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-all uppercase tracking-tighter">
                    {subject.slug}
                  </span>
                </div>

                <div className="flex-grow relative z-10">
                  <h3 className="text-lg font-black text-white/90 group-hover:text-white transition-colors leading-tight uppercase">
                    {lang === 'en' ? subject.title : (subject.title_fr || subject.title)}
                  </h3>
                </div>

                <div className="mt-6 flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-widest relative z-10 group-hover:translate-x-1 transition-transform">
                  Enter <ArrowRight size={14} />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}