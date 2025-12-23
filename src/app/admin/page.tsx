"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Trash2, Edit3, X, FileText, 
  LayoutGrid, Loader2, Check, ArrowLeft, ShieldCheck, 
  ShieldAlert, Link2, BarChart3, Users, GraduationCap, Hash,
  HelpCircle, ListChecks, Settings, Info, Search, Save,
  RefreshCcw, Database, CloudUpload, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- SYSTEM TYPES ---
type AdminView = 'modules' | 'subjects' | 'insights' | 'archives' | 'questions';

export default function AdminPage() {
  const router = useRouter();
  const [view, setView] = useState<AdminView>('modules');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Database States
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  
  // Edit & Modal States
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editType, setEditType] = useState<'subject' | 'chapter' | 'exam' | 'question'>('chapter');

  // Creation Input States
  const [newSub, setNewSub] = useState({ slug: '', title: '', icon: '', parent_slug: '' });
  const [newChap, setNewChap] = useState({ subject_key: '', title: '', file_url: '' });
  const [newExam, setNewExam] = useState({ 
    module_code: '', 
    year: new Date().getFullYear(), 
    session_type: 'First', 
    file_url: '', 
    has_solution: false 
  });
  const [newQuestion, setNewQuestion] = useState({
    subject_id: '',
    chapter_id: '',
    question_text: '',
    options: ['', '', '', ''],
    correct_indices: [] as number[],
    type: 'single' as 'single' | 'multiple',
    explanation: ''
  });

  // --- CORE SYSTEM FUNCTIONS ---

  const fetchData = useCallback(async () => {
    try {
      const [subRes, chapRes, examRes, progRes, quesRes] = await Promise.all([
        supabase.from('subjects').select('*').order('title'),
        supabase.from('chapters').select('*').order('created_at', { ascending: false }),
        supabase.from('past_exams').select('*').order('year', { ascending: false }),
        supabase.from('user_progress').select('chapter_id'),
        supabase.from('questions').select('*, subjects(title), chapters(title)').order('created_at', { ascending: false })
      ]);

      if (subRes.data) setSubjects(subRes.data);
      if (examRes.data) setExams(examRes.data);
      if (quesRes.data) setQuestions(quesRes.data);
      if (chapRes.data) {
        setChapters(chapRes.data);
        const stats = chapRes.data.map(chap => ({
          id: chap.id,
          title: chap.title,
          subject: chap.subject_key,
          count: progRes.data?.filter(p => p.chapter_id === chap.id).length || 0
        }));
        setInsights(stats);
      }
    } catch (e) {
      console.error("Critical System Fetch Error:", e);
    }
  }, []);

  useEffect(() => {
    async function checkUser() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.role === 'admin') {
        setIsAdmin(true);
        await fetchData();
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    }
    checkUser();
  }, [fetchData]);

  // --- CRUD ACTION HANDLERS ---

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('subjects').insert([{
      ...newSub,
      parent_slug: newSub.parent_slug === "" ? null : newSub.parent_slug
    }]);
    if (error) alert(error.message);
    else { setNewSub({ slug: '', title: '', icon: '', parent_slug: '' }); fetchData(); }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('chapters').insert([newChap]);
    if (error) alert(error.message);
    else { setNewChap({ ...newChap, title: '', file_url: '' }); fetchData(); }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('past_exams').insert([newExam]);
    if (error) alert(error.message);
    else { 
        setNewExam({ ...newExam, module_code: '', file_url: '', has_solution: false });
        fetchData(); 
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newQuestion.correct_indices.length === 0) return alert("Please select a correct answer.");
    if (!newQuestion.chapter_id) return alert("Please select a chapter first.");
    
    const { error } = await supabase.from('questions').insert([newQuestion]);
    if (error) alert("Error adding question: " + error.message);
    else {
      setNewQuestion({ ...newQuestion, question_text: '', options: ['', '', '', ''], correct_indices: [], explanation: '' });
      fetchData();
    }
  };

  const toggleCorrectIndex = (idx: number) => {
    setNewQuestion(prev => {
      if (prev.type === 'single') return { ...prev, correct_indices: [idx] };
      const exists = prev.correct_indices.includes(idx);
      return {
        ...prev,
        correct_indices: exists ? prev.correct_indices.filter(i => i !== idx) : [...prev.correct_indices, idx]
      };
    });
  };

  const handleDelete = async (table: string, id: string) => {
    if (confirm("Delete this item permanently?")) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) alert("Error deleting: " + error.message);
      else fetchData();
    }
  };

  const handleSaveEdit = async () => {
    const tableMap: any = { subject: 'subjects', chapter: 'chapters', exam: 'past_exams', question: 'questions' };
    
    // Safety: Strip out objects that are joined from other tables before updating
    // Supabase will error if you try to update a column that doesn't exist (like 'subjects' or 'chapters' objects)
    const { id, created_at, subjects, chapters, ...updateData } = editingItem;
    
    const { error } = await supabase.from(tableMap[editType]).update(updateData).eq('id', id);
    if (error) alert(error.message);
    else { setEditingItem(null); fetchData(); }
  };

  // --- RENDER STATES ---

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-[#3A6EA5]" size={50} />
        <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Initialising Secure Session...</p>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white p-6 text-center">
      <div className="relative mb-8">
        <ShieldAlert size={100} className="text-red-500/20 animate-pulse" />
        <ShieldAlert size={80} className="text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4">Access Denied</h1>
      <p className="text-white/40 max-w-sm mb-12 text-sm">Your account does not have the required clearance level to access the administrative mainframe.</p>
      <button onClick={() => router.push('/')} className="px-12 py-5 bg-white/5 border border-white/10 rounded-3xl font-black hover:bg-white/10 transition-all uppercase tracking-widest text-xs">Return to Hub</button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen pb-40 bg-[#050505]">
      {/* HUD HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-20">
        <div className="flex flex-col gap-2">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 opacity-40 hover:opacity-100 font-bold transition-all text-white text-xs mb-2 uppercase tracking-widest">
            <ArrowLeft size={14} /> Exit System
          </button>
          <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-500 px-6 py-2.5 rounded-full border border-emerald-500/20 text-[11px] font-black uppercase tracking-tighter">
            <ShieldCheck size={16} /> Admin Clearance Level 4
          </div>
        </div>

        <div className="flex bg-white/5 p-2 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl overflow-x-auto max-w-full shadow-2xl">
          {['modules', 'archives', 'subjects', 'questions', 'insights'].map((t) => (
            <button 
              key={t}
              onClick={() => setView(t as any)} 
              className={`px-8 py-3.5 rounded-[1.8rem] text-[10px] font-black uppercase transition-all whitespace-nowrap ${view === t ?
              'bg-[#3A6EA5] text-white shadow-xl shadow-blue-500/20 scale-105' : 'opacity-30 text-white hover:opacity-60'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* CONTROL PANEL - FORMS */}
        {view !== 'insights' && (
          <div className="lg:col-span-1">
            <div className="glass-card p-10 rounded-[3.5rem] sticky top-24 border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
              <AnimatePresence mode="wait">
                {view === 'questions' ? (
                  <motion.form key="q" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} onSubmit={handleAddQuestion} className="space-y-5">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-4 italic uppercase tracking-tighter"><HelpCircle className="text-orange-500"/> Deploy QCM</h2>
                    <select required value={newQuestion.chapter_id} onChange={e => {
                       const ch = chapters.find(c => c.id === e.target.value);
                       const sub = subjects.find(s => s.slug === ch?.subject_key);
                       setNewQuestion({...newQuestion, chapter_id: e.target.value, subject_id: sub?.id || ''});
                    }} className="w-full p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 text-white text-xs outline-none focus:border-orange-500/50 transition-all">
                       <option value="">Target Chapter</option>
                       {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
                    </select>
                    <textarea required placeholder="Question Content" value={newQuestion.question_text} onChange={e => setNewQuestion({...newQuestion, question_text: e.target.value})} className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm min-h-[120px] outline-none focus:bg-white/10 transition-all" />
                    
                    <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                        <button type="button" onClick={() => setNewQuestion({...newQuestion, type: 'single', correct_indices: []})} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${newQuestion.type === 'single' ? 'bg-blue-600 text-white' : 'text-white/20'}`}>SINGLE CHOICE</button>
                        <button type="button" onClick={() => setNewQuestion({...newQuestion, type: 'multiple', correct_indices: []})} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${newQuestion.type === 'multiple' ? 'bg-purple-600 text-white' : 'text-white/20'}`}>MULTIPLE CHOICE</button>
                    </div>

                    <div className="space-y-3">
                      {newQuestion.options.map((opt, i) => (
                         <div key={i} className="flex gap-3">
                           <button type="button" onClick={() => toggleCorrectIndex(i)} className={`w-12 rounded-2xl border flex items-center justify-center transition-all ${newQuestion.correct_indices.includes(i) ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/20' : 'bg-white/5 border-white/10 text-white/20'}`}><Check size={18} /></button>
                           <input required placeholder={`Option ${i+1}`} value={opt} onChange={e => {
                             const opts = [...newQuestion.options];
                             opts[i] = e.target.value;
                             setNewQuestion({...newQuestion, options: opts});
                           }} className="flex-grow p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:bg-white/10 transition-all" />
                         </div>
                      ))}
                    </div>
                    <button className="w-full bg-orange-600 hover:bg-orange-500 text-white p-5 rounded-[2rem] font-black transition-all shadow-xl shadow-orange-900/20 uppercase tracking-widest text-[11px] mt-4 flex items-center justify-center gap-2"><CloudUpload size={16}/> Save QCM Question</button>
                  </motion.form>
                ) : view === 'subjects' ? (
                  <motion.form key="s" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} onSubmit={handleAddSubject} className="space-y-5">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-4 italic uppercase tracking-tighter"><LayoutGrid className="text-[#3A6EA5]"/> System Module</h2>
                    <input required placeholder="slug (e.g. inf1101)" value={newSub.slug} onChange={e => setNewSub({...newSub, slug: e.target.value.toLowerCase()})} className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                    <input required placeholder="Full Identity Title" value={newSub.title} onChange={e => setNewSub({...newSub, title: e.target.value})} className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                    <div className="flex flex-col gap-2">
                       <label className="text-[9px] font-black text-white/20 uppercase ml-4">Graphical Icon</label>
                       <input required placeholder="Emoji" value={newSub.icon} onChange={e => setNewSub({...newSub, icon: e.target.value})} className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-center text-3xl outline-none" />
                    </div>
                    <select value={newSub.parent_slug} onChange={e => setNewSub({...newSub, parent_slug: e.target.value})} className="w-full p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 text-white text-sm outline-none">
                       <option value="">Master Category (Root)</option>
                       {subjects.filter(s => !s.parent_slug).map(s => <option key={s.id} value={s.slug}>{s.title}</option>)}
                    </select>
                    <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-5 rounded-[2rem] font-black transition-all shadow-xl shadow-emerald-900/20 uppercase tracking-widest text-[11px] mt-4">Initialize Module</button>
                  </motion.form>
                ) : view === 'archives' ? (
                  <motion.form key="a" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} onSubmit={handleAddExam} className="space-y-5">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-4 italic uppercase tracking-tighter"><GraduationCap className="text-purple-500"/> Archive Entry</h2>
                    <input required placeholder="Code (e.g. B1100)" value={newExam.module_code} onChange={e => setNewExam({...newExam, module_code: e.target.value.toUpperCase()})} className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-white/20 uppercase ml-2">Academic Year</label>
                        <input type="number" value={newExam.year} onChange={e => setNewExam({...newExam, year: parseInt(e.target.value)})} className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-white/20 uppercase ml-2">Session</label>
                        <select value={newExam.session_type} onChange={e => setNewExam({...newExam, session_type: e.target.value})} className="w-full p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 text-white text-sm outline-none">
                           <option value="First">First</option>
                           <option value="Second">Second</option>
                           <option value="Concours">Concours</option>
                        </select>
                      </div>
                    </div>
                    <input required placeholder="Direct Cloud Link" value={newExam.file_url} onChange={e => setNewExam({...newExam, file_url: e.target.value})} className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-mono outline-none" />
                    
                    {/* FIXED: Added has_solution checkbox */}
                    <label className="flex items-center gap-3 p-2 cursor-pointer group">
                      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${newExam.has_solution ? 'bg-purple-600 border-purple-500' : 'bg-white/5 border-white/10'}`}>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={newExam.has_solution} 
                          onChange={e => setNewExam({...newExam, has_solution: e.target.checked})} 
                        />
                        {newExam.has_solution && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-[10px] font-black uppercase text-white/40 group-hover:text-white transition-all">Include Solutions?</span>
                    </label>

                    <button className="w-full bg-purple-600 hover:bg-purple-500 text-white p-5 rounded-[2rem] font-black transition-all shadow-xl shadow-purple-900/20 uppercase tracking-widest text-[11px] mt-4 flex items-center justify-center gap-2"><Database size={16}/> Push to Archives</button>
                  </motion.form>
                ) : (
                  <motion.form key="m" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} onSubmit={handleAddChapter} className="space-y-5">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-4 italic uppercase tracking-tighter"><Link2 className="text-[#3A6EA5]"/> Deploy Resource</h2>
                    <select required value={newChap.subject_key} onChange={e => setNewChap({...newChap, subject_key: e.target.value})} className="w-full p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 text-white text-xs outline-none">
                       <option value="">Select Target Module</option>
                       {subjects.filter(s => s.parent_slug).map(s => <option key={s.id} value={s.slug}>{s.title}</option>)}
                    </select>
                    <input required placeholder="Resource Designation" value={newChap.title} onChange={e => setNewChap({...newChap, title: e.target.value})} className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                    <input required placeholder="Resource URL (PDF/Drive)" value={newChap.file_url} onChange={e => setNewChap({...newChap, file_url: e.target.value})} className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-mono outline-none" />
                    <button className="w-full bg-[#3A6EA5] hover:bg-blue-500 text-white p-5 rounded-[2rem] font-black transition-all shadow-xl shadow-blue-900/20 uppercase tracking-widest text-[11px] mt-4 flex items-center justify-center gap-2"><Zap size={16}/> Connect Document</button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* DATA INFRASTRUCTURE DISPLAY */}
        <div className={view === 'insights' ? "lg:col-span-3" : "lg:col-span-2"}>
          <AnimatePresence mode="wait">
            {view === 'questions' ? (
               <motion.div key="q-list" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                 <div className="flex items-center justify-between mb-4 px-6">
                    <h3 className="text-white/20 font-black text-[10px] uppercase tracking-[0.4em]">Question Databank</h3>
                    <div className="flex gap-2"><div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"/> <span className="text-orange-500 text-[9px] font-black uppercase tracking-widest">Live Sync</span></div>
                 </div>
                 {questions.map(q => (
                   <div key={q.id} className="glass-card p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] transition-all group">
                      <div className="flex justify-between items-start gap-6">
                        <div className="flex flex-col gap-2">
                          <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest px-3 py-1 bg-orange-500/10 rounded-lg w-fit border border-orange-500/20">{q.chapters?.title || 'System Root'}</span>
                          <h4 className="text-white font-bold text-base leading-relaxed">{q.question_text}</h4>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => {setEditingItem(q); setEditType('question')}} className="p-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500 rounded-2xl hover:text-white transition-all"><Edit3 size={18}/></button>
                          <button onClick={() => handleDelete('questions', q.id)} className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500 rounded-2xl hover:text-white transition-all"><Trash2 size={18}/></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                        {q.options.map((opt: string, i: number) => (
                          <div key={i} className={`p-4 rounded-2xl text-[11px] font-bold border transition-all ${q.correct_indices.includes(i) ?
                          'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-white/5 text-white/30 border-white/5'}`}>
                            {opt}
                          </div>
                        ))}
                      </div>
                   </div>
                 ))}
               </motion.div>
            ) : view === 'archives' ? (
              <motion.div key="a-list" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="grid grid-cols-1 gap-4">
                 {exams.map(e => (
                   <div key={e.id} className="glass-card p-6 rounded-[2.2rem] flex items-center justify-between border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] transition-all group">
                      <div className="flex items-center gap-6">
                        <div className="bg-purple-500/10 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-purple-500 font-black text-sm group-hover:scale-110 transition-transform italic tracking-tighter shadow-lg shadow-purple-500/5">{e.year.toString().slice(-2)}'</div>
                        <div>
                          <p className="font-black text-lg text-white uppercase tracking-tight">{e.module_code} — {e.session_type}</p>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{e.year}</span>
                             <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${e.has_solution ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                               {e.has_solution ? 'Solved' : 'Unsolved'}
                             </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => {setEditingItem(e); setEditType('exam')}} className="p-4 bg-white/5 text-blue-400 hover:bg-[#3A6EA5] hover:text-white rounded-2xl transition-all"><Edit3 size={20}/></button>
                        <button onClick={() => handleDelete('past_exams', e.id)} className="p-4 bg-white/5 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all"><Trash2 size={20}/></button>
                      </div>
                   </div>
                 ))}
              </motion.div>
            ) : view === 'insights' ? (
               <motion.div key="i-list" initial={{opacity:0}} animate={{opacity:1}} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {insights.map(item => (
                   <div key={item.id} className="glass-card p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between bg-white/[0.02] hover:bg-white/[0.05] transition-all border-l-4 border-l-[#3A6EA5]">
                     <div>
                       <p className="text-[10px] font-black text-[#3A6EA5] uppercase mb-2 tracking-[0.2em]">{item.subject}</p>
                       <p className="font-bold text-white text-lg leading-tight mb-8">{item.title}</p>
                     </div>
                     <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <span className="text-white/20 text-[9px] font-black uppercase">Engagement</span>
                        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20 text-emerald-500 font-black text-sm">
                          <Users size={16} /> {item.count}
                        </div>
                     </div>
                   </div>
                 ))}
               </motion.div>
            ) : view === 'subjects' ? (
              <motion.div key="s-list" initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
                {subjects.map(s => (
                  <div key={s.id} className="glass-card p-6 rounded-[2.2rem] flex items-center justify-between border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all group">
                    <div className="flex items-center gap-6">
                      <span className="text-4xl group-hover:scale-125 transition-transform duration-500">{s.icon}</span>
                      <div>
                        <p className="font-black text-xl text-white uppercase tracking-tighter">{s.title}</p>
                        <p className="text-[10px] font-black uppercase opacity-20 text-white tracking-widest">{s.parent_slug ? `Sub-Module: ${s.parent_slug}` : 'System Root Module'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {setEditingItem(s); setEditType('subject')}} className="p-4 bg-white/5 text-blue-400 hover:bg-blue-500/20 rounded-2xl transition-all"><Edit3 size={20}/></button>
                      <button onClick={() => handleDelete('subjects', s.id)} className="p-4 bg-white/5 text-red-400 hover:bg-red-500/20 rounded-2xl transition-all"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="m-list" initial={{opacity:0}} animate={{opacity:1}} className="space-y-16">
                {subjects.filter(s => s.parent_slug).map(s => {
                  const subChapters = chapters.filter(c => c.subject_key === s.slug);
                  return (
                    <div key={s.id} className="space-y-6">
                      <div className="flex items-center gap-4 ml-6">
                        <span className="text-2xl">{s.icon}</span>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#3A6EA5]">{s.title}</h3>
                        <div className="h-[1px] flex-grow bg-gradient-to-r from-white/10 to-transparent"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {subChapters.map(c => (
                          <div key={c.id} className="glass-card p-6 rounded-[2rem] flex items-center justify-between border border-white/5 bg-white/[0.01] hover:bg-white/[0.06] transition-all group">
                            <div className="flex items-center gap-4 overflow-hidden">
                              <div className="p-3 bg-[#3A6EA5]/10 rounded-xl text-[#3A6EA5] group-hover:bg-[#3A6EA5] group-hover:text-white transition-all"><Link2 size={18} /></div>
                              <p className="font-bold text-sm text-white opacity-80 truncate">{c.title}</p>
                            </div>
                            <div className="flex gap-1">
                               <button onClick={() => {setEditingItem(c); setEditType('chapter')}} className="p-3 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"><Edit3 size={18}/></button>
                               <button onClick={() => handleDelete('chapters', c.id)} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* --- MASTER EDIT MODAL --- */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setEditingItem(null)} className="absolute inset-0 bg-black/90 backdrop-blur-3xl" />
            <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} exit={{scale:0.9, y:20}} className="relative glass-card p-12 rounded-[3.5rem] w-full max-w-2xl border border-white/20 bg-[#0a0a0a] shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#3A6EA5] to-transparent opacity-50" />
              <button onClick={() => setEditingItem(null)} className="absolute top-10 right-10 text-white/20 hover:text-white transition-all hover:rotate-90"><X size={32}/></button>
              
              <h2 className="text-4xl font-black mb-12 text-white uppercase italic tracking-tighter">Update <span className="text-[#3A6EA5]">{editType}</span></h2>
              
              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                {editType === 'question' ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Stem Content</label>
                       <textarea value={editingItem.question_text} onChange={e => setEditingItem({...editingItem, question_text: e.target.value})} className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 text-white outline-none focus:border-[#3A6EA5] transition-all min-h-[150px]" />
                    </div>
                    
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Options Infrastructure</label>
                       {editingItem.options.map((opt: any, i: number) => (
                        <div key={i} className="flex gap-3">
                          <button onClick={() => {
                            const indices = editingItem.correct_indices.includes(i) 
                              ? editingItem.correct_indices.filter((idx: any) => idx !== i)
                              : [...editingItem.correct_indices, i];
                            setEditingItem({...editingItem, correct_indices: indices});
                          }} className={`w-14 rounded-2xl border transition-all flex items-center justify-center ${editingItem.correct_indices.includes(i) ? 'bg-green-500 border-green-500' : 'bg-white/5 border-white/10 text-white/20'}`}>
                            <Check size={18} />
                          </button>
                          <input value={opt} onChange={e => {
                            const opts = [...editingItem.options];
                            opts[i] = e.target.value;
                            setEditingItem({...editingItem, options: opts});
                          }} className="flex-grow p-4 rounded-2xl bg-white/5 border border-white/10 text-white outline-none" />
                        </div>
                       ))}
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Rational Explanation</label>
                       <textarea value={editingItem.explanation} onChange={e => setEditingItem({...editingItem, explanation: e.target.value})} className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 text-white outline-none text-sm min-h-[100px]" />
                    </div>
                  </div>
                ) : editType === 'exam' ? (
                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-white/30 uppercase ml-2">Module Code</label>
                           <input value={editingItem.module_code} onChange={e => setEditingItem({...editingItem, module_code: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white outline-none" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-white/30 uppercase ml-2">Academic Year</label>
                           <input type="number" value={editingItem.year} onChange={e => setEditingItem({...editingItem, year: parseInt(e.target.value)})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white outline-none" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase ml-2">Cloud Asset URL</label>
                        <input value={editingItem.file_url} onChange={e => setEditingItem({...editingItem, file_url: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-mono outline-none" />
                     </div>
                     
                     {/* FIXED: Edit modal solution checkbox */}
                     <label className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 cursor-pointer group hover:bg-white/10 transition-all">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${editingItem.has_solution ? 'bg-blue-600 border-blue-500' : 'bg-black border-white/10'}`}>
                           <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={editingItem.has_solution} 
                              onChange={e => setEditingItem({...editingItem, has_solution: e.target.checked})} 
                           />
                           {editingItem.has_solution && <Check size={18} className="text-white" />}
                        </div>
                        <span className="font-black uppercase text-[11px] tracking-widest text-white/60 group-hover:text-white">Includes Detailed Solutions</span>
                     </label>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <label className="text-[10px] font-black text-white/40 uppercase ml-2">Main Identifier</label>
                    <input value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white outline-none" />
                    
                    {(editingItem.file_url !== undefined) && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase ml-2">Cloud Storage URL</label>
                        <input value={editingItem.file_url} onChange={e => setEditingItem({...editingItem, file_url: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-mono outline-none" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-8">
                <button onClick={handleSaveEdit} className="flex-grow bg-[#3A6EA5] text-white p-5 rounded-[2rem] font-black transition-all hover:bg-[#4A7EB5] active:scale-95 shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"><Save size={18}/> Push System Update</button>
                <button onClick={() => setEditingItem(null)} className="px-10 bg-white/5 rounded-[2rem] text-white font-black hover:bg-white/10 transition-all uppercase text-[10px]">Abort</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER SYSTEM STATUS */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-10 py-5 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] z-50">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
            <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">Database: Online</span>
         </div>
         <div className="w-[1px] h-4 bg-white/10" />
         <div className="text-white/60 text-[9px] font-black uppercase tracking-[0.3em]">Admin Kernel v4.2</div>
      </div>
    </div>
  );
}