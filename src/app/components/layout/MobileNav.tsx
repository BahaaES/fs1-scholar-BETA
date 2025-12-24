"use client";
import { useState } from "react";
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Home, FileQuestion, Search, Clock, User, X, 
  LayoutDashboard, ShieldCheck, Globe, LogOut 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GlobalSearch from "../GlobalSearch"; // Adjust path as needed

export default function MobileNav({ user, isAdmin, lang, toggleLang }: any) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* MOBILE SEARCH OVERLAY */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 bg-[#050505] z-[100] flex flex-col md:hidden"
          >
            <div className="flex items-center gap-4 p-4 border-b border-white/5">
              <button onClick={() => setIsMobileSearchOpen(false)} className="p-2 bg-white/5 rounded-xl"><X size={20}/></button>
              <div className="flex-grow"><GlobalSearch /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE FLOATING DOCK */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="mx-auto max-w-[95%] mb-6 pointer-events-auto">
          <div className="bg-[#0f0f0f]/80 backdrop-blur-3xl border border-white/10 p-2 rounded-[2rem] flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            
            <Link href="/" className={`flex-1 flex flex-col items-center py-2 transition-all ${pathname === '/' ? 'text-[#3A6EA5]' : 'text-white/20'}`}>
              <Home size={20} strokeWidth={pathname === '/' ? 2.5 : 2} />
              <span className="text-[7px] font-bold uppercase tracking-tighter mt-1">Home</span>
            </Link>

            <Link href="/quiz" className={`flex-1 flex flex-col items-center py-2 transition-all ${pathname.includes('/quiz') ? 'text-[#3A6EA5]' : 'text-white/20'}`}>
              <FileQuestion size={20} />
              <span className="text-[7px] font-bold uppercase tracking-tighter mt-1">Quiz</span>
            </Link>

            <button 
              onClick={() => setIsMobileSearchOpen(true)}
              className="w-14 h-14 bg-[#3A6EA5] rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-75 transition-transform"
            >
              <Search size={24} strokeWidth={3} />
            </button>

            <Link href="/focus" className={`flex-1 flex flex-col items-center py-2 transition-all ${pathname === '/focus' ? 'text-[#3A6EA5]' : 'text-white/20'}`}>
              <Clock size={20} />
              <span className="text-[7px] font-bold uppercase tracking-tighter mt-1">Focus</span>
            </Link>

            <button 
              onClick={() => setIsProfileOpen(true)} 
              className={`flex-1 flex flex-col items-center py-2 transition-all ${isProfileOpen ? 'text-[#3A6EA5]' : 'text-white/20'}`}
            >
              <User size={20} />
              <span className="text-[7px] font-bold uppercase tracking-tighter mt-1">Menu</span>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU SHEET */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="md:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-white/10 z-[70] rounded-t-[2.5rem] p-6 pb-12 overflow-hidden"
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6" />
              
              <div className="bg-white/5 rounded-3xl p-4 flex items-center gap-4 mb-4 border border-white/5">
                <div className="w-12 h-12 bg-[#3A6EA5] rounded-2xl flex items-center justify-center font-black text-xl">{user?.email ? user.email[0].toUpperCase() : 'U'}</div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black truncate">{user?.email}</span>
                  <span className="text-[9px] uppercase tracking-widest text-[#3A6EA5] font-bold">{isAdmin ? 'Administrator' : 'Student Access'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Link href="/dashboard" className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl font-bold transition-all active:scale-[0.98]">
                  <LayoutDashboard size={20} className="text-[#3A6EA5]" /> <span className="text-sm">Student Dashboard</span>
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="w-full flex items-center gap-4 p-4 bg-amber-400/10 text-amber-400 rounded-2xl font-bold">
                    <ShieldCheck size={20} /> <span className="text-sm">Admin Control</span>
                  </Link>
                )}
                <button onClick={toggleLang} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl font-bold">
                  <div className="flex items-center gap-4"><Globe size={20} className="text-[#3A6EA5]" /> <span className="text-sm">Language</span></div>
                  <span className="text-[10px] bg-[#3A6EA5] px-2 py-0.5 rounded-lg">{lang === 'en' ? 'FR' : 'EN'}</span>
                </button>
                <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-4 p-4 bg-red-500/10 text-red-500 rounded-2xl font-bold mt-4">
                  <LogOut size={20} /> <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}