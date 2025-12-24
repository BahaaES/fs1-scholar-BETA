"use client";
import { useState, useEffect, createContext, useCallback } from "react";
import "./globals.css";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ShieldCheck, Globe, Instagram, Send } from "lucide-react";

import DesktopNav from "./components/layout/DesktopNav";
import MobileNav from "./components/layout/MobileNav";

// Updated Context to include Nav Visibility
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
  const pathname = usePathname();

  // Route-based hiding
  const isAuthPage = pathname === '/auth';
  const isFocusPage = pathname === '/focus';
  const isSavedPage = pathname === '/saved'; // Added for your Saved Archive
  const isQuizPage = pathname.includes('/quiz') || pathname.includes('/test');
  const isDashboard = pathname.startsWith('/dashboard');
  const isAdminPage = pathname.startsWith('/admin');

  // Logic: Only show nav if route allows AND the child page hasn't hidden it manually via context
  const showGlobalNav = 
    !isAuthPage && 
    !isFocusPage && 
    !isSavedPage && 
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); checkAdminStatus(session.user); }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdminStatus(session.user);
      else setIsAdmin(false);
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
        
        {/* Ambient Background Glows */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3A6EA5]/10 blur-[120px] rounded-full transform-gpu" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full transform-gpu" />
        </div>

        <LanguageContext.Provider value={{ lang, setLang, isNavVisible, setNavVisible }}>
          
          {/* NAVIGATION */}
          {showGlobalNav && (
            <>
              <DesktopNav user={user} isAdmin={isAdmin} lang={lang} toggleLang={handleLanguageToggle} />
              <MobileNav user={user} isAdmin={isAdmin} lang={lang} toggleLang={handleLanguageToggle} />
            </>
          )}

          {/* MAIN CONTENT AREA */}
          <AnimatePresence mode="wait">
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
          </AnimatePresence>
          
          {/* FOOTER */}
          {showGlobalNav && (
            <footer className="relative z-20 mt-auto pt-16 pb-40 md:pb-16 border-t border-white/5 bg-[#050505]/80 backdrop-blur-xl">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                  <div className="col-span-2 md:col-span-1">
                    <div className="w-10 h-10 bg-[#3A6EA5] rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-[#3A6EA5]/20">
                      <span className="font-black text-xl italic">LU</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 leading-relaxed max-w-[200px]">
                      The official digital companion for the Faculty of Science students.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#3A6EA5] mb-6 border-l-2 border-[#3A6EA5] pl-3">Platform</h4>
                    <ul className="space-y-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                      <li><Link href="/focus" className="hover:text-white transition-colors">Focus Mode</Link></li>
                      <li><Link href="/saved" className="hover:text-white transition-colors">Saved Archive</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#3A6EA5] mb-6 border-l-2 border-[#3A6EA5] pl-3">Resources</h4>
                    <ul className="space-y-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      <li><Link href="/quiz" className="hover:text-white transition-colors">Quiz Hub</Link></li>
                      <li><Link href="/support" className="hover:text-white transition-colors">Solved Exams</Link></li>
                      <li><Link href="/about" className="hover:text-white transition-colors">Faculty Info</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#3A6EA5] mb-6 border-l-2 border-[#3A6EA5] pl-3">Help</h4>
                    <ul className="space-y-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      <li><Link href="/support" className="hover:text-white transition-colors">Support Center</Link></li>
                      <li><Link href="/about" className="hover:text-white transition-colors">About Portal</Link></li>
                      <li><Link href="/support" className="hover:text-white transition-colors">Report Bug</Link></li>
                    </ul>
                  </div>
                </div>
                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex flex-col items-center md:items-start gap-2">
                    <div className="flex items-center gap-3 text-emerald-500/50 text-[9px] font-black uppercase tracking-widest">
                      <ShieldCheck size={14} /> Systems Operational
                    </div>
                    <p className="text-[9px] font-medium opacity-20 tracking-widest">
                      © 2025 LEBANESE UNIVERSITY • ALL RIGHTS RESERVED
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-white/20">
                    <Link href="#" className="hover:text-white transition-colors"><Send size={18} /></Link>
                    <Link href="#" className="hover:text-white transition-colors"><Instagram size={18} /></Link>
                    <div className="h-4 w-[1px] bg-white/10 ml-2" />
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                      <Globe size={14} /> LB-BEI
                    </div>
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