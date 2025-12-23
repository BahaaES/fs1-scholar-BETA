"use client";
import { useEffect, useState, useContext, useCallback } from "react";
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from "@/lib/supabase";
import { 
  ArrowRight, GraduationCap, Target, Loader2, 
  ShieldCheck, Beaker, Clock, BrainCircuit,
  LayoutDashboard, Bookmark, Trash2, FileText, ChevronRight
} from 'lucide-react';
import { LanguageContext } from "./layout";
import { translations } from "./translations";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { lang } = useContext(LanguageContext);
  const t = translations[lang as 'en' | 'fr'];
  const router = useRouter();
  
  const [userName, setUserName] = useState<string>("Scholar");
  const [isAdmin, setIsAdmin] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFocusTime, setTotalFocusTime] = useState({ hours: 0, minutes: 0 });
  const [overallStats, setOverallStats] = useState({ totalItems: 0, totalDone: 0, percent: 0 });

  const fetchAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsAdmin(user.user_metadata?.role === 'admin');
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        setUserName(profile?.username || user.email?.split('@')[0] || "Scholar");

        // Fetch Bookmarks
        const { data: savedData } = await supabase
          .from('bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (savedData) setBookmarks(savedData);

        // Fetch Study Sessions
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('duration_seconds')
          .eq('user_id', user.id);

        if (sessions) {
          const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
          setTotalFocusTime({
            hours: Math.floor(totalSeconds / 3600),
            minutes: Math.floor((totalSeconds % 3600) / 60)
          });
        }

        // Fetch Progress & Subjects
        const [{ count: totalChapters }, { data: progressData }, { data: subData }] = await Promise.all([
          supabase.from('chapters').select('*', { count: 'exact', head: true }),
          supabase.from('user_progress').select('chapter_id').eq('user_id', user.id),
          supabase.from('subjects').select('*').is('parent_slug', null).order('slug', { ascending: true })
        ]);

        const completedCount = progressData?.length || 0;
        const totalCount = totalChapters || 0;

        setOverallStats({
          totalItems: totalCount,
          totalDone: completedCount,
          percent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
        });

        if (subData) setSubjects(subData);

      } else {
        router.push('/auth');
      }
    } catch (error) {
      console.error("Data Fetch Error:", error);
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
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new && payload.new.username) setUserName(payload.new.username);
      })
      .subscribe();

    const handleFocus = () => fetchAllData(true);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-[#3A6EA5]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-5 py-10 md:py-20">
        
        {/* --- HEADER --- */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-10 mb-16">
          <div className="flex-1 min-w-0">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 text-amber-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
                <Beaker size={14} /> Official LU Academic Portal
              </div>
              <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 text-[#3A6EA5] font-black text-[9px] md:text-[10px] uppercase tracking-widest bg-[#3A6EA5]/10 px-4 py-1.5 rounded-full border border-[#3A6EA5]/20 hover:bg-[#3A6EA5]/20 transition-all">
                <LayoutDashboard size={14} /> Dashboard
              </button>
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-tight break-words">
              {t.welcome} <br /> 
              <span className="brand-gradient italic lowercase block truncate max-w-[90%] md:max-w-full">
                {userName}
              </span>
            </h1>
            <p className="text-sm md:text-lg opacity-50 max-w-md border-l-2 border-[#3A6EA5] pl-4 md:pl-6">{t.heroSub}</p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="glass-card p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] w-full lg:w-[380px] shrink-0 shadow-2xl transition-all group"
          >
            <div className="flex items-center gap-6 mb-6">
              <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                  <motion.circle 
                    initial={{ strokeDashoffset: 276.5 }}
                    animate={{ strokeDashoffset: 276.5 - (276.5 * overallStats.percent) / 100 }}
                    cx="50" cy="50" r="44" stroke="#3A6EA5" strokeWidth="10" fill="transparent" 
                    strokeDasharray="276.5" strokeLinecap="round" transition={{ duration: 2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black text-lg text-[#3A6EA5]">{overallStats.percent}%</div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2"><Target size={12}/> {t.masterGoal}</p>
                <p className="text-xs font-bold opacity-60 mt-1">{overallStats.totalDone} / {overallStats.totalItems} {t.files}</p>
                <button onClick={() => router.push('/dashboard')} className="text-[9px] text-[#3A6EA5] font-black uppercase mt-1 group-hover:translate-x-1 transition-transform tracking-tighter">View Performance →</button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-5 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Clock size={16} /></div>
                <div>
                  <p className="text-[9px] font-black opacity-40 uppercase">Focus Time</p>
                  <p className="text-xs font-black">{totalFocusTime.hours}h {totalFocusTime.minutes}m</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black opacity-40 uppercase">Account</p>
                <p className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter">Verified</p>
              </div>
            </div>
          </motion.div>
        </header>

        {/* --- MAIN NAVIGATION CARDS --- */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <Link href="/archives">
            <motion.div whileTap={{ scale: 0.97 }} className="bg-gradient-to-br from-[#3A6EA5] to-[#1a3a5a] p-6 md:p-8 rounded-[2.5rem] flex items-center justify-between shadow-xl border border-white/10 group h-full">
              <div className="flex items-center gap-5">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform"><GraduationCap className="text-white" size={28} /></div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-white">Archives & Sessions</h2>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1 text-white/80">Past Exams & Solved Sessions</p>
                </div>
              </div>
              <ArrowRight className="text-white/40 group-hover:translate-x-3 transition-all hidden md:block" size={24} />
            </motion.div>
          </Link>
          <Link href="/quiz">
            <motion.div whileTap={{ scale: 0.97 }} className="bg-gradient-to-br from-emerald-600 to-teal-900 p-6 md:p-8 rounded-[2.5rem] flex items-center justify-between shadow-xl border border-white/10 group h-full">
              <div className="flex items-center gap-5">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform text-white"><BrainCircuit size={28} /></div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-white">Interactive Practice</h2>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1 text-white/80">Self-Assessment training</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter text-white">Start →</div>
            </motion.div>
          </Link>
        </section>

        {/* --- SAVED RESOURCES SECTION (Max 2 items) --- */}
        <AnimatePresence>
          {bookmarks.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-16"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Bookmark size={18} className="text-[#3A6EA5]" />
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/40">Quick Access Archive</h2>
                </div>
                
                {bookmarks.length > 2 && (
                  <Link href="/saved">
                    <button className="flex items-center gap-2 text-[#3A6EA5] text-[10px] font-black uppercase tracking-widest hover:bg-[#3A6EA5]/10 px-4 py-2 rounded-xl transition-all">
                      See All {bookmarks.length} <ChevronRight size={14} />
                    </button>
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookmarks.slice(0, 2).map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group bg-white/[0.03] border border-white/10 p-5 rounded-3xl flex items-center justify-between hover:border-[#3A6EA5]/30 transition-all"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-12 h-12 shrink-0 bg-[#3A6EA5]/10 rounded-2xl flex items-center justify-center text-[#3A6EA5]">
                        <FileText size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-sm truncate pr-2 group-hover:text-[#3A6EA5] transition-colors">{item.resource_name}</h3>
                        <p className="text-[9px] opacity-30 uppercase tracking-widest mt-0.5">Stored Document</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => removeBookmark(item.id)}
                      className="p-3 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* --- SUBJECTS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 pb-32">
          {subjects.map((subject: any, index: number) => (
            <Link href={`/${subject.slug}`} key={subject.id}>
              <motion.div whileHover={{ y: -8, backgroundColor: "rgba(255,255,255,0.03)" }} whileTap={{ scale: 0.98 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="glass-card group p-8 md:p-10 rounded-[2.5rem] h-full flex flex-col relative overflow-hidden cursor-pointer">
                <span className="absolute -right-2 -top-4 text-[10rem] font-black opacity-[0.03] pointer-events-none uppercase">{index + 1}</span>
                <div className="text-5xl md:text-6xl mb-8 transform group-hover:-rotate-12 transition-transform duration-300">{subject.icon}</div>
                <div className="flex-grow">
                  <h2 className="text-2xl md:text-3xl font-black mb-3 tracking-tighter uppercase leading-none">{subject.title}</h2>
                  <span className="inline-block px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-[#3A6EA5] tracking-widest uppercase mb-8">{subject.slug}</span>
                </div>
                <div className="flex items-center gap-3 text-[#3A6EA5] font-black text-[11px] uppercase tracking-widest">
                  {t.viewResources} <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}