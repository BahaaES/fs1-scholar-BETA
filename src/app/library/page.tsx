"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FileText, Search, Download, CheckCircle, 
  BookOpen, X, Loader2, ExternalLink,
  ArrowLeft, Eye, Filter, Sparkles, FileStack
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

// Define the library categories
const CATEGORIES = [
  { id: "All", label: "Everything", icon: <FileStack size={14} /> },
  { id: "Exam", label: "Past Exams", icon: <FileText size={14} /> },
  { id: "Summary", label: "Student Notes", icon: <Sparkles size={14} /> },
  { id: "Lab", label: "Lab Reports", icon: <BookOpen size={14} /> },
  { id: "Exercise", label: "Extra Practice", icon: <CheckCircle size={14} /> },
];

export default function LibraryPage() {
  const router = useRouter();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/auth');
      } else {
        setCheckingAuth(false);
      }
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;

    async function fetchResources() {
      // Assuming your table is renamed to 'library_resources' 
      // or you are using 'past_exams' with an added 'type' column
      const { data } = await supabase
        .from('past_exams') 
        .select(`*, subjects(title, slug)`)
        .order('created_at', { ascending: false });
      if (data) setResources(data);
      setLoading(false);
    }
    fetchResources();
  }, [checkingAuth]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#6366f1]" size={32} />
      </div>
    );
  }

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    return url.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
  };

  const filteredResources = resources.filter(res => {
    const matchesSearch = 
      res.subjects?.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      res.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.module_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || res.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 md:pt-12">
        
        {/* BACK BUTTON */}
        <motion.button 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/40 hover:text-white mb-6 md:mb-8 transition-colors group"
        >
          <div className="p-2 rounded-xl bg-white/5 group-hover:bg-[#6366f1]/20 group-hover:text-[#6366f1] transition-all">
            <ArrowLeft size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
        </motion.button>

        {/* HEADER */}
        <header className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 text-[#6366f1] mb-2">
            <BookOpen size={18} className="md:w-5 md:h-5" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Academic Commons</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-none">
            Student <span className="text-[#6366f1]">Library</span>
          </h1>
          <p className="text-white/40 text-[10px] md:text-xs font-medium mt-3 uppercase tracking-wider">
            Crowdsourced notes, exams, and verified resources
          </p>
        </header>

        {/* SEARCH & FILTERS */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <input 
              type="text"
              placeholder="Search by subject, code or topic..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-[#6366f1]/50 outline-none transition-all font-bold text-white placeholder:text-white/20"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 md:mx-0 md:px-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                  selectedCategory === cat.id 
                  ? "bg-[#6366f1] border-[#6366f1] text-white shadow-lg shadow-[#6366f1]/20" 
                  : "bg-white/5 text-white/40 border-white/5 hover:border-white/20"
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* RESOURCE LIST */}
        <div className="space-y-3">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-20">
               <Loader2 className="animate-spin mb-2" />
               <p className="text-xs font-black uppercase tracking-widest">Opening Archives...</p>
             </div>
          ) : filteredResources.length > 0 ? (
            filteredResources.map((res) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={res.id}
                className="bg-white/[0.02] p-4 rounded-[1.8rem] flex items-center justify-between group border border-white/5 hover:border-[#6366f1]/30 hover:bg-white/[0.04] transition-all gap-3"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${res.has_solution ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[#6366f1]/10 text-[#6366f1]'}`}>
                    <FileText size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-black uppercase tracking-tight leading-none mb-1.5 truncate">
                      {res.subjects?.slug || res.module_code} — {res.title || res.session_type}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">
                        {res.year || 'No Date'} • {res.type || 'Resource'}
                      </span>
                      {res.has_solution && (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter flex items-center gap-1 shrink-0">
                          <CheckCircle size={8} /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                   <button 
                    onClick={() => setSelectedPdf(res.file_url)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <Eye size={16} />
                    <span className="hidden sm:block">Open</span>
                  </button>
                  <button 
                    onClick={() => window.open(res.file_url, '_blank')}
                    className="p-3 bg-white/5 rounded-xl hover:bg-[#6366f1] hover:text-white transition-all text-white/40"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-white/[0.02] rounded-[2rem] border border-dashed border-white/10">
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-20">No matching documents found</p>
            </div>
          )}
        </div>
      </div>

      {/* PDF VIEWER MODAL */}
      <AnimatePresence>
        {selectedPdf && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedPdf(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full h-full max-w-6xl bg-[#0a0a0a] rounded-[2rem] md:rounded-[3rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3 ml-4">
                  <div className="w-8 h-8 rounded-lg bg-[#6366f1]/20 flex items-center justify-center">
                    <FileText size={16} className="text-[#6366f1]" />
                  </div>
                  <span className="font-black uppercase text-[10px] tracking-widest">Library Reader</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => window.open(selectedPdf, '_blank')} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
                    <ExternalLink size={18} />
                  </button>
                  <button onClick={() => setSelectedPdf(null)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-grow bg-white relative">
                <iframe src={getEmbedUrl(selectedPdf)} className="w-full h-full border-none" allow="autoplay" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}