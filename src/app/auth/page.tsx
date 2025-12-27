"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, GraduationCap, User, HelpCircle, Sparkles } from 'lucide-react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace('/'); 
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const cleanUsername = username.trim().toLowerCase();
        if (cleanUsername.length < 3) throw new Error("Username must be 3+ characters.");
        const { data, error: authError } = await supabase.auth.signUp({ 
          email, password, options: { data: { username: cleanUsername } }
        });
        if (authError) throw authError;
        router.push('/');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Added overflow-y-auto for small phones, but kept hidden for desktops
    <main className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 bg-[#020202] text-white relative overflow-x-hidden">
      
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.12, 0.08] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-[10%] -left-[10%] w-[70%] h-[50%] bg-[#6366f1] rounded-full blur-[120px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-md relative z-10"
      >
        {/* Main Card */}
        <div className="bg-white/[0.03] backdrop-blur-3xl p-8 md:p-12 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-6 right-8 text-white/5 rotate-12">
            <Sparkles size={60} />
          </div>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.2rem] bg-[#6366f1] text-white mb-6 shadow-2xl shadow-[#6366f1]/40">
              <GraduationCap size={40} />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-tight">
              {isSignUp ? 'Join the' : 'Student'} <span className="text-[#6366f1] not-italic">Portal</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mt-3">Faculty of Science 2025</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6366f1] opacity-40 group-focus-within:opacity-100 transition-opacity" size={18} />
                  <input 
                    type="text" placeholder="Username" 
                    className="w-full bg-white/5 border border-white/5 focus:border-[#6366f1]/50 rounded-2xl py-5 pl-14 outline-none transition-all font-bold text-sm"
                    value={username} onChange={(e) => setUsername(e.target.value)} required={isSignUp}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6366f1] opacity-40 group-focus-within:opacity-100 transition-opacity" size={18} />
              <input 
                type="email" placeholder="Student Email" 
                className="w-full bg-white/5 border border-white/5 focus:border-[#6366f1]/50 rounded-2xl py-5 pl-14 outline-none transition-all font-bold text-sm"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6366f1] opacity-40 group-focus-within:opacity-100 transition-opacity" size={18} />
              <input 
                type="password" placeholder="Password" 
                className="w-full bg-white/5 border border-white/5 focus:border-[#6366f1]/50 rounded-2xl py-5 pl-14 outline-none transition-all font-bold text-sm"
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
            </div>

            {error && (
              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest text-center py-2 bg-red-500/10 rounded-xl border border-red-500/20">{error}</p>
            )}

            <button disabled={loading} className="group w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-[#6366f1]/20">
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>{isSignUp ? 'Initialize Profile' : 'Access Portal'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-[#6366f1] transition-all relative z-[60]">
              {isSignUp ? 'Already registered? Login here' : 'New student? Request access'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ENHANCED SUPPORT TRIGGER */}
      <motion.button 
        whileHover={{ y: -5, backgroundColor: "rgba(99, 102, 241, 0.15)" }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push('/support')}
        // Changed to sm:bottom-10 and sm:right-10 for safer spacing
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[70] flex items-center gap-3 px-6 py-3 md:px-8 md:py-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full hover:border-[#6366f1]/40 transition-all group"
      >
        <div className="relative">
          <HelpCircle size={20} className="text-[#6366f1] relative z-10" />
          <div className="absolute inset-0 bg-[#6366f1]/40 blur-md rounded-full animate-pulse group-hover:bg-[#6366f1]/60" />
        </div>
        <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Support Center</span>
      </motion.button>
    </main>
  );
}