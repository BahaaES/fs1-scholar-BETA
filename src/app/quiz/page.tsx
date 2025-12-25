"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, ChevronRight, BrainCircuit, Play, 
  Loader2, Trophy, Clock, Zap, Flame, Crown, ShieldCheck,
  Home, X, AlertTriangle, CheckCircle2, TrendingDown, Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// @ts-ignore
import confetti from "canvas-confetti";

// --- HELPERS FOR XP & RANKS ---
const RANKS = [
  { name: "Bronze", minXp: 0, color: "#cd7f32" },
  { name: "Silver", minXp: 500, color: "#c0c0c0" },
  { name: "Gold", minXp: 1500, color: "#ffd700" },
  { name: "Platinum", minXp: 3000, color: "#e5e4e2" },
  { name: "Emerald", minXp: 5000, color: "#50c878" },
  { name: "Diamond", minXp: 8000, color: "#b9f2ff" },
];

const getRankDetails = (xp: number) => {
  const current = [...RANKS].reverse().find(r => xp >= r.minXp) || RANKS[0];
  const nextIndex = RANKS.findIndex(r => r.name === current.name) + 1;
  const next = RANKS[nextIndex] || null;
  const progress = next ? ((xp - current.minXp) / (next.minXp - current.minXp)) * 100 : 100;
  return { current, next, progress };
};

// --- SHIMMER SKELETON COMPONENT ---
const ShimmerCard = () => (
  <div className="relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 h-48">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
    <div className="w-16 h-16 bg-white/5 rounded-2xl mb-6" />
    <div className="w-2/3 h-6 bg-white/5 rounded-lg mb-3" />
    <div className="w-1/2 h-4 bg-white/5 rounded-lg" />
  </div>
);

