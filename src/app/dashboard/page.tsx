"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Trophy, Target, Edit3, Check, Loader2, ChevronLeft, 
  Award, Zap, Star, Medal, Flame, ShieldCheck, Rocket, 
  Crown, BookOpen, GraduationCap, TrendingUp, Calendar,
  Dna, Atom, Binary
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  
  const [stats, setStats] = useState({
    totalQuizzes: 0, 
    avgAccuracy: 0, 
    totalXp: 0,
    level: 1, 
    progress: 0,
    perfectScores: 0,
    bestSubject: "None"
  });
  const [newUsername, setNewUsername] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // --- PROGRESSION LOGIC ---
  const getRankData = (lvl: number) => {
    if (lvl >= 25) return { title: "Grandmaster", color: "text-purple-400", bg: "bg-purple-500/20" };
    if (lvl >= 15) return { title: "Legend", color: "text-amber-400", bg: "bg-amber-500/20" };
    if (lvl >= 10) return { title: "Vanguard", color: "text-blue-400", bg: "bg-blue-500/20" };
    if (lvl >= 5) return { title: "Scholar", color: "text-emerald-400", bg: "bg-emerald-500/20" };
    return { title: "Novice", color: "text-slate-400", bg: "bg-slate-500/20" };
  };

  const calculateLevel = (totalXp: number) => {
    const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
    const currentLevelBaseXp = Math.pow(level - 1, 2) * 100;
    const nextLevelBaseXp = Math.pow(level, 2) * 100;
    const xpInCurrentLevel = totalXp - currentLevelBaseXp;
    const xpRequiredForNext = nextLevelBaseXp - currentLevelBaseXp;
    const progress = Math.min(Math.max((xpInCurrentLevel / xpRequiredForNext) * 100, 0), 100);
    return { level, progress };
  };

  // --- ACHIEVEMENT SYSTEM ---
  const achievements = useMemo(() => [
    { id: '1', title: "Speed Demon", desc: "Under 2m session", icon: <Zap size={20}/>, req: recentQuizzes.some(q => q.time_seconds < 120) },
    { id: '2', title: "The Brain", desc: "95% Avg Accuracy", icon: <Brain size={20}/>, req: stats.avgAccuracy >= 95 },
    { id: '3', title: "Impeccable", desc: "5 Perfect Scores", icon: <ShieldCheck size={20}/>, req: stats.perfectScores >= 5 },
    { id: '4', title: "Fire Starter", desc: "3 Day Streak", icon: <Flame size={20}/>, req: streak >= 3 },
    { id: '5', title: "Ascendant", desc: "Reach Level 15", icon: <Rocket size={20}/>, req: stats.level >= 15 },
    { id: '6', title: "Polymath", desc: "10 Sessions", icon: <BookOpen size={20}/>, req: stats.totalQuizzes >= 10 },
  ], [stats, streak, recentQuizzes]);

  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (profileData) {
      setProfile(profileData);
      setNewUsername(profileData.username || "");
      const { level, progress } = calculateLevel(profileData.xp || 0);
      setStats(prev => ({ ...prev, totalXp: profileData.xp || 0, level, progress }));
      setStreak(profileData.streak || 1);
    }

    const { data: perfs } = await supabase.from('quiz_performances').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

    if (perfs && perfs.length > 0) {
      const totalAcc = perfs.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0);
      setStats(prev => ({ 
        ...prev, 
        totalQuizzes: perfs.length, 
        avgAccuracy: Math.round((totalAcc / perfs.length) * 100),
        perfectScores: perfs.filter(p => p.score === p.total_questions).length
      }));
      setRecentQuizzes(perfs.slice(0, 5));
    }
    setLoading(false);
  }

  async function updateUsername() {
    const cleanName = newUsername.trim();
    if (cleanName.length < 3) {
        setIsEditing(false);
        setNewUsername(profile?.username || "");
        return;
    }

    setSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('profiles')
            .update({ username: cleanName })
            .eq('id', user?.id);

        if (error) throw error;
        setProfile((prev: any) => ({ ...prev, username: cleanName }));
        setIsEditing(false);
    } catch (err) {
        console.error("Failed to save username:", err);
        alert("Could not save username. Check your connection.");
    } finally {
        setSaving(false);
    }
  }

  const rank = getRankData(stats.level);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#020202] text-white pb-32">
      {/* HUD HEADER */}
      <nav className="sticky top-0 z-50 p-4 md:p-6 bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button onClick={() => router.push('/')} className="flex items-center gap-3 group">
                <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-all"><ChevronLeft size={20} /></div>
                <div className="hidden xs:block">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">System Access</p>
                    <p className="text-xs font-bold">Return Home</p>
                </div>
            </button>

            <div className="flex items-center gap-2 md:gap-4">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 text-orange-500">
                        {/* FIX: Removed md:size */}
                        <Flame className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" />
                        <span className="text-[10px] md:text-sm font-black italic">{streak} DAY STREAK</span>
                    </div>
                </div>
                <div className="w-px h-6 md:h-8 bg-white/10 mx-1 md:mx-2" />
                <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-all"><Power size={20}/></button>
            </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8 md:mt-12">
        {/* HERO SECTION */}
        <div className="relative mb-12 md:mb-20">
            <div className="absolute -top-12 -left-12 md:-top-24 md:-left-24 w-64 h-64 md:w-96 md:h-96 bg-blue-600/10 blur-[80px] md:blur-[120px] rounded-full pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-12 relative z-10 text-center lg:text-left">
                {/* AVATAR POD */}
                <div className="relative group shrink-0">
                    <div className="w-32 h-32 md:w-52 md:h-52 rounded-[2.5rem] md:rounded-[4rem] bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-500 p-1 md:p-1.5 rotate-3 group-hover:rotate-6 transition-transform duration-500 shadow-2xl">
                        <div className="w-full h-full bg-[#050505] rounded-[2.4rem] md:rounded-[3.8rem] flex items-center justify-center text-5xl md:text-8xl font-black italic select-none">
                            {profile?.username ? profile.username.charAt(0).toUpperCase() : "?"}
                        </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 bg-white text-black p-3 md:p-5 rounded-2xl md:rounded-[2rem] shadow-[0_20px_50px_rgba(255,255,255,0.2)]">
                        {/* FIX: Removed md:size */}
                        <Trophy className="w-5 h-5 md:w-7 md:h-7" />
                    </div>
                </div>

                {/* USER IDENTITY */}
                <div className="flex-1 w-full">
                    <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                        {isEditing ? (
                            <div className="flex items-center gap-2 w-full max-w-md">
                                <input 
                                    autoFocus 
                                    value={newUsername} 
                                    onChange={(e) => setNewUsername(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && updateUsername()}
                                    className="bg-white/5 border-b-2 border-blue-500 text-3xl md:text-5xl font-black italic uppercase outline-none px-2 w-full" 
                                />
                                <button onClick={updateUsername} className="p-2 bg-blue-500 rounded-lg shrink-0">
                                    {saving ? <Loader2 size={20} className="animate-spin"/> : <Check size={20}/>}
                                </button>
                            </div>
                        ) : (
                            <div className="group flex items-center gap-3 md:gap-4 max-w-full">
                                <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter uppercase truncate">
                                    {profile?.username || "New Student"}
                                </h1>
                                <button onClick={() => setIsEditing(true)} className="p-2 md:opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 rounded-xl shrink-0">
                                    {/* FIX: Removed md:size */}
                                    <Edit3 className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-3 justify-center lg:justify-start">
                        <div className={`flex items-center gap-2 px-4 md:px-5 py-1.5 md:py-2 rounded-full border border-white/5 font-black text-[9px] md:text-[11px] uppercase tracking-tighter ${rank.bg} ${rank.color}`}>
                            {/* FIX: Removed md:size */}
                            <Crown className="w-3 h-3 md:w-3.5 md:h-3.5" /> {rank.title}
                        </div>
                        <div className="flex items-center gap-2 px-4 md:px-5 py-1.5 md:py-2 rounded-full border border-white/10 bg-white/5 font-black text-[9px] md:text-[11px] uppercase tracking-tighter opacity-60">
                            Level {stats.level}
                        </div>
                    </div>
                </div>

                {/* XP OVERVIEW */}
                <div className="w-full lg:w-80 bg-white/[0.03] border border-white/5 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] backdrop-blur-2xl">
                    <div className="flex justify-between items-end mb-4">
                        <p className="text-[9px] md:text-[10px] font-black uppercase opacity-40 tracking-widest">Global XP</p>
                        <p className="text-xl md:text-2xl font-black italic">{stats.totalXp.toLocaleString()}</p>
                    </div>
                    <div className="h-3 md:h-4 bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${stats.progress}%` }} className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 rounded-full" />
                    </div>
                    <p className="text-[8px] md:text-[9px] font-black uppercase opacity-30 mt-3 text-right">Next level in {Math.round(100 - stats.progress)}%</p>
                </div>
            </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-16 md:mb-24">
            {[
                { label: "Precision", val: `${stats.avgAccuracy}%`, icon: <Target className="text-emerald-400"/>, trend: "+2%" },
                { label: "Quizzes", val: stats.totalQuizzes, icon: <Rocket className="text-blue-400"/>, trend: "Active" },
                { label: "Perfect", val: stats.perfectScores, icon: <Star className="text-amber-400"/>, trend: "Flawless" },
                { label: "Streak", val: `${streak}d`, icon: <Flame className="text-orange-500"/>, trend: "Hot" }
            ].map((s, i) => (
                <motion.div whileHover={{ y: -5 }} key={i} className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-lg md:rounded-xl flex items-center justify-center scale-90 md:scale-100">{s.icon}</div>
                        <span className="hidden xs:block text-[8px] md:text-[9px] font-black text-white/20 uppercase bg-white/5 px-2 py-1 rounded">{s.trend}</span>
                    </div>
                    <div className="text-2xl md:text-4xl font-black italic tracking-tighter">{s.val}</div>
                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-30 mt-1">{s.label}</p>
                </motion.div>
            ))}
        </div>

        {/* ACHIEVEMENTS HUD */}
        <section className="mb-16 md:mb-24">
            <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter">Achievement <span className="text-blue-500">Vault</span></h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-6 gap-3 md:gap-6">
                {achievements.map((ach) => (
                    <div key={ach.id} className={`group relative p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border transition-all duration-500 flex flex-col items-center text-center ${ach.req ? 'bg-blue-600/5 border-blue-500/30' : 'bg-white/[0.01] border-white/5 opacity-20'}`}>
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center mb-3 md:mb-4 transition-all duration-500 ${ach.req ? 'bg-blue-500 text-white shadow-[0_10px_30px_rgba(59,130,246,0.5)] scale-110' : 'bg-white/5'}`}>
                            {ach.icon}
                        </div>
                        <h4 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1">{ach.title}</h4>
                        <p className="hidden md:block text-[8px] font-medium opacity-40 leading-tight uppercase">{ach.desc}</p>
                        {ach.req && <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-emerald-500 text-black p-0.5 md:p-1 rounded-full"><Check size={10} strokeWidth={4}/></div>}
                    </div>
                ))}
            </div>
        </section>

        {/* RECENT DEPLOYMENTS */}
        <section>
            <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter">Mission <span className="text-emerald-500">Logs</span></h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <div className="space-y-3 md:space-y-4">
                {recentQuizzes.map((quiz, idx) => (
                    <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} key={quiz.id} className="group p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-white/[0.02] border border-white/5 flex flex-col md:flex-row items-center justify-between hover:bg-white/[0.04] transition-all gap-4">
                        <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
                            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl shrink-0 flex items-center justify-center text-xl md:text-2xl ${quiz.score === quiz.total_questions ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-white/5 text-white/40'}`}>
                                {/* FIX: Removed md:size */}
                                {quiz.score === quiz.total_questions ? <Star className="w-5 h-5 md:w-6 md:h-6" fill="currentColor"/> : <Target className="w-5 h-5 md:w-6 md:h-6"/>}
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-lg md:text-xl font-black italic uppercase tracking-tight truncate">Quiz <span className="text-white/20 ml-1 text-xs not-italic font-medium">#{quiz.id.slice(0,5)}</span></h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 opacity-40 font-black text-[8px] md:text-[10px] uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><Calendar size={10}/> {new Date(quiz.created_at).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><Clock size={10}/> {Math.floor(quiz.time_seconds/60)}m {quiz.time_seconds%60}s</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 md:gap-12 w-full md:w-auto justify-between md:justify-end border-t border-white/5 md:border-none pt-4 md:pt-0">
                            <div className="text-left md:text-right">
                                <p className="text-[8px] md:text-[10px] font-black uppercase opacity-30 tracking-widest mb-0.5 md:mb-1">Accuracy</p>
                                <p className={`text-2xl md:text-4xl font-black italic ${quiz.score/quiz.total_questions >= 0.8 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                    {Math.round((quiz.score/quiz.total_questions)*100)}%
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
      </div>
    </main>
  );
}

// Helpers
function Brain(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/></svg>;
}

function Power(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-power"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>;
}
function Clock(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}