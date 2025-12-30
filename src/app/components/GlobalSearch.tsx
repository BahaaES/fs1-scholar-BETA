"use client";
import { useState, useEffect, useRef, useContext } from "react";
import { Search, FileText, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageContext } from "./../layout"; // Ensure this path is correct

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ subjects: any[]; chapters: any[] }>({ subjects: [], chapters: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Access the current semester from Context
  const { semester } = useContext(LanguageContext);
  
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchData = async () => {
      if (query.length < 2) {
        setResults({ subjects: [], chapters: [] });
        return;
      }
      setLoading(true);

      // Search Subjects filtered by Semester
      const { data: subData } = await supabase
        .from("subjects")
        .select("*")
        .eq("semester", semester) // Filter by active semester
        .ilike("title", `%${query}%`);

      // Search Chapters filtered by Semester (joining via subjects table)
      const { data: chapData } = await supabase
        .from("chapters")
        .select("*, subjects!inner(parent_slug, semester)")
        .eq("subjects.semester", semester) // Only show chapters for current semester
        .ilike("title", `%${query}%`)
        .limit(5);

      setResults({ subjects: subData || [], chapters: chapData || [] });
      setLoading(false);
    };

    const timer = setTimeout(searchData, 300);
    return () => clearTimeout(timer);
  }, [query, semester]); // Re-run search if semester changes

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(path);
  };

  return (
    <div className="relative w-full md:w-auto" ref={searchRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-white/50" size={16} />
        <input
          type="text"
          placeholder="Search..."
          className="bg-black/20 border border-white/10 rounded-2xl py-2 pl-10 pr-10 text-sm w-full md:w-[250px] lg:w-[300px] lg:focus:w-[350px] focus:bg-black/40 outline-none transition-all placeholder:text-white/30"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 text-white/50 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (query.length > 1) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed inset-x-4 md:absolute md:inset-x-auto md:right-0 top-[70px] md:top-full mt-2 w-auto md:w-[400px] lg:w-[450px] shadow-2xl rounded-[1.5rem] md:rounded-[2rem] border border-white/10 overflow-hidden z-[100] p-1.5 md:p-2"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.98)', backdropFilter: 'blur(20px)', color: 'white' }}
          >
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#6366f1]" /></div>
            ) : (
              <div className="max-h-[60vh] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                
                {results.subjects.length > 0 && (
                  <div className="p-1 md:p-2">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-40 px-3 mb-2">Semester {semester} Modules</p>
                    {results.subjects.map(sub => (
                      <button 
                        key={sub.id}
                        onClick={() => handleNavigate(`/${sub.parent_slug || sub.slug}`)}
                        className="w-full flex items-center gap-3 p-2.5 md:p-3 hover:bg-white/5 rounded-xl md:rounded-2xl transition-all text-left group"
                      >
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-[#6366f1]/10 rounded-lg md:rounded-xl flex items-center justify-center text-lg md:text-xl shrink-0">
                          {sub.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs md:text-sm group-hover:text-[#6366f1] truncate">{sub.title}</p>
                          <p className="text-[9px] md:text-[10px] opacity-50 uppercase tracking-tighter truncate">{sub.slug}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {results.chapters.length > 0 && (
                  <div className="p-1 md:p-2 border-t border-white/5">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-40 px-3 my-2">Lessons & Documents</p>
                    {results.chapters.map(chap => (
                      <button 
                        key={chap.id}
                        onClick={() => handleNavigate(`/${chap.subjects.parent_slug}`)}
                        className="w-full flex items-center gap-3 p-2.5 md:p-3 hover:bg-white/5 rounded-xl md:rounded-2xl transition-all text-left group"
                      >
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-amber-500/10 rounded-lg md:rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                          <FileText size={16} className="md:w-[18px]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs md:text-sm group-hover:text-[#6366f1] truncate">{chap.title}</p>
                          <p className="text-[9px] md:text-[10px] opacity-50 uppercase tracking-tighter truncate">In {chap.subject_key}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {results.subjects.length === 0 && results.chapters.length === 0 && (
                  <div className="p-12 text-center opacity-40 text-[10px] font-black uppercase tracking-widest italic">
                    No resources found for Semester {semester}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}