"use client";
import { useState, useEffect, createContext, useCallback } from "react";
import "./globals.css";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ShieldCheck, Globe, Instagram, Send, Loader2, GraduationCap } from "lucide-react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import DesktopNav from "./components/layout/DesktopNav";
import MobileNav from "./components/layout/MobileNav";
import { translations } from "./translations"; 

// Updated Context to include Semester
export const LanguageContext = createContext({ 
  lang: 'en' as 'en' | 'fr', 
  setLang: (l: 'en' | 'fr') => {},
  semester: 1 as 1 | 2,
  setSemester: (s: 1 | 2) => {},
  isNavVisible: true,
  setNavVisible: (v: boolean) => {} 
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const [semester, setSemester] = useState<1 | 2>(1); // New Semester State
  const [isNavVisible, setNavVisible] = useState(true); 
  const [isLoading, setIsLoading] = useState(true); 
  const pathname = usePathname();

  const t = translations[lang];

  const isAuthPage = pathname === '/auth';
  const isFocusPage = pathname === '/focus';
  const isSavedPage = pathname === '/saved';
  const isSupportPage = pathname === '/support';
  const isQuizPage = pathname.includes('/quiz') || pathname.includes('/test');
  const isDashboard = pathname.startsWith('/dashboard');
  const isAdminPage = pathname.startsWith('/admin');

  const showGlobalNav = 
    !isAuthPage && !isFocusPage && !isSavedPage && 
    !isSupportPage && !isQuizPage && !isDashboard && 
    !isAdminPage && isNavVisible;

  // --- DYNAMIC TITLE & ICON LOGIC ---
  useEffect(() => {
    let pageName = "Home";
    
    if (pathname === '/') pageName = lang === 'en' ? "Home" : "Accueil";
    else if (pathname.includes('/quiz')) pageName = lang === 'en' ? "Quiz Hub" : "Centre de Quiz";
    else if (pathname === '/saved') pageName = lang === 'en' ? "Library" : "Bibliothèque";
    else if (pathname === '/focus') pageName = lang === 'en' ? "Focus Mode" : "Mode Focus";
    else if (pathname === '/support') pageName = lang === 'en' ? "Support" : "Assistance";
    else if (pathname.startsWith('/admin')) pageName = "Admin Terminal";
    else if (pathname.startsWith('/dashboard')) pageName = "Dashboard";
    else {
      const pathSegments = pathname.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1];
      pageName = lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : "Portal";
    }

    document.title = `Student Portal | ${pageName}`;

    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'icon';
    link.href = '/hat-icon.png?v=1';
    if (!document.querySelector("link[rel~='icon']")) {
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [pathname, lang]);

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
    // Load saved preferences
    const savedLang = localStorage.getItem("hub_lang") as 'en' | 'fr';
    if (savedLang) setLang(savedLang);
    
    const savedSemester = localStorage.getItem("hub_semester");
    if (savedSemester) setSemester(Number(savedSemester) as 1 | 2);

    const initAuth = async () => {
      const safetyTimer = setTimeout(() => setIsLoading(false), 5000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await checkAdminStatus(session.user);
        }
      } catch (err) {
        console.error("Auth initialization error", err);
      } finally {
        clearTimeout(safetyTimer);
        setIsLoading(false); 
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

  const handleSemesterChange = (s: 1 | 2) => {
    setSemester(s);
    localStorage.setItem("hub_semester", s.toString());
  };

  // Logic to toggle between 1 and 2
  const toggleSemester = () => {
    const nextSemester = semester === 1 ? 2 : 1;
    handleSemesterChange(nextSemester);
  };

  return (
    <html lang={lang} className="dark">
      <body 
        suppressHydrationWarning={true} 
        className="min-h-screen flex flex-col bg-[#020202] text-white selection:bg-[#8B5CF6]/30 relative overflow-x-hidden font-sans antialiased"
      >
        
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#020202] z-[9999] flex flex-col items-center justify-center"
            >
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(139,92,246,0.3)]"
              >
                <GraduationCap className="text-[#8B5CF6]" size={40} />
              </motion.div>
              <Loader2 className="animate-spin text-[#8B5CF6] opacity-50" size={24} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-8 text-white/20">
                {lang === 'en' ? "University Portal" : "Portail Universitaire"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <LanguageContext.Provider value={{ 
          lang, 
          setLang, 
          semester, 
          setSemester: handleSemesterChange, 
          isNavVisible, 
          setNavVisible 
        }}>
          {showGlobalNav && (
            <>
              <DesktopNav 
                user={user} 
                isAdmin={isAdmin} 
                lang={lang} 
                toggleLang={handleLanguageToggle}
                semester={semester}
                toggleSemester={toggleSemester}
              />
              <MobileNav 
                user={user} 
                isAdmin={isAdmin} 
                lang={lang} 
                toggleLang={handleLanguageToggle}
                semester={semester}
                toggleSemester={toggleSemester}
              />
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
            <footer className="relative z-20 mt-auto pt-20 pb-40 md:pb-16 border-t border-white/5 bg-[#020202]/80 backdrop-blur-xl">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                  
                  <div className="md:col-span-1 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-[#8B5CF6]/20">
                        <GraduationCap className="text-[#8B5CF6]" size={20} />
                      </div>
                      <span className="font-black tracking-tighter text-xl italic uppercase">
                        {lang === 'en' ? "Student Portal" : "Portail Étudiant"}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs font-medium leading-relaxed italic">
                      {t.heroSub}
                    </p>
                    <div className="flex items-center gap-4">
                      <a href="#" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#8B5CF6] transition-all"><Instagram size={16} /></a>
                      <a href="#" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#8B5CF6] transition-all"><Send size={16} /></a>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8B5CF6]">
                      {lang === 'en' ? "Curriculum" : "Programme"}
                    </h4>
                    <ul className="space-y-4 text-xs font-bold uppercase tracking-widest opacity-40">
                      <li>
                        <Link href="/quiz" className="hover:opacity-100 hover:text-white transition-all flex flex-col gap-1 group">
                          <span className="group-hover:text-[#8B5CF6] transition-colors">{t.quizHub}</span>
                          <span className="text-[8px] opacity-50 lowercase font-medium tracking-normal">
                            {lang === 'en' ? "Practice examinations" : "Examens d'entraînement"}
                          </span>
                        </Link>
                      </li>
                      <li>
                        <Link href="/focus" className="hover:opacity-100 hover:text-white transition-all flex flex-col gap-1 group">
                          <span className="group-hover:text-amber-500 transition-colors">{t.focusMode}</span>
                          <span className="text-[8px] opacity-50 lowercase font-medium tracking-normal">
                            {lang === 'en' ? "Dedicated study timer" : "Chronomètre d'étude dédié"}
                          </span>
                        </Link>
                      </li>
                      <li>
                        <Link href="/saved" className="hover:opacity-100 hover:text-white transition-all flex flex-col gap-1 group">
                          <span className="group-hover:text-white transition-colors">{t.library}</span>
                          <span className="text-[8px] opacity-50 lowercase font-medium tracking-normal">
                            {t.librarySub}
                          </span>
                        </Link>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8B5CF6]">Navigation</h4>
                    <ul className="space-y-4 text-xs font-bold uppercase tracking-widest opacity-40">
                      <li><Link href="/" className="hover:opacity-100 hover:text-white transition-all">{lang === 'en' ? "Home" : "Accueil"}</Link></li>
                      <li><Link href="/about" className="hover:opacity-100 hover:text-white transition-all">{lang === 'en' ? "Information" : "Informations"}</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8B5CF6]">Assistance</h4>
                    <ul className="space-y-4 text-xs font-bold uppercase tracking-widest opacity-40">
                      <li>
                        <Link href="/support" className="hover:opacity-100 hover:text-white transition-all flex flex-col gap-1 group">
                          <span className="group-hover:text-emerald-500 transition-colors">
                            {lang === 'en' ? "Student Support" : "Aide Étudiante"}
                          </span>
                          <span className="text-[8px] opacity-50 lowercase font-medium tracking-normal">
                            {lang === 'en' ? "Technical inquiries" : "Demandes techniques"}
                          </span>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex flex-col items-center md:items-start gap-2">
                    <div className="flex items-center gap-3 text-emerald-500/50 text-[9px] font-black uppercase tracking-widest">
                      <ShieldCheck size={14} /> {lang === 'en' ? "Systems Secure" : "Systèmes Sécurisés"}
                    </div>
                    <p className="text-[9px] font-medium opacity-20 tracking-widest uppercase italic text-center md:text-left">
                      © 2025 Lebanese University • {lang === 'en' ? "Academic Resource Project" : "Projet de Ressources Académiques"}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
                    <div className="flex items-center gap-2 text-[#8B5CF6]">
                      <Globe size={12} /> <span>LB-BEIRUT</span>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          )}
        </LanguageContext.Provider>
        
        <SpeedInsights />
      </body>
    </html>
  );
}