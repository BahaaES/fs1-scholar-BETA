"use client";
import { useEffect, useState, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Trash2, Loader2, Search, Inbox, X, GraduationCap, 
  Download, FileText
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

  // --- 1. NAV VISIBILITY CONTROL ---
  useEffect(() => {
    setNavVisible(false); // Hide nav/footer on enter
    return () => setNavVisible(true); // Show nav/footer on exit
  }, [setNavVisible]);

  // --- 2. HELPERS ---
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

  // --- 3. DATA FETCHING (Optimized manual join) ---
  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/auth");

      // Get initial bookmarks
      const { data: bData, error: bError } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bError) throw bError;

      if (bData && bData.length > 0) {
        const chapterIds = bData.map(b => b.resource_id);

        // Fetch chapters and their subject icons separately to avoid 400 error
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

  // --- 4. ACTIONS ---
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
    if(!url) return alert("Link not found");
    setSelectedPdf({ url, title });
    // Keep nav hidden while PDF is open
    setNavVisible(false);
  };

  const handleClosePdf = () => {
    setSelectedPdf(null);
    // Page is already in "hide nav" mode, cleanup handles the rest
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-[#3A6EA5]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#3A6EA5]/30">
      <div className="max-w-6xl mx-auto px-5 py-10">
        
        {/* Header Section */}
        <button 
          onClick={() => router.push("/")} 
          className="group inline-flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.3em] mb-12 opacity-50 hover:opacity-100 transition-all"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1" /> {t.back}
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
          <div>
            <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter mb-2">
              Saved <span className="opacity-30">Archive</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3A6EA5]">
              Quick access to your curated library
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <input 
              type="text" 
              placeholder="Search saved items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[#3A6EA5] transition-all"
            />
          </div>
        </div>

        {/* Grid Section */}
        {filteredBookmarks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredBookmarks.map((item) => (
                <motion.div 
                  key={item.id} 
                  layout
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className="text-4xl bg-[#3A6EA5]/10 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      {item.subject_icon}
                    </div>
                    <button 
                      onClick={() => removeBookmark(item.id)} 
                      className="p-3 rounded-xl bg-red-500/0 hover:bg-red-500/10 text-white/10 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="flex-grow">
                    <span className="text-[9px] font-black text-[#3A6EA5] uppercase tracking-[0.2em] block mb-2 opacity-60">
                      {item.subject_name}
                    </span>
                    <h3 className="text-xl font-black uppercase italic leading-tight group-hover:text-[#3A6EA5] transition-colors">
                      {item.resource_name}
                    </h3>
                  </div>

                  <div className="mt-10 grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleOpenPdf(item.file_url, item.resource_name)}
                      className="py-4 rounded-2xl border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={14} /> {t.preview}
                    </button>
                    <a 
                      href={getDownloadUrl(item.file_url)} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-4 rounded-2xl bg-[#3A6EA5] text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={14} /> {t.download}
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-40 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 opacity-20">
              <Inbox size={32} />
            </div>
            <p className="font-black uppercase tracking-[0.3em] opacity-20">Archive Empty</p>
          </div>
        )}
      </div>

      {/* PDF Modal Section */}
      <AnimatePresence>
        {selectedPdf && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={handleClosePdf} 
              className="absolute inset-0 bg-black/95 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative w-full h-full max-w-6xl bg-[#0a0a0a] md:rounded-[3rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-4 px-4">
                  <div className="w-8 h-8 rounded-xl bg-[#3A6EA5]/20 flex items-center justify-center text-[#3A6EA5]">
                    <GraduationCap size={18} />
                  </div>
                  <span className="font-black uppercase text-[10px] tracking-[0.2em]">{selectedPdf.title}</span>
                </div>
                <button 
                  onClick={handleClosePdf} 
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X size={18} />
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