"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, ChevronRight, BrainCircuit, Play, 
  Loader2, Trophy, Clock, Zap, Flame, Crown, ShieldCheck,
  Home, X, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuizArena() {
  const router = useRouter();
  const [view, setView] = useState<'lobby' | 'selection' | 'quiz' | 'results'>('lobby');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isMasteryExam, setIsMasteryExam] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false); 
  
  const [globalRankings, setGlobalRankings] = useState<any[]>([]);
  const [rootSubjects, setRootSubjects] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({}); 
  const [subjectMasters, setSubjectMasters] = useState<any[]>([]);
  
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [timeInSeconds, setTimeInSeconds] = useState(0);

  // Streak State
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmitted = useRef(false);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Dynamic Theme Mapping
  const themeColor = useMemo(() => {
    if (!selectedSubject) return "rgba(59, 130, 246, 0.15)"; // Default Blue
    const title = selectedSubject.title.toLowerCase();
    if (title.includes('bio')) return "rgba(16, 185, 129, 0.15)"; // Emerald
    if (title.includes('math') || title.includes('physic')) return "rgba(139, 92, 246, 0.15)"; // Purple
    if (title.includes('chem')) return "rgba(245, 158, 11, 0.15)"; // Amber
    return "rgba(59, 130, 246, 0.15)";
  }, [selectedSubject]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    async function initArena() {
      setLoading(true);
      try {
        const [rankRes, subRes] = await Promise.all([
          supabase.from('profiles').select('id, username, xp').order('xp', { ascending: false }).limit(5),
          supabase.from('subjects').select('*').is('parent_slug', null).order('title')
        ]);
        if (rankRes.data) setGlobalRankings(rankRes.data);
        if (subRes.data) setRootSubjects(subRes.data);
      } catch (err) { console.error("Load Error:", err); }
      setLoading(false);
    }
    initArena();
  }, []);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (view === 'quiz' && !isAnswerChecked && !showExitModal) {
      timerRef.current = setInterval(() => setTimeInSeconds(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view, isAnswerChecked, showExitModal]);

  const fetchSubjectMasters = async (subjectId: string) => {
    const { data, error } = await supabase
      .from('quiz_performances')
      .select(`
        score, total_questions, time_seconds, is_mastery,
        profiles ( username )
      `)
      .eq('subject_id', subjectId)
      .eq('is_mastery', true)
      .order('time_seconds', { ascending: true });
    
    if (data) {
      const uniqueMastersMap = new Map();
      data.forEach((entry: any) => {
        const username = entry.profiles?.username || "Scholar";
        if (entry.score === entry.total_questions) {
          if (!uniqueMastersMap.has(username)) {
            uniqueMastersMap.set(username, { ...entry, display_name: username });
          }
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
    hasSubmitted.current = false;
    setShowExitModal(false);
  };

  const returnToModuleSelection = async () => {
    resetQuizState();
    setSelectedChapters([]); 
    if (selectedSubject) fetchSubjectMasters(selectedSubject.id);
    setView('selection');
    setStep(2); 
  };

  const handleSubjectSelect = async (sub: any) => {
    setSelectedSubject(sub);
    setLoading(true);
    const [modData] = await Promise.all([
      supabase.from('subjects').select('*').eq('parent_slug', sub.slug).order('title'),
      fetchSubjectMasters(sub.id)
    ]);
    setModules(modData.data || []);
    setStep(2);
    setLoading(false);
  };

  const handleModuleSelect = async (mod: any) => {
    setLoading(true);
    const { data: chapData } = await supabase.from('chapters').select('*').eq('subject_key', mod.slug).order('created_at');
    if (chapData) {
      setChapters(chapData);
      const { data: qData } = await supabase.from('questions').select('chapter_id').in('chapter_id', chapData.map(c => c.id));
      const counts: Record<string, number> = {};
      qData?.forEach((q: any) => { counts[q.chapter_id] = (counts[q.chapter_id] || 0) + 1; });
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

  const handleFinishQuiz = async () => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;
    const xp = score * (isMasteryExam ? 30 : 15);
    setXpEarned(xp);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await Promise.all([
          supabase.rpc('increment_user_xp', { user_id: user.id, xp_to_add: xp }),
          supabase.from('quiz_performances').insert([{
            user_id: user.id, 
            subject_id: selectedSubject.id, 
            score, 
            total_questions: questions.length, 
            time_seconds: timeInSeconds,
            is_mastery: isMasteryExam
          }])
        ]);
      }
    } catch (e) { console.error("Sync Error:", e); }
    setView('results');
  };

  const checkAnswer = () => {
    const currentQ = questions[currentQIndex];
    const isCorrect = selectedOptions.every(i => currentQ.correct_indices.includes(i)) && 
                      selectedOptions.length === currentQ.correct_indices.length;
    
    setIsAnswerChecked(true);
    if (isCorrect) {
      setScore(s => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
    } else {
      setStreak(0);
    }
  };

  if (loading && view === 'lobby') return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <main className="relative overflow-hidden max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 lg:py-8 min-h-screen text-white bg-[#050505] flex flex-col justify-center">
      
      {/* DYNAMIC BACKGROUND GLOW */}
      <div 
        className="fixed inset-0 pointer-events-none transition-colors duration-1000 ease-in-out z-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${themeColor} 0%, transparent 70%)`
        }}
      />

      <AnimatePresence>
        {showExitModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl md:text-3xl font-black uppercase italic mb-2 tracking-tighter">Terminate?</h3>
              <p className="text-white/40 font-bold text-xs md:text-sm mb-8 leading-relaxed uppercase">Current progress and potential XP gains will be lost.</p>
              
              <div className="flex flex-col gap-3">
                <button onClick={returnToModuleSelection} className="w-full py-4 md:py-5 bg-red-600 hover:bg-red-700 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-colors shadow-lg">Confirm Exit</button>
                <button onClick={() => setShowExitModal(false)} className="w-full py-4 md:py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all">Stay in Arena</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {view === 'lobby' && (
            <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 md:space-y-10">
              <header className="relative text-center mb-6 lg:mb-10">
                <button onClick={() => router.push('/')} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                  <Home size={24} />
                </button>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter leading-none pt-8 md:pt-0">Quiz <span className="text-blue-500">Arena</span></h1>
              </header>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 backdrop-blur-3xl order-2 lg:order-1">
                  <div className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-6 md:mb-8 flex items-center gap-2"><Trophy size={14}/> Top Scholars</div>
                  <div className="space-y-4">
                    {globalRankings.map((u, i) => (
                      <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                        <span className="text-sm font-bold opacity-80">{u.username}</span>
                        <span className="text-xs font-black text-blue-400">{u.xp} XP</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div onClick={() => { setView('selection'); setStep(1); }} className="lg:col-span-2 bg-blue-600 rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-700 transition-all relative overflow-hidden group shadow-xl order-1 lg:order-2 min-h-[250px] md:min-h-0">
                  <BrainCircuit size={200} className="absolute -right-10 -bottom-10 opacity-10 group-hover:rotate-12 transition-transform duration-1000 md:size-[300px]" />
                  <h2 className="text-3xl md:text-5xl font-black italic uppercase mb-6 md:mb-8 z-10 text-center leading-tight">Enter the <br/>Knowledge Domain</h2>
                  <button className="px-10 md:px-12 py-4 md:py-5 bg-white text-black rounded-xl md:rounded-2xl font-black uppercase tracking-widest z-10 flex items-center gap-3 active:scale-95 transition-transform">
                    <Play size={20} fill="currentColor"/> Enter
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'selection' && (
            <motion.div key="selection" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
              <button onClick={() => step === 1 ? setView('lobby') : setStep(step - 1)} className="mb-6 lg:mb-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">
                <ArrowLeft size={14}/> Back
              </button>

              {step === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {rootSubjects.map(sub => (
                    <div key={sub.id} onClick={() => handleSubjectSelect(sub)} className="p-6 md:p-8 lg:p-10 rounded-[1.5rem] md:rounded-[2.5rem] bg-white/[0.03] border border-white/10 hover:border-blue-500/50 cursor-pointer transition-all active:scale-[0.98]">
                      <span className="text-4xl md:text-5xl mb-4 md:mb-6 block">{sub.icon}</span>
                      <h3 className="text-xl md:text-2xl font-black uppercase italic leading-none">{sub.title}</h3>
                    </div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                  <div className="lg:col-span-2 space-y-3 md:space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                      <h1 className="text-3xl md:text-4xl font-black uppercase italic">Select <span className="text-emerald-400">Module</span></h1>
                      <button onClick={() => startQuiz(true)} className="w-full md:w-auto bg-amber-500 text-black px-5 py-3.5 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-lg active:scale-95">
                        <ShieldCheck size={16}/> Mastery Exam
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {modules.map(mod => (
                        <div key={mod.id} onClick={() => handleModuleSelect(mod)} className="p-5 md:p-6 lg:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-white/[0.03] border border-white/10 hover:bg-white/10 cursor-pointer flex justify-between items-center group transition-all active:bg-white/5">
                          <span className="text-base md:text-lg lg:text-xl font-black uppercase italic flex items-center gap-3">
                            <span className="opacity-70">{mod.icon}</span> {mod.title}
                          </span>
                          <ChevronRight size={20} className="opacity-20 group-hover:opacity-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 h-fit shadow-2xl backdrop-blur-3xl">
                    <div className="text-amber-500 font-black text-[10px] uppercase mb-6 md:mb-8 flex items-center gap-2"><Crown size={14}/> Subject Masters</div>
                    <div className="space-y-4">
                      {subjectMasters.length > 0 ? subjectMasters.map((m, i) => (
                        <div key={i} className="flex justify-between py-3 border-b border-white/5 last:border-0 items-center">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold lowercase opacity-80">{m.display_name}</span>
                            <span className="text-[8px] opacity-40 uppercase font-black">{formatTime(m.time_seconds)}</span>
                          </div>
                          <div className="px-2 py-1 bg-amber-500/20 rounded border border-amber-500/50 text-[9px] font-black text-amber-500">MASTER</div>
                        </div>
                      )) : <div className="text-center py-8 opacity-20 text-[10px] font-black uppercase tracking-widest">No Masters Recorded</div>}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 md:space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Target <span className="text-purple-500">Chapters</span></h1>
                    <button onClick={() => startQuiz(false)} disabled={selectedChapters.length === 0} className="w-full md:w-auto px-10 py-5 bg-white text-black rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest disabled:opacity-20 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl">
                      <Flame size={18}/> Start Quiz
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {chapters.map(chap => (
                      <div key={chap.id} onClick={() => setSelectedChapters(p => p.includes(chap.id) ? p.filter(c => c !== chap.id) : [...p, chap.id])}
                        className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border transition-all cursor-pointer active:scale-[0.98] ${selectedChapters.includes(chap.id) ? 'border-purple-500 bg-purple-500/10 shadow-lg' : 'bg-white/[0.03] border-white/10 hover:bg-white/5'}`}>
                        <span className="font-black uppercase italic block text-base md:text-lg leading-tight">{chap.title}</span>
                        <p className="text-[9px] md:text-[10px] opacity-40 uppercase font-black mt-2 tracking-widest">{chapterCounts[chap.id] || 0} Questions Available</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto pt-12 md:pt-16 pb-12 w-full">
                <div className="fixed top-2 md:top-4 left-1/2 -translate-x-1/2 bg-black/90 md:bg-black/80 backdrop-blur-xl border border-white/10 px-4 md:px-8 py-2 rounded-full flex items-center gap-4 md:gap-8 z-[100] shadow-2xl w-[95%] md:w-auto justify-between md:justify-start">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setShowExitModal(true)} className="p-2 hover:text-red-500 transition-colors"><X size={18} /></button>
                    <div className="flex items-center gap-2 text-amber-500">
                      <Clock size={16}/>
                      <span className="font-mono font-black text-lg md:text-xl tracking-tighter">{formatTime(timeInSeconds)}</span>
                    </div>
                  </div>
                  
                  {/* STREAK ICON */}
                  <AnimatePresence>
                    {streak >= 3 && (
                      <motion.div 
                        initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
                        className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/50"
                      >
                        <Flame size={16} className="text-orange-500 fill-orange-500 animate-pulse" />
                        <span className="text-orange-500 font-black text-sm">{streak}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <span className="text-blue-400 font-black text-[9px] md:text-[10px] uppercase tracking-widest text-right">Q. {currentQIndex + 1}/{questions.length}</span>
                </div>
                
                <div 
                  className={`p-6 md:p-8 lg:p-10 rounded-[2.5rem] md:rounded-[3rem] bg-white/[0.03] border backdrop-blur-3xl shadow-2xl transition-all duration-500 ${streak >= 3 ? 'border-orange-500/40' : 'border-white/10'}`}
                >
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-black italic mb-6 md:mb-10 leading-tight">{questions[currentQIndex]?.question_text}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {questions[currentQIndex]?.options.map((opt: string, idx: number) => {
                      const isSelected = selectedOptions.includes(idx);
                      const isCorrect = questions[currentQIndex].correct_indices.includes(idx);
                      let style = isSelected ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/[0.02]";
                      if (isAnswerChecked) {
                          if (isCorrect) style = "border-emerald-500 bg-emerald-500/20";
                          else if (isSelected) style = "border-red-500 bg-red-500/20";
                      }
                      return (
                        <button key={idx} onClick={() => !isAnswerChecked && setSelectedOptions(p => p.includes(idx) ? p.filter(i => i !== idx) : [...p, idx])}
                          className={`w-full text-left p-4 md:p-5 lg:p-6 rounded-xl md:rounded-2xl border-2 flex items-center gap-3 md:gap-4 transition-all duration-300 active:scale-[0.98] ${style}`}>
                          <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg border flex items-center justify-center font-black text-sm md:text-base ${isSelected ? 'bg-blue-500 border-blue-400' : 'border-white/10 opacity-30'}`}>{String.fromCharCode(65 + idx)}</div>
                          <span className="font-bold text-sm md:text-base lg:text-lg leading-snug">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8 md:mt-10 flex justify-end">
                    {!isAnswerChecked ? 
                      <button disabled={selectedOptions.length === 0} onClick={checkAnswer} className="w-full md:w-auto px-10 md:px-14 py-4 md:py-5 bg-white text-black rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">Commit Choice</button> :
                      <button onClick={() => currentQIndex < questions.length - 1 ? (setCurrentQIndex(currentQIndex + 1), setSelectedOptions([]), setIsAnswerChecked(false)) : handleFinishQuiz()} className="w-full md:w-auto px-10 md:px-14 py-4 md:py-5 bg-blue-600 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 active:scale-95 transition-all shadow-xl">Next Protocol</button>
                    }
                  </div>
                </div>
            </motion.div>
          )}

          {view === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center py-6 md:py-10">
              <h1 className="text-5xl md:text-8xl font-black italic uppercase text-blue-400 mb-4 tracking-tighter leading-none">Session Over</h1>
              <div className="flex flex-wrap justify-center gap-3 mb-8 md:mb-12">
                <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 font-black uppercase text-[10px] md:text-sm tracking-widest">
                  <Zap size={18} fill="currentColor"/> +{xpEarned} XP Earned
                </div>
                {maxStreak >= 3 && (
                  <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-500 font-black uppercase text-[10px] md:text-sm tracking-widest">
                    <Flame size={18} fill="currentColor"/> {maxStreak} Max Streak
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:gap-8 mb-10 md:mb-12">
                 <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                    <div className="text-3xl md:text-6xl font-black italic mb-1 md:mb-2 tracking-tighter">{questions.length > 0 ? Math.round((score/questions.length)*100) : 0}%</div>
                    <div className="text-[8px] md:text-[10px] uppercase font-black opacity-30 tracking-widest">Accuracy</div>
                 </div>
                 <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                    <div className="text-3xl md:text-6xl font-black italic mb-1 md:mb-2 tracking-tighter">{formatTime(timeInSeconds)}</div>
                    <div className="text-[8px] md:text-[10px] uppercase font-black opacity-30 tracking-widest">Time</div>
                 </div>
              </div>
              <button onClick={returnToModuleSelection} className="w-full md:w-auto px-10 md:px-20 py-5 md:py-7 bg-white text-black rounded-xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.5em] hover:scale-105 active:scale-95 transition-all shadow-2xl">Return to Domain</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}