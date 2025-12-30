"use client";
import { useState, useRef, useEffect } from "react";
import Link from 'next/link';
import { supabase } from "@/lib/supabase";
import { 
  GraduationCap, Clock, ChevronDown, LayoutDashboard, 
  ShieldCheck, Globe, LogOut, FileQuestion, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation"; 
import GlobalSearch from "../GlobalSearch"; 

// Added semester and toggleSemester to props
export default function DesktopNav({ user, isAdmin, lang, toggleLang, semester, toggleSemester }: any) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (!error) {
      setIsProfileOpen(false);
      router.push('/auth');
      router.refresh(); 
    }
  };

  return (
    <nav className="hidden md:block bg-black/40 backdrop-blur-xl text-white p-4 sticky top-0 z-50 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
        {/* LOGO SECTION */}
        <Link href="/" className="flex items-center gap-3 group transition-transform active:scale-95">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
            <GraduationCap className="text-[#6366f1]" size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter leading-none italic uppercase">
              UNIVERSITY <span className="text-[#6366f1]">PORTAL</span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] opacity-60">
              Lebanese University • Science Faculty
            </span>
          </div>
        </Link>
        
        {/* RIGHT SECTION */}
        <div className="flex items-center gap-4">
          <GlobalSearch />
          
          <Link href="/focus" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group">
            <Clock size={18} className="text-[#6366f1] group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-wider">Focus Mode</span>
          </Link>

          {user && (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 bg-black/20 p-1.5 pr-4 rounded-full border border-white/10 hover:bg-black/30 transition-all">
                <div className="w-8 h-8 bg-gradient-to-br from-[#6366f1] to-purple-600 text-white rounded-full flex items-center justify-center font-bold uppercase shadow-inner text-xs">
                  {user.email ? user.email[0] : 'U'}
                </div>
                <ChevronDown size={14} className={`opacity-40 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-4 w-64 bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl p-2 border border-white/10 z-[100]">
                    <Link href="/dashboard" className="w-full flex items-center gap-3 p-3.5 hover:bg-white/5 rounded-2xl transition-all text-sm font-bold group">
                       <LayoutDashboard size={18} className="text-[#6366f1] group-hover:scale-110 transition-transform" /> Dashboard
                    </Link>
                    
                    <Link href="/quiz" className="w-full flex items-center gap-3 p-3.5 hover:bg-white/5 rounded-2xl transition-all text-sm font-bold group">
                       <FileQuestion size={18} className="text-[#6366f1] group-hover:scale-110 transition-transform" /> Assessments
                    </Link>

                    {isAdmin && (
                      <Link href="/admin" className="w-full flex items-center gap-3 p-3.5 hover:bg-amber-400/10 rounded-2xl transition-all text-sm font-bold text-amber-400">
                         <ShieldCheck size={18} /> Admin Panel
                      </Link>
                    )}

                    <div className="h-[1px] my-1 mx-2 bg-white/5" />

                    {/* SEMESTER SWITCHER */}
                    <button onClick={toggleSemester} className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl transition-all">
                       <div className="flex items-center gap-3"><Layers size={18} className="text-[#6366f1]" /><span className="text-sm font-bold">Semester {semester}</span></div>
                       <span className="text-[9px] font-black bg-[#6366f1]/20 text-[#6366f1] px-2 py-1 rounded-lg uppercase">S{semester === 1 ? '2' : '1'}</span>
                    </button>

                    {/* LANGUAGE SWITCHER */}
                    <button onClick={toggleLang} className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl transition-all">
                       <div className="flex items-center gap-3"><Globe size={18} className="text-[#6366f1]" /><span className="text-sm font-bold">{lang === 'en' ? 'English' : 'Français'}</span></div>
                       <span className="text-[9px] font-black bg-[#6366f1]/20 text-[#6366f1] px-2 py-1 rounded-lg uppercase">{lang === 'en' ? 'FR' : 'EN'}</span>
                    </button>

                    <div className="h-[1px] my-2 mx-2 bg-white/5" />
                    
                    <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-3.5 hover:bg-red-500/10 rounded-2xl transition-all text-sm font-bold text-red-500">
                      <LogOut size={18} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}