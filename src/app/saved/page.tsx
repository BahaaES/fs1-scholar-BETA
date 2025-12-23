"use client";
import { useEffect, useState, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Trash2, Loader2, Search, Inbox, X, GraduationCap, 
  Download, ExternalLink 
} from "lucide-react";
import { LanguageContext } from '../layout';
import { translations } from '../translations';

export default function SavedResourcesPage() {
  const router = useRouter();
  const { lang } = useContext(LanguageContext);
  const t = translations[lang as 'en' | 'fr'];

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    return url.includes('drive.google.com') 
      ? url.replace('/view?usp=sharing', '/preview').replace('/view', '/preview') 
      : url;
  };

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/auth");

      // 1. Fetch simple bookmark data
      const { data: bData, error: bError } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bError) throw bError;

      if (bData && bData.length > 0) {
        // 2. Filter for valid UUIDs to avoid 400 Bad Request error
        const validIds = bData
          .map(b => b.resource_id)
          .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

        if (validIds.length > 0) {
          // 3. Fetch Chapter data (REMOVED 'icon' because it doesn't exist in your DB)
          const { data: cData, error: cError } = await supabase
            .from("chapters")
            .select("id, subject_key, file_url") // icon removed here
            .in("id", validIds);

          if (cError) console.error("Chapter Fetch Error:", cError);

          const enriched = bData.map(b => {
            const chap = cData?.find(c => c.id === b.resource_id);
            return {
              ...b,
              file_url: chap?.file_url || null,
              chapterInfo: chap || null
            };
          });
          setBookmarks(enriched);
        } else {
          setBookmarks(bData.map(b => ({ ...b, chapterInfo: null })));
        }
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

  const filteredBookmarks = bookmarks.filter(b =>
    b.resource_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-[#3A6EA5]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-6xl mx-auto px-5 py-10">
        
        {/* BACK BUTTON */}
        <button onClick={() => router.push("/")} className="group inline-flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.3em] mb-12 opacity-50 hover:opacity-100 transition-all">
          <ArrowLeft size={14} className="group-hover:-translate-x-1" /> {t.back}
        </button>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
          <h1 className="text-5xl font-black italic uppercase brand-gradient tracking-tighter">
            Saved <span className="text-white">Archive</span>
          </h1>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <input 
              type="text" placeholder="Search..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[#3A6EA5]"
            />
          </div>
        </div>

        {/* GRID */}
        {filteredBookmarks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredBookmarks.map((item) => (
                <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 rounded-[2rem] border border-white/5 bg-white/[0.02] flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-4xl bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center">
                      📄 {/* Fallback emoji since icon column is missing */}
                    </div>
                    <button onClick={() => removeBookmark(item.id)} className="text-white/10 hover:text-red-500 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  <div className="flex-grow">
                    <span className="text-[10px] font-bold text-[#3A6EA5] uppercase tracking-widest block mb-2">
                      {item.chapterInfo?.subject_key || "RESOURCE"}
                    </span>
                    <h3 className="text-xl font-black uppercase italic leading-tight">{item.resource_name}</h3>
                  </div>

                  <div className="mt-8 flex flex-col gap-3">
                    <button 
                      onClick={() => item.file_url ? setSelectedPdf(item.file_url) : alert("No Link Found")}
                      className="w-full py-4 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                    >
                      {t.preview}
                    </button>
                    <a 
                      href={item.file_url} target="_blank"
                      className="w-full py-4 rounded-xl bg-[#3A6EA5] text-white text-center text-[10px] font-black uppercase tracking-widest"
                    >
                      {t.download}
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-40 flex flex-col items-center opacity-20">
            <Inbox size={48} className="mb-4" />
            <p className="font-black uppercase tracking-widest">Archive Empty</p>
          </div>
        )}
      </div>

      {/* PDF MODAL */}
      <AnimatePresence>
        {selectedPdf && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8">
            <div className="absolute inset-0 bg-black/90" onClick={() => setSelectedPdf(null)} />
            <div className="relative w-full h-full max-w-6xl bg-[#0a0a0a] md:rounded-[2rem] overflow-hidden border border-white/10 flex flex-col">
               <div className="p-4 border-b border-white/5 flex justify-between items-center">
                 <div className="flex items-center gap-2"><GraduationCap className="text-[#3A6EA5]" size={20}/> <span className="font-bold uppercase text-[10px] tracking-widest">Reader</span></div>
                 <button onClick={() => setSelectedPdf(null)} className="p-2 bg-red-500/10 text-red-500 rounded-lg"><X size={20}/></button>
               </div>
               <iframe src={getEmbedUrl(selectedPdf)} className="w-full h-full border-none bg-white" />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}