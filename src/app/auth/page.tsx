"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, GraduationCap, User } from 'lucide-react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (username.length < 3) throw new Error("Username must be at least 3 characters.");
        if (username.includes(" ")) throw new Error("Username cannot contain spaces.");

        const { data, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { username: username.trim().toLowerCase() } 
          }
        });

        if (authError) throw authError;

        if (data.user && data.user.identities?.length === 0) {
            throw new Error("This email or username is already in use.");
        }

        alert("Profile Initialized! Check your email for the confirmation link.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-gray-50 dark:bg-[#050505] transition-colors duration-500 overflow-x-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[5%] -left-[10%] w-[60%] md:w-[40%] h-[40%] bg-[#3A6EA5]/10 rounded-full blur-[80px] md:blur-[120px]" />
        <div className="absolute -bottom-[5%] -right-[10%] w-[60%] md:w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[80px] md:blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        {/* Adjusted padding for mobile (p-6) vs desktop (p-10) */}
        <div className="glass-card p-6 xs:p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-gray-200 dark:border-white/10 backdrop-blur-2xl shadow-2xl transition-all duration-500 bg-white dark:bg-black/40">
          
          <div className="text-center mb-8 md:mb-10">
            {/* Scaled icon for mobile */}
            <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-[#3A6EA5] text-white mb-4 md:mb-6 shadow-lg shadow-[#3A6EA5]/30">
              <GraduationCap className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            {/* Scaled heading for mobile */}
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic text-gray-900 dark:text-white leading-tight">
              {isSignUp ? 'Create Profile' : 'Student Portal'}
            </h1>
            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mt-2 text-gray-900 dark:text-white">
              University of Science Archives
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-3 md:space-y-4">
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="relative group overflow-hidden"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A6EA5] opacity-50 group-focus-within:opacity-100 z-10" size={18} />
                  <input 
                    type="text" 
                    placeholder="Unique Username" 
                    className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[#3A6EA5]/50 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-12 pr-4 outline-none transition-all font-bold text-sm text-gray-900 dark:text-white"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={isSignUp}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A6EA5] opacity-50 group-focus-within:opacity-100 z-10" size={18} />
              <input 
                type="email" 
                placeholder="Student Email" 
                className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[#3A6EA5]/50 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-12 pr-4 outline-none transition-all font-bold text-sm text-gray-900 dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A6EA5] opacity-50 group-focus-within:opacity-100 z-10" size={18} />
              <input 
                type="password" 
                placeholder="Secure Access Code" 
                className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[#3A6EA5]/50 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-12 pr-4 outline-none transition-all font-bold text-sm text-gray-900 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center px-2">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button 
              disabled={loading}
              className="w-full bg-[#3A6EA5] hover:bg-[#2e5a8a] text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#3A6EA5]/20 active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <> {isSignUp ? 'Initialize Profile' : 'Authorize Access'} <ArrowRight size={16} /> </>
              )}
            </button>
          </form>

          <div className="mt-6 md:mt-8 text-center">
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-[#3A6EA5] transition-all text-gray-900 dark:text-white"
            >
              {isSignUp ? 'Already have a profile? Sign In' : 'New Scientist? Request Access'}
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}