"use client";
import { useState, useEffect, createContext, useCallback } from "react";
import "./globals.css";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ShieldCheck, Globe, Instagram, Send, Loader2, GraduationCap } from "lucide-react";

import DesktopNav from "./components/layout/DesktopNav";
import MobileNav from "./components/layout/MobileNav";

export const LanguageContext = createContext({ 
  lang: 'en' as 'en' | 'fr', 
  setLang: (l: 'en' | 'fr') => {},
  isNavVisible: true,
  setNavVisible: (v: boolean) => {} 
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const [isNavVisible, setNavVisible] = useState(true); 
  const [isLoading, setIsLoading] = useState(true); // Control the global loader
  const pathname = usePathname();

  const isAuthPage = pathname === '/auth';
  const isFocusPage = pathname === '/focus';
  const isSavedPage = pathname === '/saved';
  const isSupportPage = pathname === '/support';
  const isQuizPage = pathname.includes('/quiz') || pathname.includes('/test');
  const isDashboard = pathname.startsWith('/dashboard');
  const isAdminPage = pathname.startsWith('/admin');

  const showGlobalNav = 
    !isAuthPage && 
    !isFocusPage && 
    !isSavedPage && 
    !isSupportPage && 
    !isQuizPage && 
    !isDashboard && 
    !isAdminPage && 
    isNavVisible;

  const checkAdminStatus = useCallback(async (currentUser: any) => {
    if (!currentUser) { setIsAdmin(false); return; }
    const metaRole = currentUser.user_metadata?.role;
    if (metaRole === 'admin') { setIsAdmin(true); return; }
    try {
      const { data } = await supabase.from('profiles').select('role').eq('id', currentUser.id).maybeSingle();
      setIsAdmin(data?.role === 'admin');
    } catch (err) { setIsAdmin(false); }
  }, []);

  useEffect(() => {
    const savedLang = localStorage.getItem("hub_lang") as 'en' | 'fr';
    if (savedLang) setLang(savedLang);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await checkAdminStatus(session.user);
        }
      } finally {
        setIsLoading(false); // Finished checking session
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) await checkAdminStatus(session.user);
      else setIsAdmin(false);
      setIsLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, [checkAdminStatus]);

  const handleLanguageToggle = () => {
    const newLang = lang === 'en' ? 'fr' : 'en';
    setLang(newLang);
    localStorage.setItem("hub_lang", newLang);
  };

  return (
    <html lang={lang} className="dark">
      <body className="min-h-screen flex flex-col bg-[#050505] text-white selection:bg-[#3A6EA5]/30 relative overflow-x-hidden font-sans antialiased">
        
        {/* GLOBAL LOADING SCREEN */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#050505] z-[9999] flex flex-col items-center justify-center"
            >
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(58,110,165,0.3)]"
              >
                <GraduationCap className="text-[#3A6EA5]" size={40} />
              </motion.div>
              <Loader2 className="animate-spin text-[#3A6EA5] opacity-50" size={24} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-8 text-white/20">Initializing Hub</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3A6EA5]/10 blur-[120px] rounded-full transform-gpu" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full transform-gpu" />
        </div>

        <LanguageContext.Provider value={{ lang, setLang, isNavVisible, setNavVisible }}>
          {showGlobalNav && (
            <>
              <DesktopNav user={user} isAdmin={isAdmin} lang={lang} toggleLang={handleLanguageToggle} />
              <MobileNav user={user} isAdmin={isAdmin} lang={lang} toggleLang={handleLanguageToggle} />
            </>
          )}

          <AnimatePresence mode="wait">
            {!isLoading && (
              <motion.main 
                key={pathname} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "circOut" }}
                className={`relative z-10 w-full flex-grow ${showGlobalNav ? 'pb-10' : ''}`}
              >
                {children}
              </motion.main>
            )}
          </AnimatePresence>
          
          {showGlobalNav && (
            <footer className="relative z-20 mt-auto pt-16 pb-40 md:pb-16 border-t border-white/5 bg-[#050505]/80 backdrop-blur-xl">
              <div className="max-w-7xl mx-auto px-6">
                {/* ... footer content ... */}
                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex flex-col items-center md:items-start gap-2">
                    <div className="flex items-center gap-3 text-emerald-500/50 text-[9px] font-black uppercase tracking-widest">
                      <ShieldCheck size={14} /> Systems Operational
                    </div>
                    <p className="text-[9px] font-medium opacity-20 tracking-widest">
                      © 2025 LEBANESE UNIVERSITY • ALL RIGHTS RESERVED
                    </p>
                  </div>
                </div>
              </div>
            </footer>
          )}
        </LanguageContext.Provider>
      </body>
    </html>
  );
}