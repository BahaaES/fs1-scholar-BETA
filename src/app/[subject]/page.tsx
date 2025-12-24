"use client";
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useContext, useMemo, useCallback, memo } from 'react';
import { 
  ArrowLeft, Download, Loader2, CheckCircle2, 
  Beaker, X, GraduationCap, ChevronDown, AlertTriangle, Clock
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageContext } from '../layout';
import { translations } from '../translations';
import BookmarkButton from '@/app/components/BookmarkButton'; 

// --- OPTIMIZATION: Memoized Chapter Item ---
// This prevents the whole list from re-rendering when progress is toggled
const ChapterItem = memo(({ chap, isDone, userId, onPreview, onToggle, getDownloadUrl }: any) => (
  <div className={`p-4 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 group transition-all hover:bg-white/[0.02] ${isDone ? 'border-emerald-500/20' : ''}`}>
    <div className="flex items-center gap-4 flex-grow">
      <button onClick={() => onToggle(chap.id)} className={`transition-all ${isDone ? 'text-emerald-500' : 'opacity-20 hover:opacity-100'}`}>
        <CheckCircle2 size={28} fill={isDone ? "currentColor" : "none"} />
      </button>
      <div>
        <h3 className={`font-black text-lg ${isDone ? 'opacity-30 line-through' : ''}`}>{chap.title}</h3>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-20 italic">Academic Resource</p>
      </div>
    </div>
    <div className="flex items-center gap-2 w-full md:w-auto">
      {userId && (
        <BookmarkButton 
          resourceId={chap.id} 
          resourceName={chap.title} 
          resource_url={chap.file_url} 
          userId={userId} 
        />
      )}
      <button 
        onClick={() => onPreview({url: chap.file_url, title: chap.title})}
        className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
      >
        <GraduationCap size={16} /> Preview
      </button>
      <a 
        href={getDownloadUrl(chap.file_url)} 
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-[#3A6EA5] text-[10px] font-black uppercase tracking-widest hover:bg-[#2d5682] transition-all flex items-center justify-center gap-2"
      >
        <Download size={16} /> Download
      </a>
    </div>
  </div>
));
ChapterItem.displayName = "ChapterItem";

export default function SubjectPage() {
  const { subject: slug } = useParams();
  const { lang, setNavVisible } = useContext(LanguageContext);
  const t = translations[lang as 'en' | 'fr'];

  const [data, setData] = useState<{parent: any, subs: any[], chapters: any[]}>({
    parent: null, subs: [], chapters: []
  });
  const [loading, setLoading] = useState(true);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set()); // Use Set for O(1) lookup
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<{url: string, title: string} | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([]);

  // --- OPTIMIZATION: Parallel Fetching ---
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id || null);

        // Run queries in parallel
        const [parentRes, subsRes] = await Promise.all([
          supabase.from('subjects').select('*').eq('slug', slug).single(),
          supabase.from('subjects').select('*').eq('parent_slug', slug).order('title', { ascending: true })
        ]);

        const subSlugs = subsRes.data?.map(s => s.slug) || [];
        
        // Fetch chapters and user progress in parallel
        const [chapsRes, progressRes] = await Promise.all([
          supabase.from('chapters').select('*').in('subject_key', subSlugs).order('title', { ascending: true }),
          user ? supabase.from('user_progress').select('chapter_id').eq('user_id', user.id) : Promise.resolve({ data: [] })
        ]);

        setData({
          parent: parentRes.data,
          subs: subsRes.data || [],
          chapters: chapsRes.data || []
        });

        if (progressRes.data) {
          setCompletedChapters(new Set(progressRes.data.map((p: any) => p.chapter_id)));
        }
        
        if (subsRes.data?.length) setOpenSections([subsRes.data[0].id]);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  // --- OPTIMIZATION: Memoized Helpers ---
  const getDownloadUrl = useCallback((url: string) => {
    if (!url || !url.includes('drive.google.com')) return url;
    const fileId = url.split('/d/')[1]?.split('/')[0];
    return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : url;
  }, []);

  const getEmbedUrl = useCallback((url: string) => {
    if (!url) return "";
    return url.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
  }, []);

  const toggleProgress = async (chapterId: string) => {
    if (!userId) return alert("Please login");
    const isDone = completedChapters.has(chapterId);
    
    // Optimistic UI Update
    setCompletedChapters(prev => {
      const next = new Set(prev);
      isDone ? next.delete(chapterId) : next.add(chapterId);
      return next;
    });

    if (isDone) {
      await supabase.from('user_progress').delete().eq('user_id', userId).eq('chapter_id', chapterId);
    } else {
      await supabase.from('user_progress').insert([{ user_id: userId, chapter_id: chapterId }]);
    }
  };

  const progressStats = useMemo(() => {
    const total = data.chapters.length;
    const done = data.chapters.filter(c => completedChapters.has(c.id)).length;
    return {
      total,
      done,
      percent: total > 0 ? Math.round((done / total) * 100) : 0
    };
  }, [data.chapters, completedChapters]);

  const handleOpenPdf = (pdf: any) => { setSelectedPdf(pdf); setNavVisible(false); };
  const handleClosePdf = () => { setSelectedPdf(null); setNavVisible(true); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-[#3A6EA5]" size={40} />
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-5 md:px-6 py-8 md:py-12 min-h-screen text-white">
      <Link href="/" className="group inline-flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.3em] mb-12 opacity-50 hover:opacity-100 transition-all">
        <ArrowLeft size={14} className="group-hover:-translate-x-1" /> {t.back}
      </Link>

      <header className="mb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div>
            <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest mb-4">
              <Beaker size={14} /> LU {data.parent?.slug?.toUpperCase()} UNIT
            </div>
            <div className="flex items-center gap-6">
               <span className="text-6xl md:text-8xl">{data.parent?.icon}</span>
               <div>
                  <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase italic leading-none">{data.parent?.title}</h1>
                  <p className="text-[#3A6EA5] font-black tracking-[0.2em] uppercase text-[10px] mt-4 opacity-60 italic">Faculty of Science • L1</p>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-6 p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-md">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-white/5" />
                <motion.circle 
                  cx="32" cy="32" r="28" stroke="#3A6EA5" strokeWidth="5" fill="transparent" 
                  strokeDasharray={175.9} 
                  animate={{ strokeDashoffset: 175.9 - (progressStats.percent / 100) * 175.9 }}
                />
              </svg>
              <span className="absolute text-[10px] font-black text-[#3A6EA5]">{progressStats.percent}%</span>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#3A6EA5]">Progress</p>
              <p className="text-2xl font-black">{progressStats.done}<span className="opacity-20 mx-1">/</span>{progressStats.total}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {data.subs.map((sub: any) => {
          const isOpen = openSections.includes(sub.id);
          const subChapters = data.chapters.filter((c: any) => c.subject_key === sub.slug);

          return (
            <section key={sub.id} className="border border-white/5 rounded-[2.5rem] overflow-hidden bg-white/[0.01]">
              <button 
                onClick={() => setOpenSections(prev => prev.includes(sub.id) ? prev.filter(i => i !== sub.id) : [...prev, sub.id])}
                className={`w-full sticky top-0 z-20 flex items-center justify-between p-6 md:p-8 transition-all backdrop-blur-xl ${isOpen ? 'bg-[#3A6EA5]/10 border-b border-[#3A6EA5]/20' : 'hover:bg-white/[0.03]'}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{sub.icon}</span>
                  <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">{sub.title}</h2>
                </div>
                <ChevronDown className={`transition-transform duration-500 ${isOpen ? 'rotate-180 text-[#3A6EA5]' : 'opacity-20'}`} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <div className="p-4 md:p-8 space-y-4">
                      {subChapters.length > 0 ? (
                        subChapters.map((chap: any) => (
                          <ChapterItem 
                            key={chap.id}
                            chap={chap}
                            isDone={completedChapters.has(chap.id)}
                            userId={userId}
                            onPreview={handleOpenPdf}
                            onToggle={toggleProgress}
                            getDownloadUrl={getDownloadUrl}
                          />
                        ))
                      ) : (
                        <div className="py-20 flex flex-col items-center opacity-30">
                          <Clock size={24} className="mb-4" />
                          <h4 className="font-black uppercase text-xs">Under Maintenance</h4>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>

      {/* Reader Modal stays same logic but uses getEmbedUrl helper */}
      <AnimatePresence>
        {selectedPdf && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClosePdf} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full h-full max-w-6xl bg-[#0a0a0a] md:rounded-[3rem] border border-white/10 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <span className="font-black uppercase text-[10px] tracking-[0.2em] px-4">{selectedPdf.title}</span>
                <button onClick={handleClosePdf} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button>
              </div>
              <div className="flex-grow bg-white">
                <iframe src={getEmbedUrl(selectedPdf.url)} className="w-full h-full border-none" loading="lazy" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}