"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FileText, Search, Download, CheckCircle, 
  BookOpen, X, Loader2, ExternalLink,
  ArrowLeft, Eye, Filter, Sparkles, FileStack, Archive, Layers, Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

// Updated categories to match your new DB "category" column
const CATEGORIES = [
  { id: "All", label: "Everything", icon: <FileStack size={14} /> },
  { id: "Past Exam", label: "Exams", icon: <Archive size={14} /> },
  { id: "Summary / Notes", label: "Notes", icon: <Sparkles size={14} /> },
  { id: "Course Material", label: "Material", icon: <Layers size={14} /> },
  { id: "Student File", label: "Student", icon: <Users size={14} /> },
];

export default function LibraryPage() {
  const router = useRouter();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [activeSemester, setActiveSemester] = useState<number>(1);

  // Auth Check
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

  // Fetch Resources from the new 'library' table
  useEffect(() => {
    if (checkingAuth) return;

    async function fetchResources() {
      setLoading(true);
      const { data, error } = await supabase
        .from('library') // Table name updated from 'past_exams'
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
    // Search matches label (formerly module_code), subject title, or category
    const matchesSearch = 
      res.subjects?.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      res.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || res.category === selectedCategory;
    
    // Optional: Filter by active semester if you want to separate them in UI
    const matchesSemester = res.semester === activeSemester;

    return matchesSearch && matchesCategory && matchesSemester;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 md:pt-12">
        
        {/* SEMESTER PICKER */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 mb-8 w-fit mx-auto">
          {[1, 2].map(sem => (
            <button 
              key={sem}
              onClick={() => setActiveSemester(sem)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSemester === sem ? 'bg-[#6366f1] text-white shadow-lg' : 'text-white/20 hover:text-white'}`}
            >
              Semester {sem}
            </button>
          ))}
        </div>

        {/* HEADER */}
        <header className="mb-6 md:mb-8 text-center">
          <div className="flex items-center justify-center gap-2 text-[#6366f1] mb-2">
            <Archive size={18} className="md:w-5 md:h-5" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Academic Archives</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-none">
            Resource <span className="text-[#6366f1]">Library</span>
          </h1>
        </header>

        {/* SEARCH & FILTERS */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <input 
              type="text"
              placeholder="Search exams, notes, or subject codes..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-[#6366f1]/50 outline-none transition-all font-bold text-white placeholder:text-white/20"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
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
               <p className="text-xs font-black uppercase tracking-widest">Accessing Vault S{activeSemester}...</p>
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
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${res.category === 'Past Exam' ? 'bg-[#6366f1]/10 text-[#6366f1]' : 'bg-amber-500/10 text-amber-500'}`}>
                    {res.category === 'Past Exam' ? <Archive size={22} /> : <FileText size={22} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-black uppercase tracking-tight leading-none mb-1.5 truncate">
                      {res.label}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">
                        {res.subjects?.title || res.subject_slug} • {res.year}
                      </span>
                      <span className="text-[8px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shrink-0">
                         {res.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                   <button 
                    onClick={() => setSelectedPdf(res.file_url)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <Eye size={16} />
                    <span className="hidden sm:block">Preview</span>
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
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-20">No archives found for this filter</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL REMAINS THE SAME (PDF VIEWER) */}
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
               className="relative w-full h-full max-w-6xl bg-[#0a0a0a] rounded-[2rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
             >
               <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                 <span className="font-black uppercase text-[10px] tracking-widest ml-4">Secured Reader</span>
                 <button onClick={() => setSelectedPdf(null)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all">
                   <X size={18} />
                 </button>
               </div>
               <div className="flex-grow bg-white">
                 <iframe src={getEmbedUrl(selectedPdf)} className="w-full h-full border-none" />
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}