export default function QuizArena() {
  const router = useRouter();
  const [view, setView] = useState<'lobby' | 'selection' | 'quiz' | 'results'>('lobby');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isMasteryExam, setIsMasteryExam] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  
  // Data State
  const [globalRankings, setGlobalRankings] = useState<any[]>([]);
  const [rootSubjects, setRootSubjects] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});
  const [subjectMasters, setSubjectMasters] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [weakSubjects, setWeakSubjects] = useState<any[]>([]);
  
  // Selection State
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  
  // Quiz State
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [timeInSeconds, setTimeInSeconds] = useState(0);

  // User Stats
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmitted = useRef(false);
  const [isLaptop, setIsLaptop] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const checkPlatform = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsLaptop(window.innerWidth >= 1024), 100);
    };
    checkPlatform();
    window.addEventListener('resize', checkPlatform);
    return () => {
      window.removeEventListener('resize', checkPlatform);
      clearTimeout(timeoutId);
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const themeColor = "rgba(59, 130, 246, 0.15)";

  // Initial Data Load
  useEffect(() => {
    async function initArena() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Parallel requests for speed
        const [rankRes, subRes, profRes, perfRes] = await Promise.all([
          supabase.from('profiles').select('id, username, xp').order('xp', { ascending: false }).limit(5),
          supabase.from('subjects').select('*').is('parent_slug', null).order('title'),
          user ? supabase.from('profiles').select('*').eq('id', user.id).single() : null,
          user ? supabase.from('quiz_performances').select('score, total_questions, subject_id, subjects(title, icon)').eq('user_id', user.id) : null
        ]);

        if (rankRes.data) setGlobalRankings(rankRes.data);
        if (profRes?.data) setUserProfile(profRes.data);

        // --- SAFETY NET: Filter Subjects that have Questions ---
        // Fetch all question chapter_ids
        const { data: allQ } = await supabase.from('questions').select('chapter_id');
        const activeChapterIds = new Set(allQ?.map(q => q.chapter_id));

        // Fetch chapters related to those IDs
        const { data: activeChapters } = await supabase.from('chapters').select('subject_key').in('id', Array.from(activeChapterIds));
        const activeModuleSlugs = new Set(activeChapters?.map(c => c.subject_key));

        // Fetch modules (sub-subjects)
        const { data: activeModules } = await supabase.from('subjects').select('parent_slug').in('slug', Array.from(activeModuleSlugs));
        const activeSubjectSlugs = new Set(activeModules?.map(m => m.parent_slug));

        // Only keep subjects that eventually lead to questions
        if (subRes.data) {
          const filtered = subRes.data.filter(s => activeSubjectSlugs.has(s.slug));
          setRootSubjects(filtered);
        }

        // --- HEATMAP LOGIC ---
        if (perfRes?.data) {
           const heatMap: any = {};
           perfRes.data.forEach((p: any) => {
              if(!heatMap[p.subject_id]) heatMap[p.subject_id] = { title: p.subjects?.title, icon: p.subjects?.icon, correct: 0, total: 0 };
              heatMap[p.subject_id].correct += p.score;
              heatMap[p.subject_id].total += p.total_questions;
           });
           const weak = Object.values(heatMap)
             .map((s: any) => ({ ...s, accuracy: (s.correct / s.total) * 100 }))
             .filter((s: any) => s.accuracy < 70)
             .sort((a, b) => a.accuracy - b.accuracy)
             .slice(0, 3);
           setWeakSubjects(weak);
        }

      } catch (err) { console.error("Load Error:", err); }
      setLoading(false);
    }
    initArena();
  }, []);

  const rankInfo = useMemo(() => getRankDetails(userProfile?.xp || 0), [userProfile?.xp]);

  useEffect(() => {
    if (view === 'quiz' && !isAnswerChecked && !showExitModal) {
      timerRef.current = setInterval(() => setTimeInSeconds(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view, isAnswerChecked, showExitModal]);

  const fetchSubjectMasters = async (subjectId: string) => {
    const { data } = await supabase
      .from('quiz_performances')
      .select(`score, total_questions, time_seconds, is_mastery, profiles ( username )`)
      .eq('subject_id', subjectId)
      .eq('is_mastery', true)
      .order('time_seconds', { ascending: true });

    if (data) {
      const uniqueMastersMap = new Map();
      data.forEach((entry: any) => {
        const username = entry.profiles?.username || "Scholar";
        if (entry.score === entry.total_questions && !uniqueMastersMap.has(username)) {
          uniqueMastersMap.set(username, { ...entry, display_name: username });
        }
      });
      setSubjectMasters(Array.from(uniqueMastersMap.values()).slice(0, 5));
    }
  };

  const resetQuizState = () => {
    setCurrentQIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setTimeInSeconds(0);
    setSelectedOptions([]);
    setIsAnswerChecked(false);
    setSessionHistory([]);
    setShouldShake(false);
    hasSubmitted.current = false;
    setShowExitModal(false);
  };

  const returnToModuleSelection = () => {
    resetQuizState();
    setSelectedChapters([]);
    if (selectedSubject) fetchSubjectMasters(selectedSubject.id);
    setView('selection');
    setStep(2); 
  };

  const handleSubjectSelect = async (sub: any) => {
    setSelectedSubject(sub);
    setLoading(true);
    
    // Safety Net: Fetch only modules that have questions
    const { data: allQ } = await supabase.from('questions').select('chapter_id');
    const activeChapterIds = Array.from(new Set(allQ?.map(q => q.chapter_id)));
    const { data: activeChapters } = await supabase.from('chapters').select('subject_key').in('id', activeChapterIds);
    const activeModuleSlugs = Array.from(new Set(activeChapters?.map(c => c.subject_key)));

    const [modData] = await Promise.all([
      supabase.from('subjects').select('*').eq('parent_slug', sub.slug).in('slug', activeModuleSlugs).order('title'),
      fetchSubjectMasters(sub.id)
    ]);
    setModules(modData.data || []);
    setStep(2);
    setLoading(false);
  };

  const handleModuleSelect = async (mod: any) => {
    setLoading(true);
    // Safety Net: Fetch only chapters that have questions
    const { data: qData } = await supabase.from('questions').select('chapter_id');
    const activeIds = Array.from(new Set(qData?.map(q => q.chapter_id)));

    const { data: chapData } = await supabase.from('chapters')
      .select('*')
      .eq('subject_key', mod.slug)
      .in('id', activeIds)
      .order('created_at');

    if (chapData) {
      setChapters(chapData);
      const counts: Record<string, number> = {};
      qData?.forEach((q: any) => { 
        if(chapData.some(c => c.id === q.chapter_id)) {
          counts[q.chapter_id] = (counts[q.chapter_id] || 0) + 1; 
        }
      });
      setChapterCounts(counts);
    }
    setStep(3);
    setLoading(false);
  };

  const startQuiz = async (mastery = false) => {
    setLoading(true);
    setIsMasteryExam(mastery);
    let query = supabase.from('questions').select('*');
    if (mastery) {
      const moduleSlugs = modules.map(m => m.slug);
      const { data: chaps } = await supabase.from('chapters').select('id').in('subject_key', moduleSlugs);
      query = query.in('chapter_id', chaps?.map(c => c.id) || []);
    } else {
      query = query.in('chapter_id', selectedChapters);
    }
    const { data } = await query;
    if (data?.length) {
      setQuestions(data.sort(() => 0.5 - Math.random()));
      setView('quiz');
      resetQuizState();
    }
    setLoading(false);
  };

  const checkAnswer = () => {
    const currentQ = questions[currentQIndex];
    const isCorrect = selectedOptions.length === currentQ.correct_indices.length && 
                      selectedOptions.every(i => currentQ.correct_indices.includes(i));
    
    setSessionHistory(prev => [...prev, {
        question: currentQ.question_text,
        options: currentQ.options,
        selected: [...selectedOptions],
        correct: currentQ.correct_indices,
        isCorrect
    }]);

    setIsAnswerChecked(true);

    if (isCorrect) {
      setScore(s => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
    } else {
      setStreak(0);
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 400);
    }
  };

  const handleFinishQuiz = async () => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;
    
    if ((score / questions.length) > 0.7) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#10b981', '#ffffff'] });
    }

    const xp = score * (isMasteryExam ? 30 : 15);
    setXpEarned(xp);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('increment_user_xp', { user_id: user.id, xp_to_add: xp });
        await supabase.from('quiz_performances').insert([{
          user_id: user.id, 
          subject_id: selectedSubject.id, 
          score, 
          total_questions: questions.length, 
          time_seconds: timeInSeconds,
          is_mastery: isMasteryExam
        }]);
        // Update local profile for the animation
        setUserProfile((prev: any) => ({ ...prev, xp: (prev?.xp || 0) + xp }));
      }
    } catch (e) { console.error("Sync Error:", e); }
    setView('results');
  };

  return (
    <main className="relative overflow-x-hidden w-full min-h-[100dvh] text-white bg-[#050505] flex flex-col font-sans selection:bg-blue-500/30">
      
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(circle at 50% 30%, ${themeColor} 0%, transparent 70%)` }} />

      {/* Exit Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500"><AlertTriangle size={28} /></div>
              <h3 className="text-xl font-black uppercase italic mb-2 tracking-tighter">Terminate?</h3>
              <p className="text-white/40 font-bold text-[10px] mb-8 uppercase tracking-widest">Progress will be lost.</p>
              <div className="flex flex-col gap-3">
                <button onClick={returnToModuleSelection} className="w-full py-4 bg-red-600 rounded-xl font-black uppercase text-[10px] hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20">Confirm Exit</button>
                <button onClick={() => setShowExitModal(false)} className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-[10px] hover:bg-white/10 transition-colors">Stay</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 md:px-8 py-4 md:py-8">
        <AnimatePresence mode="wait">
          
          {/* --- LOBBY --- */}
          {view === 'lobby' && (
            <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 md:gap-10 h-full justify-center min-h-[80vh]">
              <header className="relative text-center">
                <button onClick={() => router.push('/')} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors"><Home size={24} /></button>
                <h1 className="text-5xl md:text-8xl lg:text-9xl font-black italic uppercase tracking-tighter leading-none drop-shadow-2xl">Quiz <span className="text-blue-500">Arena</span></h1>
                
                {/* --- RANK PROGRESSION (Lobby) --- */}
                <div className="mt-8 max-w-md mx-auto bg-white/[0.03] border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
                  <div className="flex justify-between items-end mb-3">
                    <div className="text-left">
                       <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Current Standing</p>
                       <h4 className="text-xl font-black italic uppercase" style={{ color: rankInfo.current.color }}>{rankInfo.current.name}</h4>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Next: {rankInfo.next?.name || 'MAX'}</p>
                       <span className="text-xs font-mono font-bold">{userProfile?.xp || 0} XP</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${rankInfo.progress}%` }} className="h-full shadow-[0_0_15px_rgba(255,255,255,0.3)]" style={{ backgroundColor: rankInfo.current.color }} transition={{ duration: 1.5, ease: "easeOut" }} />
                  </div>
                </div>
              </header>
          
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Rankings & Heatmap */}
                <div className="flex flex-col gap-6 order-1 lg:order-2">
                  <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 backdrop-blur-3xl h-fit">
                    <div className="text-amber-500 font-black text-[10px] uppercase mb-6 flex items-center gap-2 tracking-widest"><Trophy size={14}/> Top Scholars</div>
                    <div className="space-y-4">
                      {globalRankings.map((u, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 group">
                          <span className="text-xs font-bold opacity-70 group-hover:opacity-100 transition-opacity">{u.username}</span>
                          <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md">{u.xp} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* --- SUBJECT HEATMAP (Weaknesses) --- */}
                  {weakSubjects.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/10 rounded-[2rem] p-6 backdrop-blur-3xl">
                      <div className="text-red-500 font-black text-[10px] uppercase mb-4 flex items-center gap-2 tracking-widest"><TrendingDown size={14}/> Weak Points</div>
                      <div className="space-y-3">
                        {weakSubjects.map((s, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{s.icon}</span>
                              <span className="text-[10px] font-bold uppercase opacity-60">{s.title}</span>
                            </div>
                            <span className="text-[10px] font-black text-red-400">{Math.round(s.accuracy)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Action */}
                <div onClick={() => { setView('selection'); setStep(1); }} className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] p-8 md:p-12 flex flex-col items-center justify-center cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 group relative overflow-hidden shadow-2xl shadow-blue-900/40 min-h-[250px] md:min-h-[350px] order-2 lg:order-1">
                  <BrainCircuit className="absolute -right-12 -bottom-12 opacity-10 group-hover:rotate-12 transition-transform duration-1000 w-[200px] h-[200px] md:w-[350px] md:h-[350px] text-white" />
                  <h2 className="text-3xl md:text-5xl lg:text-6xl font-black italic uppercase mb-8 z-10 text-center leading-tight">
                    {isLaptop ? "Enter Focus Mode" : "Enter The Arena"}
                  </h2>
                  <button className="px-10 md:px-14 py-4 md:py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-[0.2em] z-10 flex items-center gap-3 shadow-xl group-hover:bg-blue-50 transition-colors">
                    {isLaptop ? <><Zap size={18} fill="currentColor"/> Begin Session</> : <><Play size={18} fill="currentColor"/> Quiz Hub</>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- SELECTION (With Skeletons) --- */}
          {view === 'selection' && (
            <motion.div key="selection" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => step === 1 ? setView('lobby') : setStep(step - 1)} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-opacity">
                  <ArrowLeft size={14}/> Back
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {[1,2,3,4,5,6].map(i => <ShimmerCard key={i} />)}
                </div>
              ) : (
                <>
                  {step === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                      {rootSubjects.map(sub => (
                        <div key={sub.id} onClick={() => handleSubjectSelect(sub)} className="group p-8 md:p-12 rounded-[2.5rem] bg-white/[0.03] border border-white/10 hover:border-blue-500/30 hover:bg-white/[0.05] cursor-pointer transition-all active:scale-[0.97]">
                          <span className="text-5xl md:text-6xl mb-6 block group-hover:scale-110 transition-transform duration-300 origin-left">{sub.icon}</span>
                          <h3 className="text-xl md:text-3xl font-black uppercase italic leading-none text-white/90">{sub.title}</h3>
                        </div>
                      ))}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                      <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 h-fit order-1 lg:order-2">
                        <div className="text-emerald-500 font-black text-[10px] uppercase mb-4 flex items-center gap-2 tracking-widest"><Trophy size={14}/> Hall of Fame</div>
                        <div className="space-y-4">
                          {subjectMasters.length > 0 ? subjectMasters.map((m, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                              <div className="flex flex-col">
                                 <div className="flex items-center gap-1">
                                    {i === 0 && <Crown size={12} className="text-amber-500 fill-amber-500"/>}
                                    <span className={`text-xs font-bold italic ${i===0 ? 'text-amber-500' : 'opacity-60'}`}>{m.display_name}</span>
                                 </div>
                                 <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter mt-0.5">MASTER</span>
                              </div>
                              <span className="text-[10px] font-black opacity-40 font-mono">{formatTime(m.time_seconds)}</span>
                            </div>
                          )) : <div className="py-8 text-center opacity-30"><Trophy size={24} className="mx-auto mb-2"/><p className="text-[10px] uppercase font-bold">No Legends Yet</p></div>}
                        </div>
                      </div>

                      <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-white/[0.05] to-transparent p-6 rounded-[2rem] border border-white/5">
                            <div className="flex items-center gap-4">
                              <span className="text-4xl shadow-sm">{selectedSubject?.icon}</span>
                              <div>
                                 <h1 className="text-2xl md:text-3xl font-black uppercase italic">{selectedSubject?.title}</h1>
                                 <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Select a module</p>
                              </div>
                            </div>
                            <button onClick={() => startQuiz(true)} className="w-full md:w-auto px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2">
                              <Crown size={14}/> Mastery Exam
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {modules.map(mod => (
                            <div key={mod.id} onClick={() => handleModuleSelect(mod)} className="p-5 md:p-6 rounded-[1.5rem] bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] hover:border-white/20 cursor-pointer flex justify-between items-center group transition-all">
                              <span className="text-sm md:text-base font-black uppercase italic flex items-center gap-3"><span className="opacity-70 text-lg">{mod.icon}</span> {mod.title}</span>
                              <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-blue-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                          <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">Target <span className="text-purple-500">Chapters</span></h1>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-2">Select one or multiple</p>
                        </div>
                        <button onClick={() => startQuiz(false)} disabled={selectedChapters.length === 0} className="w-full md:w-auto px-10 py-4 bg-white text-black rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-20 disabled:scale-100 active:scale-95 transition-all shadow-xl hover:scale-105 hover:bg-purple-50">
                          <Flame size={16} className={selectedChapters.length > 0 ? "text-purple-600 fill-purple-600" : ""}/> Start Session
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-20 md:pb-0">
                        {chapters.map(chap => (
                          <div key={chap.id} onClick={() => setSelectedChapters(p => p.includes(chap.id) ? p.filter(c => c !== chap.id) : [...p, chap.id])} className={`p-6 rounded-[1.5rem] border transition-all cursor-pointer relative overflow-hidden ${selectedChapters.includes(chap.id) ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 'bg-white/[0.03] border-white/10 hover:bg-white/5'}`}>
                            {selectedChapters.includes(chap.id) && <div className="absolute top-0 right-0 p-3"><CheckCircle2 size={16} className="text-purple-500 fill-purple-500/20"/></div>}
                            <span className="font-black uppercase italic block text-base md:text-lg leading-tight pr-6">{chap.title}</span>
                            <p className="text-[9px] opacity-40 uppercase font-black mt-3 flex items-center gap-1"><BrainCircuit size={10}/> {chapterCounts[chap.id] || 0} Questions</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* --- QUIZ --- */}
          {view === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full relative">
              <div className="fixed top-0 left-0 w-full h-1.5 bg-white/5 z-[200]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }} className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]" transition={{ type: 'spring', stiffness: 50 }} />
              </div>
              <div className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 bg-[#050505]/90 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full flex items-center gap-6 z-[100] shadow-2xl scale-90 md:scale-100">
                <button onClick={() => setShowExitModal(true)} className="p-2 -ml-2 hover:text-red-500 transition-colors opacity-60 hover:opacity-100"><X size={18} /></button>
                <div className="flex items-center gap-2 text-amber-500">
                  <Clock size={16}/><span className="font-mono font-black text-xl">{formatTime(timeInSeconds)}</span>
                </div>
                {streak >= 3 && (
                   <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/50">
                    <Flame size={12} className="text-orange-500 fill-orange-500" />
                    <span className="text-orange-500 font-black text-[10px]">{streak}</span>
                  </div>
                )}
                <span className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap opacity-60 pl-2 border-l border-white/10">Q. {currentQIndex + 1}/{questions.length}</span>
              </div>
              
              <motion.div animate={shouldShake ? { x: [-10, 10, -10, 10, 0] } : {}} className={`flex flex-col justify-center items-center gap-8 w-full max-w-4xl mx-auto flex-1 mt-20 md:mt-0 pb-28 md:pb-0`}>
                <div className="w-full">
                  <div className="p-8 md:p-12 rounded-[2rem] bg-white/[0.04] border border-white/10 backdrop-blur-xl flex items-center relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 to-transparent"/>
                    <div className="max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar w-full text-center md:text-left">
                      <h2 className="text-xl md:text-3xl font-black italic leading-tight tracking-tight text-white/95">{questions[currentQIndex]?.question_text}</h2>
                    </div>
                  </div>
                </div>
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {questions[currentQIndex]?.options.map((opt: string, idx: number) => {
                      const isSelected = selectedOptions.includes(idx);
                      const isCorrect = questions[currentQIndex].correct_indices.includes(idx);
                      let style = isSelected ? "border-blue-500 bg-blue-500/10 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]";
                      if (isAnswerChecked) {
                          if (isCorrect) style = "border-emerald-500 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
                          else if (isSelected) style = "border-red-500 bg-red-500/20 text-red-400 opacity-50";
                          else style = "border-white/5 opacity-30"; 
                      }
                      return (
                        <button key={idx} onClick={() => !isAnswerChecked && setSelectedOptions(p => p.includes(idx) ? p.filter(i => i !== idx) : [...p, idx])} className={`group text-left p-5 md:p-6 rounded-2xl border-2 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] ${style}`}>
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center font-black text-xs transition-all ${isSelected ? 'bg-white text-black border-white' : 'border-white/10 opacity-30 text-white'}`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="font-bold text-sm leading-snug">{opt}</span>
                        </button>
                      );
                    })}
                </div>
                  <div className="fixed bottom-0 left-0 w-full p-4 bg-[#050505]/80 backdrop-blur-xl border-t border-white/10 md:static md:bg-transparent md:border-0 md:p-0 flex justify-end z-[50]">
                    {!isAnswerChecked ?
                      <button disabled={selectedOptions.length === 0} onClick={checkAnswer} className="w-full md:w-auto px-12 py-4 bg-white text-black rounded-xl font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all shadow-xl disabled:opacity-20 active:scale-95">Commit Choice</button> :
                      <button onClick={() => currentQIndex < questions.length - 1 ? (setCurrentQIndex(currentQIndex + 1), setSelectedOptions([]), setIsAnswerChecked(false)) : handleFinishQuiz()} className="w-full md:w-auto px-12 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-4 shadow-lg active:scale-95 transition-all">Next Protocol <ChevronRight size={16}/></button>
                    }
                  </div>
              </motion.div>
            </motion.div>
          )}

          {/* --- RESULTS (With XP Animation) --- */}
          {view === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto flex-1 w-full pt-8">
              <div className="text-center mb-8 md:mb-12">
                <h1 className="text-5xl md:text-8xl font-black italic uppercase text-white mb-6 tracking-tighter leading-none">Session Over</h1>
                <div className="flex flex-col items-center gap-6">
                  <div className="flex justify-center gap-3">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 font-black uppercase text-[10px] md:text-xs tracking-wider"><Zap size={14}/> +{xpEarned} XP</div>
                    {maxStreak >= 3 && (<div className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-500 font-black uppercase text-[10px] md:text-xs tracking-wider"><Flame size={14}/> {maxStreak} Streak</div>)}
                  </div>
                  
                  {/* --- XP PROGRESS ANIMATION (Results) --- */}
                  <div className="w-full max-w-sm bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase opacity-40">Rank Progression</span>
                        <span className="text-xs font-black italic" style={{ color: rankInfo.current.color }}>{rankInfo.current.name}</span>
                      </div>
                      <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        {/* The width animates from a "before XP" state to "after XP" state */}
                        <motion.div initial={{ width: `${((userProfile?.xp - xpEarned - rankInfo.current.minXp) / (rankInfo.next!.minXp - rankInfo.current.minXp)) * 100}%` }} animate={{ width: `${rankInfo.progress}%` }} className="h-full relative shadow-[0_0_20px_rgba(255,255,255,0.2)]" style={{ backgroundColor: rankInfo.current.color }} transition={{ duration: 2, delay: 0.5, ease: "circOut" }}>
                           <div className="absolute top-0 right-0 h-full w-2 bg-white/40 blur-sm" />
                        </motion.div>
                      </div>
                      <p className="text-[9px] font-bold uppercase opacity-30 mt-3 tracking-widest">
                        {rankInfo.next ? `${rankInfo.next.minXp - (userProfile?.xp || 0)} XP to ${rankInfo.next.name}` : "Maximum Rank Achieved"}
                      </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-6 mb-8">
                 <div className="p-8 md:p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 text-center backdrop-blur-xl">
                    <div className="text-4xl md:text-7xl font-black italic mb-2 tracking-tighter text-white/90">{questions.length > 0 ? Math.round((score/questions.length)*100) : 0}%</div>
                    <div className="text-[10px] uppercase font-black opacity-30 tracking-[0.3em]">Accuracy</div>
                 </div>
                 <div className="p-8 md:p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 text-center backdrop-blur-xl">
                    <div className="text-4xl md:text-7xl font-black italic mb-2 tracking-tighter text-white/90">{formatTime(timeInSeconds)}</div>
                    <div className="text-[10px] uppercase font-black opacity-30 tracking-[0.3em]">Time</div>
                 </div>
              </div>

              <div className="space-y-6 mb-12">
                <h3 className="text-lg font-black italic uppercase text-white/40 tracking-tighter flex items-center gap-2 px-4"><ShieldCheck size={18}/> Performance Review</h3>
                <div className="grid gap-4">
                  {sessionHistory.map((item, i) => (
                    <div key={i} className={`p-6 rounded-[2rem] border flex flex-col gap-3 ${item.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <div className="flex items-start gap-4">
                          {item.isCorrect ? <CheckCircle2 size={24} className="text-emerald-500 shrink-0"/> : <X size={24} className="text-red-500 shrink-0"/>}
                          <div>
                            <p className="font-bold text-sm md:text-lg leading-tight text-white/90">{item.question}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                               {item.options.map((opt:string, oIdx: number) => (
                                 (item.selected.includes(oIdx) || item.correct.includes(oIdx)) && (
                                   <span key={oIdx} className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${item.correct.includes(oIdx) ? 'border-emerald-500 text-emerald-500' : 'border-red-500 text-red-500'}`}>
                                      {opt}
                                   </span>
                                 )
                               ))}
                            </div>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center pb-12">
                <button onClick={returnToModuleSelection} className="w-full md:w-auto px-16 py-6 bg-white text-black rounded-full font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all">Return to Domain</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </main>
  );
}