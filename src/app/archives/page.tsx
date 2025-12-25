"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FileText, Search, Download, CheckCircle, 
  GraduationCap, X, Loader2, ExternalLink,
  ArrowLeft, Eye 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function ArchivesPage() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true); // Added for security check
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

  // 1. SECURITY GATE: Check if user is logged in before doing anything
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

  // 2. DATA FETCHING: Only runs if security check passes
  useEffect(() => {
    if (checkingAuth) return;

    async function fetchExams() {
      const { data } = await supabase
        .from('past_exams')
        .select(`*, subjects(title, slug)`)
        .order('year', { ascending: false });
      if (data) setExams(data);
      setLoading(false);
    }
    fetchExams();
  }, [checkingAuth]);

  // If we are still verifying the user's account, show a full-screen loader
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#3A6EA5]" size={32} />
      </div>
    );
  }

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes('drive.google.com')) {
      return url.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
    }
    return url;
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = 
      exam.subjects?.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      exam.subjects?.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.module_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = selectedYear === "All" || exam.year.toString() === selectedYear;
    return matchesSearch && matchesYear;
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
          <div className="p-2 rounded-xl bg-white/5 group-hover:bg-[#3A6EA5]/20 group-hover:text-[#3A6EA5] transition-all">
            <ArrowLeft size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Return</span>
        </motion.button>

        {/* HEADER */}
        <header className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 text-[#3A6EA5] mb-2">
            <GraduationCap size={18} className="md:w-5 md:h-5" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">Official Archives</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic brand-gradient">Past Exams</h1>
        </header>

        {/* SEARCH & FILTERS */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <input 
              type="text"
              placeholder="Search B1100, Bio, Math..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 md:py-4 pl-12 pr-4 text-sm focus:border-[#3A6EA5]/50 outline-none transition-all font-bold text-white"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 md:mx-0 md:px-0">
            {["All", "2024", "2023", "2022", "2021"].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-5 md:px-6 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  selectedYear === year ? "bg-[#3A6EA5] text-white shadow-lg shadow-[#3A6EA5]/20" : "bg-white/5 text-white/40 border border-white/5"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* LIST OF EXAMS */}
        <div className="space-y-3">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-20">
               <Loader2 className="animate-spin mb-2" />
               <p className="text-xs font-black uppercase tracking-widest">Accessing Vault...</p>
             </div>
          ) : filteredExams.length > 0 ? (
            filteredExams.map((exam) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={exam.id}
                className="glass-card p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-between group border border-white/5 hover:border-white/10 transition-all gap-3"
              >
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#3A6EA5]/10 flex items-center justify-center text-[#3A6EA5] shrink-0 group-hover:bg-[#3A6EA5] group-hover:text-white transition-colors">
                    <FileText size={20} className="md:w-[22px] md:h-[22px]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[11px] md:text-[13px] font-black uppercase tracking-tight leading-none mb-1 truncate">
                      {exam.subjects?.slug || exam.module_code} — {exam.session_type}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] md:text-[10px] opacity-40 font-bold tracking-tighter shrink-0">{exam.year} Session</span>
                      {exam.has_solution && (
                        <span className="text-[7px] md:text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter flex items-center gap-1 shrink-0">
                          <CheckCircle size={8} /> Solved
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                   <button 
                    onClick={() => setSelectedPdf(exam.file_url)}
                    className="flex md:flex items-center gap-2 p-3 md:px-4 md:py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <Eye size={16} className="md:hidden" />
                    <span className="hidden md:block">View</span>
                  </button>
                  <button 
                    onClick={() => window.open(exam.file_url, '_blank')}
                    className="p-3 bg-white/5 rounded-xl hover:bg-[#3A6EA5] hover:text-white transition-all"
                  >
                    <Download size={16} className="md:w-[18px] md:h-[18px]" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 opacity-30">
              <p className="text-sm font-bold italic uppercase">No exams found in this sector.</p>
            </div>
          )}
        </div>
      </div>

      {/* PDF VIEWER MODAL */}
      <AnimatePresence>
        {selectedPdf && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedPdf(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full h-full max-w-5xl bg-[#0a0a0a] rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-3 md:p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-2 md:gap-3 ml-2 md:ml-4">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-[#3A6EA5]/20 flex items-center justify-center">
                    <FileText size={14} className="text-[#3A6EA5] md:w-4 md:h-4" />
                  </div>
                  <span className="font-black uppercase text-[8px] md:text-[10px] tracking-widest truncate max-w-[120px] xs:max-w-none">Document Reader</span>
                </div>
                <div className="flex gap-1 md:gap-2">
                  <button 
                    onClick={() => window.open(selectedPdf, '_blank')}
                    className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all"
                  >
                    <ExternalLink size={18} />
                  </button>
                  <button 
                    onClick={() => setSelectedPdf(null)}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"
                  >
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
    </div>
  );
}