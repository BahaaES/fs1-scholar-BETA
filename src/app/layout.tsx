"use client";
import { useState, useEffect, useRef, createContext, useCallback } from "react";
import "./globals.css";
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { 
  LogOut, ShieldCheck, Globe, ChevronDown,
  GraduationCap, LayoutDashboard, Clock, Search,
  Home, BookOpen, User, X, FileQuestion
} from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

import GlobalSearch from "./components/GlobalSearch";

export const LanguageContext = createContext({ lang: 'en' as 'en' | 'fr', setLang: (l: 'en' | 'fr') => {} });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthPage = pathname === '/auth';
  const isFocusPage = pathname === '/focus';
  const isQuizPage = pathname.includes('/quiz') || pathname.includes('/test');
  const isDashboard = pathname.startsWith('/dashboard');
  const isAdminPage = pathname.startsWith('/admin');

  const showGlobalNav = !isAuthPage && !isFocusPage && !isQuizPage && !isDashboard && !isAdminPage;

  const checkAdminStatus = useCallback(async (currentUser: any) => {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }
    const metaRole = currentUser.user_metadata?.role;
    if (metaRole === 'admin') {
      setIsAdmin(true);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(data?.role === 'admin');
    } catch (err) {
      console.warn("Profile check skipped.");
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const savedLang = localStorage.getItem("hub_lang") as 'en' | 'fr';
    if (savedLang) setLang(savedLang);

    const getInitialAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        checkAdminStatus(session.user);
      }
    };
    getInitialAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) checkAdminStatus(currentUser);
      else setIsAdmin(false);
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      authListener.subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  useEffect(() => {
    setIsProfileOpen(false);
    setIsMobileSearchOpen(false);
  }, [pathname]);

  const handleLanguageToggle = () => {
    const newLang = lang === 'en' ? 'fr' : 'en';
    setLang(newLang);
    localStorage.setItem("hub_lang", newLang);
  };

  return (
    <html lang={lang} className="dark">
      <body className="min-h-screen flex flex-col bg-[#050505] text-white selection:bg-[#3A6EA5]/30">
        <LanguageContext.Provider value={{ lang, setLang }}>
          
          {/* --- DESKTOP NAVBAR (LAPTOP) --- */}
          {showGlobalNav && (
            <nav className="hidden md:block bg-[#3A6EA5] text-white p-4 sticky top-0 z-50 shadow-lg border-b border-white/10">
              <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
                <Link href="/" className="flex items-center gap-3 group transition-transform active:scale-95">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                    <GraduationCap className="text-[#3A6EA5]" size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black tracking-tighter leading-none italic uppercase">
                      LU <span className="text-amber-400">SCIENCE</span> HUB
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] opacity-80">
                      Faculty of Science • L1 {lang === 'en' ? 'Bio' : 'Bio'}
                    </span>
                  </div>
                </Link>
                
                <div className="flex items-center gap-3">
                  <GlobalSearch />
                  
                  {/* QUIZ BUTTON REMOVED FROM HERE TO HIDE ON LAPTOPS */}

                  {user && (
                    <div className="relative" ref={dropdownRef}>
                      <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 bg-black/20 p-1 pr-3 rounded-full border border-white/10 hover:bg-black/30 transition-all">
                        <div className="w-8 h-8 bg-white text-[#3A6EA5] rounded-full flex items-center justify-center font-bold uppercase">
                          {user.email ? user.email[0] : 'U'}
                        </div>
                        <ChevronDown size={14} className={isProfileOpen ? 'rotate-180' : ''} />
                      </button>
                      <AnimatePresence>
                        {isProfileOpen && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-3 w-64 bg-[#0a0a0a] rounded-[2rem] shadow-2xl p-2 border border-white/10 z-[100]">
                            <Link href="/dashboard" className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-all text-sm font-bold">
                               <LayoutDashboard size={18} className="text-[#3A6EA5]" /> Dashboard
                            </Link>
                            {isAdmin && (
                              <Link href="/admin" className="w-full flex items-center gap-3 p-3 hover:bg-amber-400/10 rounded-2xl transition-all text-sm font-bold text-amber-400">
                                 <ShieldCheck size={18} /> Admin Panel
                              </Link>
                            )}
                            <button onClick={handleLanguageToggle} className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-all">
                               <div className="flex items-center gap-3"><Globe size={18} className="text-[#3A6EA5]" /><span className="text-sm font-bold">{lang === 'en' ? 'English' : 'Français'}</span></div>
                               <span className="text-[9px] font-black bg-[#3A6EA5]/20 text-[#3A6EA5] px-2 py-1 rounded-lg uppercase">{lang === 'en' ? 'FR' : 'EN'}</span>
                            </button>
                            <div className="h-[1px] my-2 mx-2 bg-white/5" />
                            <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 rounded-2xl transition-all text-sm font-bold text-red-500">
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
          )}

          {/* --- MOBILE SEARCH OVERLAY --- */}
          <AnimatePresence>
            {isMobileSearchOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
                className="fixed inset-0 bg-black z-[100] p-6 flex flex-col md:hidden"
              >
                <div className="flex justify-between items-center mb-8 mt-4">
                  <div className="flex flex-col">
                    <span className="font-black italic text-2xl uppercase tracking-tighter text-[#3A6EA5]">Archive Search</span>
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">University of Science</span>
                  </div>
                  <button onClick={() => setIsMobileSearchOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
                    <X size={24} />
                  </button>
                </div>
                <GlobalSearch />
              </motion.div>
            )}
          </AnimatePresence>

          {/* --- MOBILE NAVIGATION (PHONES) --- */}
          {showGlobalNav && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-2xl border-t border-white/10 z-[50] px-2 pt-3 pb-8 flex justify-around items-end">
              <Link href="/" className={`flex flex-col items-center gap-1.5 transition-all ${pathname === '/' ? 'text-[#3A6EA5] scale-110' : 'text-white/40'}`}>
                <Home size={22} />
                <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
              </Link>

              {/* QUIZ HUB REMAINS HERE FOR MOBILE */}
              <Link href="/quiz" className={`flex flex-col items-center gap-1.5 transition-all ${pathname.includes('/quiz') || pathname.includes('/test') ? 'text-[#3A6EA5] scale-110' : 'text-white/40'}`}>
                <FileQuestion size={22} />
                <span className="text-[8px] font-black uppercase tracking-widest">Quiz</span>
              </Link>

              {/* Search Trigger */}
              <button 
                onClick={() => setIsMobileSearchOpen(true)}
                className="bg-[#3A6EA5] p-4 rounded-2xl shadow-2xl shadow-[#3A6EA5]/40 text-white -translate-y-4 active:scale-90 transition-transform flex items-center justify-center"
              >
                <Search size={24} strokeWidth={3} />
              </button>

              <Link href="/focus" className={`flex flex-col items-center gap-1.5 transition-all ${pathname === '/focus' ? 'text-[#3A6EA5] scale-110' : 'text-white/40'}`}>
                <Clock size={22} />
                <span className="text-[8px] font-black uppercase tracking-widest">Focus</span>
              </Link>

              <button 
                onClick={() => setIsProfileOpen(true)} 
                className={`flex flex-col items-center gap-1.5 transition-all ${isProfileOpen ? 'text-[#3A6EA5]' : 'text-white/40'}`}
              >
                <User size={22} />
                <span className="text-[8px] font-black uppercase tracking-widest">Menu</span>
              </button>
            </div>
          )}

          {/* --- MOBILE MENU DRAWER --- */}
          <AnimatePresence>
            {isProfileOpen && (
              <div className="md:hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]" />
                <motion.div 
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 z-[70] rounded-t-[3rem] p-8 pb-14 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
                >
                  <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-10" />
                  <div className="space-y-3">
                    <Link href="/dashboard" className="w-full flex items-center gap-4 p-5 bg-white/5 rounded-[1.5rem] font-bold text-lg border border-white/5 active:bg-white/10 transition-all">
                      <LayoutDashboard className="text-[#3A6EA5]" /> Dashboard
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className="w-full flex items-center gap-4 p-5 bg-amber-400/5 rounded-[1.5rem] font-bold text-lg text-amber-400 border border-amber-400/10 active:bg-amber-400/10 transition-all">
                        <ShieldCheck /> Admin Panel
                      </Link>
                    )}
                    <button onClick={handleLanguageToggle} className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[1.5rem] font-bold text-lg border border-white/5 active:bg-white/10 transition-all">
                      <div className="flex items-center gap-4"><Globe className="text-[#3A6EA5]" /> {lang === 'en' ? 'English' : 'Français'}</div>
                      <span className="text-[10px] font-black bg-[#3A6EA5] px-3 py-1 rounded-lg uppercase tracking-widest">{lang === 'en' ? 'FR' : 'EN'}</span>
                    </button>
                    <div className="h-[1px] my-6 bg-white/10" />
                    <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-4 p-5 bg-red-500/5 rounded-[1.5rem] font-bold text-lg text-red-500 border border-red-500/10 active:bg-red-500/10 transition-all">
                      <LogOut /> Sign Out
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.main 
              key={pathname} 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className={`flex-grow ${showGlobalNav ? 'pb-24 md:pb-0' : ''}`}
            >
              {children}
            </motion.main>
          </AnimatePresence>
          
          {showGlobalNav && (
            <footer className="py-12 border-t mt-auto border-white/5 mb-24 md:mb-0">
              <div className="max-w-6xl mx-auto px-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">
                  Lebanese University • Faculty of Science • 2025
                </p>
              </div>
            </footer>
          )}

        </LanguageContext.Provider>
      </body>
    </html>
  );
}