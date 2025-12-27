"use client";
import { useEffect, useState, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Trash2, Loader2, Search, Inbox, X, GraduationCap, 
  Download, FileText, Sparkles
} from "lucide-react";
import { LanguageContext } from '../layout';
import { translations } from '../translations';

export default function SavedResourcesPage() {
  const router = useRouter();
  const { lang, setNavVisible } = useContext(LanguageContext);
  const t = translations[lang as 'en' | 'fr'];

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPdf, setSelectedPdf] = useState<{url: string, title: string} | null>(null);

  useEffect(() => {
    setNavVisible(false);
    return () => setNavVisible(true);
  }, [setNavVisible]);

  const getDownloadUrl = (url: string) => {
    if (!url || !url.includes('drive.google.com')) return url;
    const parts = url.split('/d/');
    if (parts.length > 1) {
      const fileId = parts[1].split('/')[0];
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return url;
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    return url.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
  };

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/auth");

      const { data: bData, error: bError } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bError) throw bError;

      if (bData && bData.length > 0) {
        const chapterIds = bData.map(b => b.resource_id);

        const { data: cData, error: cError } = await supabase
          .from("chapters")
          .select(`
            id, 
            file_url, 
            subject_key,
            subjects (icon, title)
          `)
          .in("id", chapterIds);

        if (cError) throw cError;

        const enriched = bData.map(bookmark => {
          const relatedChapter = cData?.find(chap => chap.id === bookmark.resource_id);
          return {
            ...bookmark,
            file_url: relatedChapter?.file_url || "", 
            subject_icon: (relatedChapter?.subjects as any)?.icon || "📄",
            subject_name: (relatedChapter?.subjects as any)?.title || "Resource"
          };
        });

        setBookmarks(enriched);
      } else {
        setBookmarks([]);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const removeBookmark = async (id: string) => {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (!error) setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(b =>
      b.resource_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [bookmarks, searchQuery]);

  const handleOpenPdf = (url: string, title: string) => {
    if(!url) return;
    setSelectedPdf({ url, title });
    setNavVisible(false);
  };

  const handleClosePdf = () => {
    setSelectedPdf(null);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020202]">
      <Loader2 className="animate-spin text-[#6366f1] mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Accessing Archive...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-[#6366f1]/30 relative overflow-x-hidden">
      
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 w-[50%] h-[40%] bg-[#6366f1]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        
        {/* Header Section */}
        <motion.button 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 0.5, x: 0 }}
          whileHover={{ opacity: 1, x: -5 }}
          onClick={() => router.push("/")} 
          className="group inline-flex items-center gap-3 font-black text-[11px] uppercase tracking-[0.3em] mb-12 transition-all"
        >
          <ArrowLeft size={16} className="text-[#6366f1]" /> {t.back}
        </motion.button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-20">
          <div>
            <div className="flex items-center gap-3 mb-4">
               <Sparkles size={20} className="text-[#6366f1]" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6366f1]">Your Collection</p>
            </div>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.8] mb-2">
              Saved <span className="text-white/10 not-italic">Archive</span>
            </h1>
          </div>
          
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#6366f1] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Filter your resources..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm focus:outline-none focus:border-[#6366f1]/50 focus:bg-white/[0.06] transition-all placeholder:text-white/20 font-bold"
            />
          </div>
        </div>

        {/* Grid Section */}
        {filteredBookmarks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredBookmarks.map((item) => (
                <motion.div 
                  key={item.id} 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative p-8 rounded-[3rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#6366f1]/20 transition-all flex flex-col h-full overflow-hidden shadow-xl"
                >
                  <div className="flex justify-between items-start mb-10">
                    <div className="text-4xl bg-[#6366f1]/10 w-20 h-20 rounded-[1.8rem] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#6366f1]/20 transition-all duration-500 shadow-lg shadow-[#6366f1]/5">
                      {item.subject_icon}
                    </div>
                    <button 
                      onClick={() => removeBookmark(item.id)} 
                      className="p-4 rounded-2xl bg-white/0 hover:bg-red-500/10 text-white/5 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  <div className="flex-grow">
                    <span className="text-[10px] font-black text-[#6366f1] uppercase tracking-[0.2em] block mb-3 opacity-60">
                      {item.subject_name}
                    </span>
                    <h3 className="text-2xl font-black uppercase italic leading-tight group-hover:text-white transition-colors">
                      {item.resource_name}
                    </h3>
                  </div>

                  <div className="mt-12 grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleOpenPdf(item.file_url, item.resource_name)}
                      className="py-5 rounded-[1.5rem] border border-white/5 bg-white/[0.03] text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={16} /> {t.preview}
                    </button>
                    <a 
                      href={getDownloadUrl(item.file_url)} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-5 rounded-[1.5rem] bg-[#6366f1] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#4f46e5] hover:shadow-lg hover:shadow-[#6366f1]/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={16} /> {t.download}
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="py-40 flex flex-col items-center justify-center text-center"
          >
            <div className="w-24 h-24 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8">
              <Inbox size={40} className="text-[#6366f1] opacity-20" />
            </div>
            <h2 className="font-black uppercase tracking-[0.4em] text-white/20 text-sm">Archive Empty</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/10 mt-2">Bookmark chapters to see them here</p>
          </motion.div>
        )}
      </div>

      {/* PDF Modal Section */}
      <AnimatePresence>
        {selectedPdf && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={handleClosePdf} 
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl" 
            />
            <motion.div 
              initial={{ y: 50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 50, opacity: 0 }} 
              className="relative w-full h-full max-w-6xl bg-[#0a0a0a] md:rounded-[3.5rem] border border-white/10 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(99,102,241,0.1)]"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-5 px-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#6366f1]/20 flex items-center justify-center text-[#6366f1]">
                    <GraduationCap size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">{selectedPdf.title}</span>
                    <span className="text-[9px] font-bold text-[#6366f1] uppercase tracking-[0.1em]">Student Archive</span>
                  </div>
                </div>
                <button 
                  onClick={handleClosePdf} 
                  className="p-4 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-grow bg-white">
                <iframe 
                  src={getEmbedUrl(selectedPdf.url)} 
                  className="w-full h-full border-none" 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}