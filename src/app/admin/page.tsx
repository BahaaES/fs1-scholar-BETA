"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Trash2, Edit3, X, FileText, Loader2, Check, ArrowLeft, 
  ShieldCheck, ShieldAlert, Link2, Users, HelpCircle, 
  Search, Save, ChevronDown, ChevronRight, CloudUpload, 
  BookOpen, Layers, Activity, FileUp, Binary, GraduationCap,
  FileBadge, Archive
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AdminView = 'library' | 'subjects' | 'questions' | 'insights';

export default function AdminPage() {
  const router = useRouter();
  
  // Navigation & Data State
  const [view, setView] = useState<AdminView>('subjects');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]); // This is the Library items
  const [questions, setQuestions] = useState<any[]>([]);
  
  // UI States
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editType, setEditType] = useState<'subject' | 'chapter' | 'exam' | 'question'>('chapter');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Form States
  const [newSub, setNewSub] = useState({ slug: '', title: '', icon: '', parent_slug: '' });
  const [newChap, setNewChap] = useState({ subject_key: '', title: '', file_url: '' });
  
  const [newLibraryItem, setNewLibraryItem] = useState({ 
    module_code: '', 
    year: new Date().getFullYear(), 
    session_type: 'Course Material', // Acts as Category (Exams, Student Files, etc)
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

  // Fetch Logic
  const fetchData = useCallback(async () => {
    try {
      const [subRes, chapRes, examRes, quesRes] = await Promise.all([
        supabase.from('subjects').select('*').order('title'),
        supabase.from('chapters').select('*').order('created_at', { ascending: false }),
        supabase.from('past_exams').select('*').order('year', { ascending: false }),
        supabase.from('questions').select('*, subjects(title), chapters(title)').order('created_at', { ascending: false })
      ]);

      if (subRes.data) setSubjects(subRes.data);
      if (chapRes.data) setChapters(chapRes.data);
      if (examRes.data) setExams(examRes.data);
      if (quesRes.data) setQuestions(quesRes.data);
    } catch (e) {
      console.error("Critical Fetch Error:", e);
    }
  }, []);

  // Auth Protection
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.role === 'admin') {
        setIsAdmin(true);
        await fetchData();
      }
      setLoading(false);
    }
    checkUser();
  }, [fetchData]);

  // Actions
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDelete = async (table: string, id: string) => {
    if (confirm("Delete this entry permanently?")) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) alert(error.message);
      else fetchData();
    }
  };

  const handleSaveEdit = async () => {
    const tableMap: any = { subject: 'subjects', chapter: 'chapters', exam: 'past_exams', question: 'questions' };
    const { id, created_at, subjects, chapters, ...updateData } = editingItem;
    const { error } = await supabase.from(tableMap[editType]).update(updateData).eq('id', id);
    if (!error) { setEditingItem(null); fetchData(); }
    else alert(error.message);
  };

  const toggleCorrectIndex = (idx: number) => {
    setNewQuestion(prev => {
      if (prev.type === 'single') return { ...prev, correct_indices: [idx] };
      const exists = prev.correct_indices.includes(idx);
      return { ...prev, correct_indices: exists ? prev.correct_indices.filter(i => i !== idx) : [...prev.correct_indices, idx] };
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-purple-500" size={50} />
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white p-6">
      <ShieldAlert size={80} className="text-red-500 mb-6" />
      <h1 className="text-4xl font-black uppercase italic mb-4">Access Denied</h1>
      <button onClick={() => router.push('/')} className="px-10 py-4 bg-white/5 border border-white/10 rounded-full font-bold uppercase text-xs">Return to Hub</button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#050505] text-slate-200">
      
      {/* SIDEBAR - MANAGEMENT TOOLS */}
      <aside className="w-[420px] bg-[#0a0a0a] border-r border-white/5 p-8 sticky top-0 h-screen overflow-y-auto scrollbar-hide shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <h1 className="font-black uppercase tracking-tighter text-xl">System Kernel</h1>
        </div>

        <div className="space-y-8 pb-20">
          
          {/* 1. LIBRARY UPLOADER */}
          <section className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
            <h2 className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em] mb-6 flex items-center gap-2">
              <FileUp size={14} /> Library Deposit
            </h2>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              await supabase.from('past_exams').insert([newLibraryItem]);
              setNewLibraryItem({ ...newLibraryItem, module_code: '', file_url: '' });
              fetchData();
            }}>
              <select className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold" 
                value={newLibraryItem.session_type} onChange={e => setNewLibraryItem({...newLibraryItem, session_type: e.target.value})}>
                <option value="Past Exam">Past Exam</option>
                <option value="Student File">Student File</option>
                <option value="Course Material">Course Material</option>
                <option value="Summary">Summary / Notes</option>
              </select>
              <input placeholder="Item Label (e.g. Bio 101 Notes)" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs" 
                value={newLibraryItem.module_code} onChange={e => setNewLibraryItem({...newLibraryItem, module_code: e.target.value})} required />
              <input placeholder="File URL (Drive/PDF)" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-mono" 
                value={newLibraryItem.file_url} onChange={e => setNewLibraryItem({...newLibraryItem, file_url: e.target.value})} required />
              <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Upload to Library</button>
            </form>
          </section>

          {/* 2. QCM ENGINE */}
          <section className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
            <h2 className="text-[10px] font-black uppercase text-orange-400 tracking-[0.3em] mb-6 flex items-center gap-2">
              <Binary size={14} /> QCM Deployment
            </h2>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              if (newQuestion.correct_indices.length === 0) return alert("Select correct answer(s)");
              await supabase.from('questions').insert([newQuestion]);
              setNewQuestion({...newQuestion, question_text: '', options: ['', '', '', ''], correct_indices: []});
              fetchData();
            }}>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 mb-2">
                <button type="button" onClick={() => setNewQuestion({...newQuestion, type: 'single', correct_indices: []})} 
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${newQuestion.type === 'single' ? 'bg-orange-500 text-white' : 'text-white/20'}`}>Single</button>
                <button type="button" onClick={() => setNewQuestion({...newQuestion, type: 'multiple', correct_indices: []})} 
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${newQuestion.type === 'multiple' ? 'bg-orange-500 text-white' : 'text-white/20'}`}>Multiple</button>
              </div>
              
              <select required className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold" 
                onChange={e => {
                  const ch = chapters.find(c => c.id === e.target.value);
                  const sub = subjects.find(s => s.slug === ch?.subject_key);
                  setNewQuestion({...newQuestion, chapter_id: e.target.value, subject_id: sub?.id || ''});
                }}>
                <option value="">Select Target Chapter</option>
                {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
              </select>

              <textarea placeholder="Question Text" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs min-h-[80px]" 
                value={newQuestion.question_text} onChange={e => setNewQuestion({...newQuestion, question_text: e.target.value})} required />

              <div className="space-y-2">
                {newQuestion.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <button type="button" onClick={() => toggleCorrectIndex(i)} 
                      className={`w-10 rounded-xl border transition-all ${newQuestion.correct_indices.includes(i) ? 'bg-green-500 border-green-400 text-white' : 'bg-white/5 border-white/10 text-white/20'}`}>
                      <Check size={14} className="mx-auto" />
                    </button>
                    <input placeholder={`Option ${i+1}`} className="flex-1 p-3 bg-black/20 border border-white/5 rounded-xl text-[11px]" 
                      value={opt} onChange={e => {
                        const opts = [...newQuestion.options];
                        opts[i] = e.target.value;
                        setNewQuestion({...newQuestion, options: opts});
                      }} required />
                  </div>
                ))}
              </div>
              <button className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Sync Question</button>
            </form>
          </section>

          {/* 3. MODULE CREATOR */}
          <section className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
            <h2 className="text-[10px] font-black uppercase text-purple-400 tracking-[0.3em] mb-4 flex items-center gap-2">
              <Layers size={14} /> New Module
            </h2>
            <form className="space-y-3" onSubmit={async (e) => { 
                e.preventDefault(); 
                await supabase.from('subjects').insert([{...newSub, parent_slug: newSub.parent_slug || null}]); 
                setNewSub({ slug: '', title: '', icon: '', parent_slug: '' }); 
                fetchData(); 
            }}>
              <input placeholder="Slug (bio-101)" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs outline-none focus:border-purple-500/50" value={newSub.slug} onChange={e => setNewSub({...newSub, slug: e.target.value})} required />
              <input placeholder="Full Title" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs outline-none focus:border-purple-500/50" value={newSub.title} onChange={e => setNewSub({...newSub, title: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Icon" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-center text-xl" value={newSub.icon} onChange={e => setNewSub({...newSub, icon: e.target.value})} />
                <select className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold text-white/40" value={newSub.parent_slug} onChange={e => setNewSub({...newSub, parent_slug: e.target.value})}>
                  <option value="">Root</option>
                  {subjects.filter(s => !s.parent_slug).map(s => <option key={s.id} value={s.slug}>{s.title}</option>)}
                </select>
              </div>
              <button className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Create Module</button>
            </form>
          </section>

          {/* 4. CHAPTER CREATOR */}
          <section className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
            <h2 className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.3em] mb-4 flex items-center gap-2">
              <CloudUpload size={14} /> New Chapter
            </h2>
            <form className="space-y-3" onSubmit={async (e) => { 
                e.preventDefault(); 
                await supabase.from('chapters').insert([newChap]); 
                setNewChap({ subject_key: '', title: '', file_url: '' }); 
                fetchData(); 
            }}>
              <select required className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold" value={newChap.subject_key} onChange={e => setNewChap({...newChap, subject_key: e.target.value})}>
                <option value="">Parent Subject</option>
                {subjects.filter(s => s.parent_slug).map(s => <option key={s.id} value={s.slug}>{s.title}</option>)}
              </select>
              <input placeholder="Chapter Name" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs" value={newChap.title} onChange={e => setNewChap({...newChap, title: e.target.value})} required />
              <input placeholder="Drive Link / PDF URL" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[9px] font-mono" value={newChap.file_url} onChange={e => setNewChap({...newChap, file_url: e.target.value})} />
              <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Add Chapter</button>
            </form>
          </section>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-16 overflow-y-auto">
        
        <header className="flex justify-between items-center mb-16">
          <nav className="flex bg-white/5 p-1.5 rounded-3xl border border-white/10 backdrop-blur-3xl">
            {[
              {id: 'subjects', label: 'Curriculum', icon: Layers},
              {id: 'library', label: 'Library Hub', icon: BookOpen},
              {id: 'questions', label: 'Databank', icon: Binary},
              {id: 'insights', label: 'Analytics', icon: Activity}
            ].map((t) => (
              <button key={t.id} onClick={() => setView(t.id as any)} 
                className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all ${view === t.id ? 'bg-purple-600 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </nav>
          <button onClick={() => router.push('/')} className="text-white/20 hover:text-red-500 transition-all font-black text-[10px] uppercase flex items-center gap-2">
            <ArrowLeft size={16}/> Return to Site
          </button>
        </header>

        <AnimatePresence mode="wait">
          {/* VIEW: CURRICULUM (Modules -> Sub-subjects -> Chapters) */}
          {view === 'subjects' && (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="space-y-6">
              {subjects.filter(s => !s.parent_slug).map(root => (
                <div key={root.id} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden group">
                  <div className="p-8 flex items-center justify-between cursor-pointer hover:bg-white/[0.04]" onClick={() => toggleExpand(root.id)}>
                    <div className="flex items-center gap-6">
                      <span className="text-4xl">{root.icon}</span>
                      <div>
                        <h3 className="font-black text-xl text-white uppercase tracking-tighter">{root.title}</h3>
                        <p className="text-[9px] font-black uppercase text-white/20 tracking-[0.3em]">Root Domain</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <button onClick={(e) => {e.stopPropagation(); setEditingItem(root); setEditType('subject');}} className="p-3 bg-white/5 rounded-xl hover:bg-blue-500/20 text-blue-400 opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={18}/></button>
                       <button onClick={(e) => {e.stopPropagation(); handleDelete('subjects', root.id);}} className="p-3 bg-white/5 rounded-xl hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                       {expandedItems.includes(root.id) ? <ChevronDown className="text-purple-500" /> : <ChevronRight className="text-white/20" />}
                    </div>
                  </div>

                  {expandedItems.includes(root.id) && (
                    <div className="p-4 bg-black/40 border-t border-white/5 space-y-4">
                      {subjects.filter(sub => sub.parent_slug === root.slug).map(sub => (
                        <div key={sub.id} className="ml-8 rounded-3xl border border-white/5 bg-white/[0.01]">
                          <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(sub.id)}>
                            <div className="flex items-center gap-4">
                              <span className="text-2xl">{sub.icon}</span>
                              <span className="font-bold text-white/80 uppercase text-xs">{sub.title}</span>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={(e) => {e.stopPropagation(); setEditingItem(sub); setEditType('subject');}} className="p-2 text-blue-400 hover:bg-white/5 rounded-lg"><Edit3 size={14}/></button>
                               <button onClick={(e) => {e.stopPropagation(); handleDelete('subjects', sub.id);}} className="p-2 text-red-400 hover:bg-white/5 rounded-lg"><Trash2 size={14}/></button>
                               {expandedItems.includes(sub.id) ? <ChevronDown size={16} className="text-purple-400" /> : <ChevronRight size={16} className="text-white/10" />}
                            </div>
                          </div>

                          {expandedItems.includes(sub.id) && (
                            <div className="bg-black/20 p-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/5">
                              {chapters.filter(c => c.subject_key === sub.slug).map(chap => (
                                <div key={chap.id} className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 group/chap hover:border-purple-500/30 transition-all">
                                  <div className="flex items-center gap-3">
                                    <FileText size={14} className="text-purple-400" />
                                    <span className="text-xs font-bold text-white/60">{chap.title}</span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover/chap:opacity-100 transition-all">
                                    <button onClick={() => {setEditingItem(chap); setEditType('chapter');}} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Edit3 size={14}/></button>
                                    <button onClick={() => handleDelete('chapters', chap.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={14}/></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* VIEW: LIBRARY HUB (Exams, Files, Summaries) */}
          {view === 'library' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em]">Resource Library</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {exams.map(e => (
                  <div key={e.id} className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                        {e.session_type === 'Past Exam' ? <Archive size={24} /> : <FileBadge size={24} />}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white uppercase">{e.module_code}</h4>
                        <div className="flex gap-3 mt-1">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">{e.session_type}</span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-white/5 text-white/30 rounded border border-white/10">{e.year}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => {setEditingItem(e); setEditType('exam');}} className="p-4 bg-white/5 text-blue-400 rounded-2xl hover:bg-blue-600 hover:text-white"><Edit3 size={18}/></button>
                      <button onClick={() => handleDelete('past_exams', e.id)} className="p-4 bg-white/5 text-red-400 rounded-2xl hover:bg-red-600 hover:text-white"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* VIEW: DATABANK (QCMs) */}
          {view === 'questions' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">
              <div className="flex items-center bg-white/5 rounded-2xl px-6 border border-white/10 max-w-xl">
                <Search size={18} className="text-white/20" />
                <input placeholder="Search question text..." className="flex-1 p-5 bg-transparent outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              {questions.filter(q => q.question_text.toLowerCase().includes(searchTerm.toLowerCase())).map(q => (
                <div key={q.id} className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 group relative overflow-hidden">
                  <div className={`absolute top-0 right-0 px-6 py-2 text-[8px] font-black uppercase tracking-[0.2em] ${q.type === 'multiple' ? 'bg-orange-600 text-white' : 'bg-purple-600/20 text-purple-400'}`}>
                    {q.type} choice
                  </div>
                  <div className="flex justify-between gap-6 mb-6">
                    <div>
                       <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest px-3 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">{q.chapters?.title || 'General'}</span>
                       <h4 className="text-white font-bold text-lg mt-3 leading-relaxed">{q.question_text}</h4>
                    </div>
                    <div className="flex gap-2 h-fit">
                       <button onClick={() => {setEditingItem(q); setEditType('question');}} className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white"><Edit3 size={18}/></button>
                       <button onClick={() => handleDelete('questions', q.id)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white"><Trash2 size={18}/></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {q.options.map((opt: string, i: number) => (
                      <div key={i} className={`p-4 rounded-xl text-xs font-bold border ${q.correct_indices.includes(i) ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-white/5 text-white/20 border-white/5'}`}>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* GLOBAL EDIT MODAL */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-8 backdrop-blur-2xl bg-black/80">
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-12 shadow-2xl relative">
              <button onClick={() => setEditingItem(null)} className="absolute top-10 right-10 text-white/20 hover:text-white"><X size={32}/></button>
              <h2 className="text-3xl font-black text-white uppercase italic mb-10 tracking-tighter">Update <span className="text-purple-500">{editType}</span></h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase ml-4">Primary Label</label>
                  <input className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none" value={editingItem.title || editingItem.question_text || editingItem.module_code} 
                    onChange={e => setEditingItem({...editingItem, [editingItem.title ? 'title' : editingItem.question_text ? 'question_text' : 'module_code']: e.target.value})} />
                </div>
                {(editingItem.file_url !== undefined) && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase ml-4">Resource Link</label>
                    <input className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-xs" value={editingItem.file_url} onChange={e => setEditingItem({...editingItem, file_url: e.target.value})} />
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-10">
                <button onClick={handleSaveEdit} className="flex-1 py-5 bg-purple-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"><Save size={18}/> Push System Update</button>
                <button onClick={() => setEditingItem(null)} className="px-10 py-5 bg-white/5 text-white/40 rounded-[2rem] font-black uppercase text-xs">Abort</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-10 right-10 flex items-center gap-6 px-8 py-4 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-full z-50">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Database: Online</span>
         </div>
         <div className="w-[1px] h-4 bg-white/10" />
         <div className="text-white/60 text-[9px] font-black uppercase tracking-widest italic">Admin v6.0</div>
      </div>
    </div>
  );
}