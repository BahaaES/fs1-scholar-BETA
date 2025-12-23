"use client";
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useContext } from 'react';
import { 
  FileText, ArrowLeft, Download, Loader2, CheckCircle2, 
  Trophy, Beaker, X, ExternalLink, GraduationCap 
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageContext } from '../layout';
import { translations } from '../translations';
// 1. IMPORT THE BOOKMARK BUTTON
import BookmarkButton from '@/app/components/BookmarkButton'; 

export default function SubjectPage() {
  const { subject: slug } = useParams();
  const { lang } = useContext(LanguageContext);
  const t = translations[lang as 'en' | 'fr'];

  const [parent, setParent] = useState<any>(null);
  const [subSubjects, setSubSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

  useEffect(() => {
    async function getData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const { data: p } = await supabase.from('subjects').select('*').eq('slug', slug).single();
      const { data: subs } = await supabase.from('subjects').select('*').eq('parent_slug', slug).order('title', { ascending: true });
      const subSlugs = subs?.map(s => s.slug) || [];
      const { data: chaps } = await supabase.from('chapters').select('*').in('subject_key', subSlugs).order('title', { ascending: true });

      if (user) {
        const { data: progress } = await supabase.from('user_progress').select('chapter_id').eq('user_id', user.id);
        if (progress) setCompletedChapters(progress.map((p: any) => p.chapter_id));
      }

      setParent(p);
      setSubSubjects(subs || []);
      setChapters(chaps || []);
      setLoading(false);
    }
    getData();
  }, [slug]);

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes('drive.google.com')) {
      return url.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
    }
    return url;
  };

  const totalInModule = chapters.length;
  const totalDone = chapters.filter(c => completedChapters.includes(c.id)).length;
  const percentDone = totalInModule > 0 ? Math.round((totalDone / totalInModule) * 100) : 0;
  const isMastered = percentDone === 100 && totalInModule > 0;

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentDone / 100) * circumference;

  const toggleProgress = async (chapterId: string) => {
    if (!userId) return alert(t.unauthorized || "Please login");
    const isDone = completedChapters.includes(chapterId);
    if (isDone) {
      const { error } = await supabase.from('user_progress').delete().eq('user_id', userId).eq('chapter_id', chapterId);
      if (!error) setCompletedChapters(prev => prev.filter(id => id !== chapterId));
    } else {
      const { error } = await supabase.from('user_progress').insert([{ user_id: userId, chapter_id: chapterId }]);
      if (!error) setCompletedChapters(prev => [...prev, chapterId]);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-[#3A6EA5]" size={40} />
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-5 md:px-6 py-8 md:py-12 min-h-screen relative text-white">
      
      <Link href="/" className="group inline-flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.3em] mb-8 md:mb-12 opacity-50 hover:opacity-100 hover:text-[#3A6EA5] transition-all">
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> {t.back}
      </Link>

      <header className="mb-12 md:mb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="flex-grow">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-amber-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-4">
              <Beaker size={14} /> LU {parent?.slug?.toUpperCase()} UNIT
            </motion.div>
            <div className="flex items-center gap-4 md:gap-6">
               <span className="text-6xl md:text-8xl">{parent?.icon}</span>
               <div>
                  <h1 className="text-3xl md:text-7xl font-black tracking-tighter uppercase leading-none italic brand-gradient">
                    {parent?.title}
                  </h1>
                  <p className="text-[#3A6EA5] font-black tracking-[0.2em] uppercase text-[9px] md:text-[10px] mt-2 md:mt-4 opacity-60">
                    Faculty of Science • L1
                  </p>
               </div>
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-4 md:gap-6 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 glass-card shadow-xl self-start md:self-auto">
            <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={radius} stroke="white" strokeWidth="6" fill="transparent" className="opacity-10" />
                <motion.circle 
                    cx="32" cy="32" r={radius} stroke="#3A6EA5" strokeWidth="6" fill="transparent" 
                    strokeDasharray={circumference} 
                    animate={{ strokeDashoffset }} 
                    strokeLinecap="round" 
                    transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <span className="absolute text-[9px] md:text-[10px] font-black text-[#3A6EA5]">{percentDone}%</span>
            </div>
            <div>
              <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-[#3A6EA5]">{t.status}</p>
              <p className="text-lg md:text-xl font-black">{totalDone}<span className="opacity-20 mx-1">/</span>{totalInModule}</p>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {isMastered && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8 p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shrink-0">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm md:text-base text-emerald-500 uppercase tracking-tight">{t.mastered}</h3>
                <p className="text-[11px] md:text-xs opacity-70">{t.congrats}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="space-y-12 md:space-y-20">
        {subSubjects.map((sub: any) => (
          <section key={sub.id} className="relative">
            <div className="sticky top-0 md:top-24 z-10 py-4 bg-[#050505]/95 backdrop-blur-sm flex items-center gap-3 md:gap-4 mb-6 md:mb-8 border-b border-[#3A6EA5]/20">
              <span className="text-2xl md:text-3xl filter drop-shadow-md">{sub.icon}</span>
              <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase italic">{sub.title}</h2>
              <div className="ml-auto text-[8px] md:text-[10px] font-mono opacity-30 uppercase tracking-widest hidden sm:block">
                Code: {sub.slug}
              </div>
            </div>
            
            <div className="grid gap-3 md:gap-4">
              {chapters.filter((c: any) => c.subject_key === sub.slug).map((chap: any) => {
                const isDone = completedChapters.includes(chap.id);
                return (
                  <motion.div 
                    key={chap.id} 
                    layout
                    className={`p-1 pl-4 md:pl-6 rounded-[1.5rem] md:rounded-[2rem] flex flex-col md:flex-row justify-between items-stretch md:items-center border border-white/5 transition-all duration-500 glass-card group ${isDone ? 'border-emerald-500/50 bg-emerald-500/[0.02]' : 'hover:border-[#3A6EA5]/50'}`}
                  >
                    <div className="flex items-center gap-4 md:gap-6 py-3 md:py-4 flex-grow">
                      <button 
                        onClick={() => toggleProgress(chap.id)} 
                        className={`transition-all duration-300 transform active:scale-75 shrink-0 ${isDone ? 'text-emerald-500' : 'opacity-20 hover:opacity-100'}`}
                      >
                        <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7" fill={isDone ? "currentColor" : "none"} />
                      </button>
                      <div className="flex flex-col">
                        <span className={`font-black text-sm md:text-lg tracking-tight transition-all leading-tight ${isDone ? 'opacity-30 line-through' : ''}`}>
                          {chap.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                           <FileText size={10} className="opacity-30" />
                           <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest opacity-30 italic">Module Reference</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 p-1.5 md:p-2 w-full md:w-auto">
                      {/* 2. INSERT BOOKMARK BUTTON COMPONENT HERE */}
                      {userId && (
                       <BookmarkButton 
  resourceId={chap.id} 
  resourceName={chap.title} 
  resource_url={chap.file_url} // <--- ADD THIS LINE
  userId={userId} 
/>
                      )}

                      <button 
                        onClick={() => setSelectedPdf(chap.file_url)}
                        className="flex-1 md:flex-none text-center px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-white/10 text-[9px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2" 
                      >
                        <GraduationCap size={14} className="shrink-0" /> <span className="md:inline">{t.preview}</span>
                      </button>
                      
                      <a href={chap.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none text-center px-4 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] uppercase tracking-widest bg-[#3A6EA5] text-white hover:bg-[#2d5682] shadow-lg transition-all flex items-center justify-center gap-2">
                        <Download size={14} className="shrink-0" /> <span className="md:inline">{t.download}</span>
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <AnimatePresence>
        {selectedPdf && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedPdf(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="relative w-full h-[100dvh] md:h-full max-w-6xl bg-[#0a0a0a] md:rounded-[2.5rem] border-x md:border border-white/10 overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-3 md:p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-3 ml-2 md:ml-4">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#3A6EA5]/20 flex items-center justify-center">
                    <GraduationCap className="text-[#3A6EA5] w-[14px] h-[14px] md:w-4 md:h-4" />
                  </div>
                  <span className="font-black uppercase text-[8px] md:text-[10px] tracking-widest opacity-50">Reader Mode</span>
                </div>
                <div className="flex gap-1.5 md:gap-2">
                  <a href={selectedPdf} target="_blank" className="p-2.5 md:p-3 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white">
                    <ExternalLink size={18} />
                  </a>
                  <button onClick={() => setSelectedPdf(null)} className="p-2.5 md:p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-grow bg-white relative">
                <iframe 
                  src={getEmbedUrl(selectedPdf)}
                  className="w-full h-full border-none"
                  allow="autoplay"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}