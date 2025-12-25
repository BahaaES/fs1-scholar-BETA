"use client";
import { useState, useEffect } from 'react'; // Added useEffect
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, GraduationCap, User, HelpCircle } from 'lucide-react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // --- NEW: REDIRECT IF ALREADY SIGNED IN ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Use replace instead of push to prevent back-button loops
        router.replace('/'); 
      }
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
        if (cleanUsername.includes(" ")) throw new Error("No spaces allowed in username.");

        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error("Database connection error. Try again.");
        }
        if (existingUser) throw new Error("Username already taken.");

        const { data, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { username: cleanUsername } }
        });

        if (authError) throw authError;

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
              id: data.user.id, 
              username: cleanUsername 
            }, { 
              onConflict: 'id' 
            });
            
          if (profileError) {
            await supabase.auth.signOut();
            throw new Error("Profile creation failed.");
          }
        }

        router.push('/');
        router.refresh();

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
    <main className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-[#050505] text-white relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[5%] -left-[10%] w-[60%] md:w-[40%] h-[40%] bg-[#3A6EA5]/10 rounded-full blur-[80px] md:blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="bg-black/40 backdrop-blur-2xl p-8 md:p-10 rounded-[3rem] border border-white/10 shadow-2xl">
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#3A6EA5] text-white mb-6 shadow-lg shadow-[#3A6EA5]/30">
              <GraduationCap size={32} />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-tight">
              {isSignUp ? 'Create Account' : 'Student Portal'}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mt-2">University Archives</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A6EA5] opacity-50" size={18} />
                  <input 
                    type="text" placeholder="Username" 
                    className="w-full bg-white/5 border border-transparent focus:border-[#3A6EA5]/50 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-sm text-white"
                    value={username} onChange={(e) => setUsername(e.target.value)} required={isSignUp}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A6EA5] opacity-50" size={18} />
              <input 
                type="email" placeholder="Email Address" 
                className="w-full bg-white/5 border border-transparent focus:border-[#3A6EA5]/50 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-sm text-white"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A6EA5] opacity-50" size={18} />
              <input 
                type="password" placeholder="Password" 
                className="w-full bg-white/5 border border-transparent focus:border-[#3A6EA5]/50 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-sm text-white"
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
            </div>

            {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>}

            <button disabled={loading} className="w-full bg-[#3A6EA5] hover:bg-[#2e5a8a] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18} /> : (isSignUp ? 'Create My Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-[#3A6EA5] transition-all">
              {isSignUp ? 'Already have an account? Sign In' : 'New student? Create an account'}
            </button>
          </div>
        </div>
      </motion.div>

      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push('/support')}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/10 transition-all group"
      >
        <HelpCircle size={18} className="text-[#3A6EA5]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white">Support</span>
      </motion.button>
    </main>
  );
}