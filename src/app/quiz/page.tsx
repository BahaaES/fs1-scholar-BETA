"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, ChevronRight, BrainCircuit, Play, 
  Loader2, Trophy, Clock, Zap, Flame, Crown, ShieldCheck,
  Home, X, AlertTriangle, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// @ts-ignore
import confetti from "canvas-confetti";

export default function QuizArena() {
  const router = useRouter();
  const [view, setView] = useState<'lobby' | 'selection' | 'quiz' | 'results'>('lobby');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isMasteryExam, setIsMasteryExam] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  
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

  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmitted = useRef(false);

  // Check for laptop screens
  const [isLaptop, setIsLaptop] = useState(false);

  useEffect(() => {
    const checkPlatform = () => setIsLaptop(window.innerWidth >= 1024);
    checkPlatform();
    window.addEventListener('resize', checkPlatform);
    return () => window.removeEventListener('resize', checkPlatform);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Fixed Blue Theme (Old Style)
  const themeColor = "rgba(59, 130, 246, 0.2)"; 

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

  const checkAnswer = () => {
    const currentQ = questions[currentQIndex];
    const isCorrect = selectedOptions.every(i => currentQ.correct_indices.includes(i)) && 
                      selectedOptions.length === currentQ.correct_indices.length;
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
      setTimeout(() => setShouldShake(false), 500);
    }
  };

  const handleFinishQuiz = async () => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;
    if (score === questions.length && questions.length > 0) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#10b981', '#ffffff'] });
    }
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

  if (loading && view === 'lobby') return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <main className="relative overflow-x-hidden max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 min-h-screen text-white bg-[#050505] flex flex-col">
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: `radial-gradient(circle at 50% 50%, ${themeColor} 0%, transparent 85%)` }}
      />

      <AnimatePresence>
        {showExitModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0a0a0a] border border-white/10 p-6 md:p-10 rounded-[2rem] max-w-md w-full text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={24} /></div>
              <h3 className="text-xl font-black uppercase italic mb-2 tracking-tighter">Terminate?</h3>
              <p className="text-white/40 font-bold text-[10px] mb-6 uppercase tracking-widest">Progress will be lost.</p>
              <div className="flex flex-col gap-2">
                <button onClick={returnToModuleSelection} className="w-full py-3 bg-red-600 rounded-xl font-black uppercase text-[10px]">Confirm Exit</button>
                <button onClick={() => setShowExitModal(false)} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-[10px]">Stay</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {view === 'lobby' && (
            <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 md:space-y-10">
              <header className="relative text-center pt-4">
                <button onClick={() => router.push('/')} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors"><Home size={24} /></button>
                <h1 className="text-4xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">Quiz <span className="text-blue-500">Arena</span></h1>
              </header>
         
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 backdrop-blur-3xl order-1 lg:order-1">
                  <div className="text-amber-500 font-black text-[10px] uppercase mb-4 flex items-center gap-2"><Trophy size={14}/> Top Scholars</div>
                  <div className="space-y-3">
                    {globalRankings.map((u, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <span className="text-xs font-bold opacity-80">{u.username}</span>
                        <span className="text-[10px] font-black text-blue-400">{u.xp} XP</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* THE FOCUS BUTTON VS HUB LOGIC */}
                <div onClick={() => { setView('selection'); setStep(1); }} className="lg:col-span-2 bg-blue-600 rounded-[1.5rem] md:rounded-[2rem] p-8 md:p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-700 transition-all group relative overflow-hidden shadow-xl min-h-[180px] md:min-h-[250px] order-2 lg:order-2">
                  <BrainCircuit size={150} className="absolute -right-5 -bottom-5 opacity-10 group-hover:rotate-12 transition-transform duration-1000 md:size-[200px]" />
                  <h2 className="text-2xl md:text-5xl font-black italic uppercase mb-4 md:mb-8 z-10 text-center leading-tight">Enter the <br/>Knowledge Domain</h2>
                  <button className="px-6 md:px-10 py-3 md:py-4 bg-white text-black rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest z-10 flex items-center gap-3">
                    {isLaptop ? (
                      <><Zap size={16} fill="currentColor"/> Focus Mode</>
                    ) : (
                      <><Play size={16} fill="currentColor"/> Quiz Hub</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ... Rest of the selection, quiz, and results views remain as in the previous verified version ... */}
          {view === 'selection' && (
            <motion.div key="selection" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex-1">
              <button onClick={() => step === 1 ? setView('lobby') : setStep(step - 1)} className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-opacity pt-2">
                <ArrowLeft size={14}/> Back
              </button>
              {step === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {rootSubjects.map(sub => (
                    <div key={sub.id} onClick={() => handleSubjectSelect(sub)} className="p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] bg-white/[0.03] border border-white/10 hover:border-blue-500/50 cursor-pointer transition-all active:scale-[0.98]">
                      <span className="text-3xl md:text-5xl mb-4 md:mb-6 block">{sub.icon}</span>
                      <h3 className="text-lg md:text-2xl font-black uppercase italic leading-none">{sub.title}</h3>
                    </div>
                  ))}
                </div>
              )}
              {step === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                       <h1 className="text-xl md:text-3xl font-black uppercase italic">Select <span className="text-emerald-400">Module</span></h1>
                       <button onClick={() => startQuiz(true)} className="w-full md:w-auto px-4 py-2 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2">
                          <Crown size={12}/> Full Mastery Exam
                       </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modules.map(mod => (
                        <div key={mod.id} onClick={() => handleModuleSelect(mod)} className="p-4 md:p-6 rounded-[1rem] md:rounded-[1.5rem] bg-white/[0.03] border border-white/10 hover:bg-white/10 cursor-pointer flex justify-between items-center group transition-all">
                          <span className="text-sm md:text-lg font-black uppercase italic flex items-center gap-3"><span className="opacity-70">{mod.icon}</span> {mod.title}</span>
                          <ChevronRight size={16} className="opacity-20 group-hover:opacity-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] md:rounded-[2rem] p-6 order-first lg:order-last backdrop-blur-3xl">
                    <div className="text-emerald-500 font-black text-[10px] uppercase mb-4 flex items-center gap-2"><Trophy size={14}/> Hall of Fame</div>
                    <div className="space-y-3">
                      {subjectMasters.length > 0 ? subjectMasters.map((m, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                          <div className="flex flex-col">
                             <div className="flex items-center gap-1">
                                {i === 0 && <Crown size={10} className="text-amber-500 fill-amber-500"/>}
                                <span className="text-xs font-bold opacity-60 italic">{m.display_name}</span>
                             </div>
                             <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">MASTER</span>
                          </div>
                          <span className="text-[10px] font-black opacity-40">{formatTime(m.time_seconds)}</span>
                        </div>
                      )) : <p className="text-[10px] opacity-20 uppercase font-bold text-center py-4 tracking-widest italic">Be the first legend</p>}
                    </div>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter">Target <span className="text-purple-500">Chapters</span></h1>
                    <button onClick={() => startQuiz(false)} disabled={selectedChapters.length === 0} className="w-full md:w-auto px-8 py-4 bg-white text-black rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-20 active:scale-95 transition-all shadow-xl">
                      <Flame size={16}/> Start Quiz
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {chapters.map(chap => (
                      <div key={chap.id} onClick={() => setSelectedChapters(p => p.includes(chap.id) ? p.filter(c => c !== chap.id) : [...p, chap.id])} className={`p-5 md:p-8 rounded-[1.2rem] md:rounded-[2rem] border transition-all cursor-pointer ${selectedChapters.includes(chap.id) ? 'border-purple-500 bg-purple-500/10' : 'bg-white/[0.03] border-white/10 hover:bg-white/5'}`}>
                        <span className="font-black uppercase italic block text-sm md:text-lg leading-tight">{chap.title}</span>
                        <p className="text-[9px] opacity-40 uppercase font-black mt-2">{chapterCounts[chap.id] || 0} Qs</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto flex flex-col justify-center flex-1 h-full py-8 md:py-20 w-full">
              <div className="fixed top-0 left-0 w-full h-1 bg-white/5 z-[200]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }} className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" transition={{ type: 'spring', stiffness: 50 }} />
              </div>
              
              <div className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 px-4 md:px-8 py-2 md:py-3 rounded-full flex items-center gap-6 z-[100] shadow-2xl scale-90 md:scale-100">
                <button onClick={() => setShowExitModal(true)} className="p-2 hover:text-red-500 transition-colors"><X size={18} /></button>
                <div className="flex items-center gap-2 text-amber-500">
                  <Clock size={16}/><span className="font-mono font-black text-xl">{formatTime(timeInSeconds)}</span>
                </div>
                {streak >= 3 && (
                   <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/50">
                    <Flame size={14} className="text-orange-500 fill-orange-500" />
                    <span className="text-orange-500 font-black text-xs">{streak}</span>
                  </div>
                )}
                <span className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap opacity-60">Q. {currentQIndex + 1}/{questions.length}</span>
              </div>
              
              <motion.div animate={shouldShake ? { x: [-5, 5, -5, 5, 0] } : {}} className={`p-6 md:p-14 rounded-[2.5rem] md:rounded-[4rem] bg-white/[0.04] border border-white/10 backdrop-blur-3xl transition-all duration-500 flex flex-col min-h-fit`}>
                <h2 className="text-xl md:text-4xl font-black italic mb-6 md:mb-12 leading-tight tracking-tight text-white/90">
                  {questions[currentQIndex]?.question_text}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 mb-6 md:mb-12">
                  {questions[currentQIndex]?.options.map((opt: string, idx: number) => {
                    const isSelected = selectedOptions.includes(idx);
                    const isCorrect = questions[currentQIndex].correct_indices.includes(idx);
                    let style = isSelected ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/[0.02]";
                    if (isAnswerChecked) {
                        if (isCorrect) style = "border-emerald-500 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]";
                        else if (isSelected) style = "border-red-500 bg-red-500/20 text-red-400";
                    }
                    return (
                      <button key={idx} onClick={() => !isAnswerChecked && setSelectedOptions(p => p.includes(idx) ? p.filter(i => i !== idx) : [...p, idx])} className={`group w-full text-left p-4 md:p-7 rounded-2xl md:rounded-3xl border-2 flex items-center gap-4 md:gap-6 transition-all duration-300 transform active:scale-[0.99] ${style}`}>
                        <div className={`flex-shrink-0 w-8 h-8 md:w-14 md:h-14 rounded-xl border flex items-center justify-center font-black text-xs md:text-xl transition-all ${isSelected ? 'bg-white text-black border-white' : 'border-white/10 opacity-30 text-white'}`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="font-bold text-sm md:text-xl leading-snug group-hover:translate-x-1 transition-transform">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex justify-end shrink-0">
                  {!isAnswerChecked ?
                    <button disabled={selectedOptions.length === 0} onClick={checkAnswer} className="w-full md:w-auto px-12 md:px-20 py-4 md:py-6 bg-white text-black rounded-2xl md:rounded-3xl font-black uppercase text-xs md:text-sm tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all shadow-2xl disabled:opacity-20 active:scale-95">Commit Choice</button> :
                    <button onClick={() => currentQIndex < questions.length - 1 ? (setCurrentQIndex(currentQIndex + 1), setSelectedOptions([]), setIsAnswerChecked(false)) : handleFinishQuiz()} className="w-full md:w-auto px-12 md:px-20 py-4 md:py-6 bg-blue-600 text-white rounded-2xl md:rounded-3xl font-black uppercase text-xs md:text-sm tracking-[0.2em] flex items-center justify-center gap-4 shadow-[0_10px_40px_rgba(37,99,235,0.4)] active:scale-95 transition-all">Next Protocol <ChevronRight size={20}/></button>
                  }
                </div>
              </motion.div>
            </motion.div>
          )}

          {view === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto py-6 md:py-10 flex-1">
              <div className="text-center mb-8 md:mb-12">
                <h1 className="text-5xl md:text-9xl font-black italic uppercase text-white mb-4 tracking-tighter leading-none">Session Over</h1>
                <div className="flex justify-center gap-2 md:gap-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 font-black uppercase text-[8px] md:text-sm"><Zap size={14}/> +{xpEarned} XP</div>
                  {maxStreak >= 3 && (<div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-500 font-black uppercase text-[8px] md:text-sm"><Flame size={14}/> {maxStreak} Streak</div>)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-8 mb-8">
                 <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/[0.03] border border-white/10 text-center backdrop-blur-xl">
                    <div className="text-3xl md:text-7xl font-black italic mb-1 tracking-tighter">{questions.length > 0 ? Math.round((score/questions.length)*100) : 0}%</div>
                    <div className="text-[8px] md:text-[10px] uppercase font-black opacity-30 tracking-widest">Accuracy</div>
                 </div>
                 <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/[0.03] border border-white/10 text-center backdrop-blur-xl">
                    <div className="text-3xl md:text-7xl font-black italic mb-1 tracking-tighter">{formatTime(timeInSeconds)}</div>
                    <div className="text-[8px] md:text-[10px] uppercase font-black opacity-30 tracking-widest">Time</div>
                 </div>
              </div>

              <div className="space-y-4 mb-10">
                <h3 className="text-xl font-black italic uppercase text-white/40 tracking-tighter flex items-center gap-2 px-2"><ShieldCheck size={20}/> Evidence Review</h3>
                <div className="grid gap-4">
                  {sessionHistory.map((item, i) => (
                    <div key={i} className={`p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border flex flex-col gap-4 ${item.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <div className="flex items-start gap-3">
                          {item.isCorrect ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-1"/> : <X size={20} className="text-red-500 shrink-0 mt-1"/>}
                          <p className="font-bold text-base md:text-xl leading-tight">{item.question}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.options.map((opt: string, idx: number) => (
                            <span key={idx} className={`text-[9px] md:text-[11px] font-black uppercase px-3 py-1.5 rounded-lg border ${item.correct.includes(idx) ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : item.selected.includes(idx) ? 'border-red-500 text-red-400 bg-red-500/10' : 'border-white/5 opacity-20'}`}>{opt}</span>
                          ))}
                        </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center pb-12">
                <button onClick={returnToModuleSelection} className="w-full md:w-auto px-10 md:px-20 py-5 md:py-8 bg-white text-black rounded-[2rem] font-black uppercase text-xs md:text-sm tracking-[0.5em] shadow-2xl hover:scale-105 active:scale-95 transition-all">Return to Domain</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}