"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Trophy, Target, Edit3, Check, Loader2, ChevronLeft, 
  Star, ShieldCheck, Rocket, 
  Crown, BookOpen, Calendar, LogOut, Brain
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0, 
    avgAccuracy: 0, 
    totalXp: 0,
    perfectScores: 0
  });
  const [newUsername, setNewUsername] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // --- EXACT RANKS FROM QUIZ PAGE ---
  const RANKS = [
    { name: "Novice", minXp: 0, color: "#94a3b8" },
    { name: "Apprentice", minXp: 500, color: "#64748b" },
    { name: "Scholar", minXp: 1500, color: "#475569" },
    { name: "Analyst", minXp: 3000, color: "#818cf8" },
    { name: "Specialist", minXp: 5000, color: "#6366f1" },
    { name: "Expert", minXp: 8000, color: "#4f46e5" },
    { name: "Master", minXp: 12000, color: "#4338ca" },
    { name: "Doctorate", minXp: 18000, color: "#3730a3" },
    { name: "Professor", minXp: 25000, color: "#1e1b4b" }
  ];

  const getCurrentRank = (xp: number) => {
    return [...RANKS].reverse().find(r => xp >= r.minXp) || RANKS[0];
  };

  const getNextRank = (xp: number) => {
    return RANKS.find(r => r.minXp > xp) || null;
  };

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (profileData) {
      setProfile(profileData);
      // We set newUsername but do NOT call .toUpperCase() to preserve DB casing
      setNewUsername(profileData.username || "");
      setStats(prev => ({ ...prev, totalXp: profileData.xp || 0 }));
    }

    const { data: perfs } = await supabase.from('quiz_performances').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

    if (perfs) {
      const totalAcc = perfs.length > 0 ? perfs.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0) : 0;
      setStats(prev => ({ 
        ...prev, 
        totalQuizzes: perfs.length, 
        avgAccuracy: perfs.length > 0 ? Math.round((totalAcc / perfs.length) * 100) : 0,
        perfectScores: perfs.filter(p => p.score === p.total_questions).length
      }));
      setRecentQuizzes(perfs.slice(0, 5));
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  const currentRank = getCurrentRank(stats.totalXp);
  const nextRank = getNextRank(stats.totalXp);
  
  // Progress to next rank calculation
  const progressToNext = nextRank 
    ? ((stats.totalXp - currentRank.minXp) / (nextRank.minXp - currentRank.minXp)) * 100 
    : 100;

  const updateUsername = async () => {
    const cleanName = newUsername.trim();
    if (cleanName.length < 3) { setIsEditing(false); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').update({ username: cleanName }).eq('id', user?.id);
    setProfile((prev: any) => ({ ...prev, username: cleanName }));
    setIsEditing(false);
    setSaving(false);
  };

  const achievements = useMemo(() => [
    { id: '1', title: "Speed Demon", desc: "Under 2m session", icon: <Rocket size={20}/>, req: recentQuizzes.some(q => q.time_seconds < 120) },
    { id: '2', title: "The Architect", desc: "90% Avg Accuracy", icon: <Brain size={20}/>, req: stats.avgAccuracy >= 90 },
    { id: '3', title: "Impeccable", desc: "Perfect Score", icon: <ShieldCheck size={20}/>, req: stats.perfectScores >= 1 },
    { id: '4', title: "Veteran", desc: "10 Sessions", icon: <Target size={20}/>, req: stats.totalQuizzes >= 10 },
    { id: '5', title: "Specialist", desc: "Reach 5000 XP", icon: <Star size={20}/>, req: stats.totalXp >= 5000 },
    { id: '6', title: "Grand Professor", desc: "Reach 25000 XP", icon: <Crown size={20}/>, req: stats.totalXp >= 25000 },
  ], [stats, recentQuizzes]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#020202]"><Loader2 className="animate-spin text-[#6366f1]" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#020202] text-white pb-32">
      {/* HEADER */}
      <nav className="sticky top-0 z-50 p-6 bg-[#020202]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button onClick={() => router.push('/')} className="flex items-center gap-3 group">
                <div className="p-2 bg-white/5 rounded-xl group-hover:bg-[#6366f1]/20 transition-all"><ChevronLeft size={20} /></div>
                <div className="hidden sm:block text-left uppercase"><p className="text-xs font-bold">Portal</p></div>
            </button>
            <button onClick={() => supabase.auth.signOut({ scope: 'local' }).then(() => router.push('/'))} 
              className="p-2.5 hover:bg-red-500/10 rounded-xl text-red-500 transition-all border border-white/5">
              <LogOut size={20}/>
            </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-12 sm:mt-16">
        {/* HERO SECTION */}
        <div className="flex flex-col lg:flex-row items-center gap-12 mb-20">
            <div className="relative shrink-0">
                <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-[3rem] p-1.5" style={{ background: `linear-gradient(to tr, ${currentRank.color}, #ffffff33)` }}>
                    <div className="w-full h-full bg-[#050505] rounded-[2.8rem] flex items-center justify-center text-7xl sm:text-8xl font-black italic">
                        {profile?.username?.charAt(0)}
                    </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white text-black p-4 rounded-2xl shadow-2xl"><Trophy size={24} /></div>
            </div>

            <div className="flex-1 text-center lg:text-left">
                {isEditing ? (
                    <div className="flex items-center gap-3 justify-center lg:justify-start">
                        <input autoFocus value={newUsername} onChange={(e) => setNewUsername(e.target.value)} 
                          className="bg-white/5 border-b-2 border-[#6366f1] text-4xl sm:text-6xl font-medium outline-none px-2 w-full max-w-sm" />
                        <button onClick={updateUsername} className="p-3 bg-[#6366f1] rounded-2xl">{saving ? <Loader2 size={24} className="animate-spin"/> : <Check size={24}/>}</button>
                    </div>
                ) : (
                    <div className="group flex items-center justify-center lg:justify-start gap-4">
                        <h1 className="text-4xl sm:text-7xl font-medium tracking-tight">
                            {profile?.username || "Scholar"}
                        </h1>
                        <button onClick={() => setIsEditing(true)} className="p-3 bg-white/5 rounded-2xl border border-white/5">
                            <Edit3 size={20} className="text-[#6366f1]" />
                        </button>
                    </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3 justify-center lg:justify-start">
                    <div className="px-5 py-2 rounded-full border border-white/10 font-black text-[10px] uppercase tracking-widest" style={{ color: currentRank.color, backgroundColor: `${currentRank.color}11` }}>
                        {currentRank.name} Rank
                    </div>
                    <div className="px-5 py-2 rounded-full border border-white/10 bg-white/5 font-black text-[10px] uppercase tracking-widest opacity-40">
                        {stats.totalXp} Total XP
                    </div>
                </div>
            </div>

            {/* XP PROGRESS CARD */}
            <div className="w-full lg:w-80 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
                <div className="flex justify-between items-end mb-4">
                  <p className="text-[10px] font-black uppercase opacity-30">Next: {nextRank?.name || "Max"}</p>
                  <p className="text-xl font-black italic">{Math.round(progressToNext)}%</p>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressToNext}%` }} className="h-full bg-[#6366f1]" />
                </div>
            </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-20">
            {[
                { label: "Accuracy", val: `${stats.avgAccuracy}%`, icon: <Target className="text-emerald-400"/> },
                { label: "Quizzes", val: stats.totalQuizzes, icon: <Rocket className="text-blue-400"/> },
                { label: "Perfect Scores", val: stats.perfectScores, icon: <Star className="text-amber-400"/> },
            ].map((s, i) => (
                <div key={i} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-6">{s.icon}</div>
                    <div className="text-4xl font-black italic">{s.val}</div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mt-1">{s.label}</p>
                </div>
            ))}
        </div>

        {/* ACHIEVEMENT VAULT */}
        <section className="mb-20">
            <h2 className="text-2xl font-black italic uppercase mb-10">Achievement <span className="text-[#6366f1]">Vault</span></h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                {achievements.map((ach) => (
                    <div key={ach.id} className={`p-6 rounded-[2rem] border text-center flex flex-col items-center ${ach.req ? 'bg-[#6366f1]/5 border-[#6366f1]/30' : 'bg-white/[0.01] border-white/5 opacity-10'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${ach.req ? 'bg-[#6366f1] text-white shadow-lg' : 'bg-white/5'}`}>
                            {ach.icon}
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">{ach.title}</h4>
                        <p className="text-[8px] font-medium opacity-40 uppercase">{ach.desc}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* LOGS */}
        <section>
            <h2 className="text-2xl font-black italic uppercase mb-10">Mission <span className="text-emerald-500">Logs</span></h2>
            <div className="space-y-4">
                {recentQuizzes.map((quiz) => (
                    <div key={quiz.id} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center"><Calendar size={20}/></div>
                            <div>
                                <h4 className="text-lg font-black italic">SESSION #{quiz.id.slice(0,5).toUpperCase()}</h4>
                                <p className="text-[10px] opacity-30 font-bold uppercase">{new Date(quiz.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black opacity-20 uppercase mb-1">Accuracy</p>
                            <p className="text-3xl font-black text-[#6366f1] italic">{Math.round((quiz.score/quiz.total_questions)*100)}%</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      </div>
    </main>
  );
}