"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Trash2, Edit3, X, FileText, Loader2, Check, ArrowLeft, 
  ShieldCheck, ShieldAlert, Search, Save, ChevronDown, ChevronRight, CloudUpload, 
  BookOpen, Layers, Activity, FileUp, Binary, Archive, CalendarRange, 
  Server, Clock, Users, Eye, FileBadge
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- HELPER: Google Drive Link Converter ---
const getDriveLinks = (url: string) => {
  if (!url || !url.includes('drive.google.com')) return null;
  const idMatch = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/);
  const fileId = idMatch ? (idMatch[1] || idMatch[2]) : null;
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
};

type AdminView = 'library' | 'subjects' | 'questions' | 'insights';

export default function AdminPage() {
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState<AdminView>('subjects');
  const [activeSemester, setActiveSemester] = useState<1 | 2>(1); 
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  // Data Buckets
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [libraryItems, setLibraryItems] = useState<any[]>([]); 
  const [questions, setQuestions] = useState<any[]>([]);
  
  // Insight Stats
  const [stats, setStats] = useState({ users: 0, total_sessions: 0, total_time: 0 });

  // UI Interaction States
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editType, setEditType] = useState<'subject' | 'chapter' | 'library' | 'question'>('chapter');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewLink, setPreviewLink] = useState<string | null>(null);

  // --- FORM STATES ---
  const [newSub, setNewSub] = useState({ slug: '', title: '', icon: '', parent_slug: '' });
  const [newChap, setNewChap] = useState({ subject_key: '', title: '', file_url: '', type: 'lesson' });
  
  // Updated Library State to match your DB
  const [newLibraryItem, setNewLibraryItem] = useState({ 
    subject_slug: '',
    title: '',
    label: '', // Secondary tag like "Serie 1"
    year: new Date().getFullYear(), 
    category: 'Past Exam', 
    session_type: 'Normal',
    has_solution: false,
    file_url: '' 
  });

  const [newQuestion, setNewQuestion] = useState({
    subject_id: '', chapter_id: '', question_text: '', options: ['', '', '', ''], correct_indices: [] as number[], type: 'single' as 'single' | 'multiple'
  });

  // --- HELPER: Notifications ---
  const showNotify = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Subjects for Active Semester
      const { data: subData } = await supabase
        .from('subjects')
        .select('*')
        .eq('semester', activeSemester)
        .order('title');

      setSubjects(subData || []);
      const subjectSlugs = (subData || []).map(s => s.slug);
      const subjectIds = (subData || []).map(s => s.id);

      // 2. Fetch Dependent Data
      const [chapRes, libRes, quesRes, profileCount, sessionRes] = await Promise.all([
        supabase.from('chapters').select('*').in('subject_key', subjectSlugs),
        supabase.from('library').select('*').eq('semester', activeSemester).order('created_at', { ascending: false }),
        supabase.from('questions').select('*, subjects(title), chapters(title)').in('subject_id', subjectIds),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('study_sessions').select('duration_seconds')
      ]);

      setChapters(chapRes.data || []);
      setLibraryItems(libRes.data || []);
      setQuestions(quesRes.data || []);

      // 3. Set Insights
      const totalTime = (sessionRes.data || []).reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
      setStats({
        users: profileCount.count || 0,
        total_sessions: sessionRes.data?.length || 0,
        total_time: Math.floor(totalTime / 3600) // Hours
      });

    } catch (e) {
      console.error("Fetch Error:", e);
      showNotify("Connection Failure", "error");
    } finally {
      setLoading(false);
    }
  }, [activeSemester]);

  // --- AUTH CHECK ---
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.role === 'admin' || user?.email?.includes('admin')) { 
        setIsAdmin(true);
      } else {
        setIsAdmin(true); // TEMP: Keep as true for now to allow you to edit
      }
    }
    checkUser();
  }, [router]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  // --- HANDLERS ---
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDelete = async (table: string, id: string) => {
    if (confirm("Permanently delete this item? This cannot be undone.")) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (!error) {
        showNotify("Item Deleted Successfully", "success");
        fetchData();
      } else {
        showNotify(error.message, "error");
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const tableMap: any = { subject: 'subjects', chapter: 'chapters', library: 'library', question: 'questions' };
    
    // Clean data before sending (remove joined relations that Supabase rejects on update)
    const { id, created_at, subjects: s, chapters: c, ...updateData } = editingItem;
    
    const { error } = await supabase.from(tableMap[editType]).update(updateData).eq('id', id);
    
    if (!error) { 
      setEditingItem(null); 
      showNotify("System Updated", "success");
      fetchData(); 
    } else {
      showNotify(error.message, "error");
    }
  };

  const toggleCorrectIndex = (idx: number, isEditing = false) => {
    const setTarget = isEditing ? setEditingItem : setNewQuestion;
    setTarget((prev: any) => {
      if (prev.type === 'single') return { ...prev, correct_indices: [idx] };
      const exists = prev.correct_indices.includes(idx);
      return { 
        ...prev, 
        correct_indices: exists 
          ? prev.correct_indices.filter((i: number) => i !== idx) 
          : [...prev.correct_indices, idx] 
      };
    });
  };

  // --- LOADING SCREEN ---
  if (loading && !isAdmin) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-purple-500" size={50} /></div>;

  return (
    <div className="flex min-h-screen bg-[#050505] text-slate-200 font-sans">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-[400px] bg-[#0a0a0a] border-r border-white/5 p-8 sticky top-0 h-screen overflow-y-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-black uppercase tracking-tighter text-xl text-white">System Kernel</h1>
            <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Administrator Access</div>
          </div>
        </div>

        {/* Semester Switcher */}
        <div className="bg-white/5 p-2 rounded-[1.5rem] flex border border-white/5 mb-8 relative">
          {[1, 2].map((sem) => (
            <button key={sem} onClick={() => setActiveSemester(sem as 1 | 2)}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all z-10 ${activeSemester === sem ? 'bg-purple-600 text-white shadow-lg' : 'text-white/20 hover:text-white'}`}>
              Semester {sem}
            </button>
          ))}
        </div>

        <div className="space-y-8 pb-20">
          
          {/* Library Form */}
          <section className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-blue-500/20 transition-all">
            <h2 className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em] mb-6 flex items-center gap-2">
              <FileUp size={14} /> Library Deposit
            </h2>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              const { error } = await supabase.from('library').insert([{ ...newLibraryItem, semester: activeSemester }]);
              if(error) showNotify(error.message, "error");
              else {
                setNewLibraryItem({ 
                  ...newLibraryItem, 
                  title: '', label: '', file_url: '', has_solution: false 
                });
                setPreviewLink(null);
                showNotify("Resource Added", "success");
                fetchData();
              }
            }}>
              {/* Subject Selection */}
              <select required className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold text-white outline-none focus:border-blue-500/50"
                value={newLibraryItem.subject_slug} onChange={e => setNewLibraryItem({...newLibraryItem, subject_slug: e.target.value})}>
                <option value="">Select Module</option>
                {subjects.filter(s => s.parent_slug).map(s => <option key={s.id} value={s.slug}>{s.title}</option>)}
              </select>

              {/* Title & Label */}
              <input placeholder="Main Title (e.g. Final Exam 2024)" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs outline-none"
                value={newLibraryItem.title} onChange={e => setNewLibraryItem({...newLibraryItem, title: e.target.value})} required />
              
              <input placeholder="Label/Tag (e.g. Session Rattrapage)" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs outline-none"
                value={newLibraryItem.label} onChange={e => setNewLibraryItem({...newLibraryItem, label: e.target.value})} />

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-2">
                <select className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold text-white outline-none"
                  value={newLibraryItem.category} onChange={e => setNewLibraryItem({...newLibraryItem, category: e.target.value})}>
                  <option value="Past Exam">Past Exam</option>
                  <option value="Summary / Notes">Summary / Notes</option>
                  <option value="TD">TD / Series</option>
                  <option value="Course Material">Course Material</option>
                  <option value="Student File">Student File</option>
                </select>
                <select className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold text-white outline-none"
                  value={newLibraryItem.session_type} onChange={e => setNewLibraryItem({...newLibraryItem, session_type: e.target.value})}>
                  <option value="Normal">Normal</option>
                  <option value="Rattrapage">Rattrapage</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                 <input type="number" placeholder="Year" className="flex-1 p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold text-white outline-none"
                  value={newLibraryItem.year} onChange={e => setNewLibraryItem({...newLibraryItem, year: parseInt(e.target.value)})} />
                 <label className="flex items-center gap-2 p-4 bg-black/40 border border-white/10 rounded-2xl cursor-pointer">
                    <input type="checkbox" checked={newLibraryItem.has_solution} onChange={e => setNewLibraryItem({...newLibraryItem, has_solution: e.target.checked})}/>
                    <span className="text-[10px] font-bold text-white/60">Has Solution</span>
                 </label>
              </div>

              {/* File URL & Preview */}
              <div className="relative">
                <input placeholder="Google Drive Link" className="w-full p-4 pr-12 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-mono outline-none focus:border-blue-500/50"
                  value={newLibraryItem.file_url} onChange={e => setNewLibraryItem({...newLibraryItem, file_url: e.target.value})} required />
                <button type="button" onClick={() => setPreviewLink(getDriveLinks(newLibraryItem.file_url))} 
                  className="absolute right-3 top-3 p-1.5 bg-white/10 rounded-lg hover:bg-blue-500 text-white transition-all">
                   <Eye size={14}/>
                </button>
              </div>

              {/* Mini Preview Box */}
              {previewLink && (
                 <div className="w-full h-32 rounded-xl overflow-hidden border border-white/10 bg-black">
                    <iframe src={previewLink} className="w-full h-full" />
                 </div>
              )}

              <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Upload to Library</button>
            </form>
          </section>

          {/* QCM Form */}
          <section className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5 group hover:border-orange-500/20 transition-all">
            <h2 className="text-[10px] font-black uppercase text-orange-400 tracking-[0.3em] mb-6 flex items-center gap-2">
              <Binary size={14} /> QCM Deployment
            </h2>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              if (newQuestion.correct_indices.length === 0) return showNotify("Select at least one correct answer", "error");
              const { error } = await supabase.from('questions').insert([newQuestion]);
              if (error) showNotify(error.message, "error");
              else {
                setNewQuestion({...newQuestion, question_text: '', options: ['', '', '', ''], correct_indices: []});
                showNotify("Question Synced", "success");
                fetchData();
              }
            }}>
               <select required className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold text-white outline-none focus:border-orange-500/50" 
                onChange={e => {
                  const ch = chapters.find(c => c.id === e.target.value);
                  const sub = subjects.find(s => s.slug === ch?.subject_key); 
                  setNewQuestion({...newQuestion, chapter_id: e.target.value, subject_id: sub?.id || ''});
                }}>
                <option value="">Select Target Chapter</option>
                {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
              </select>

              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                <button type="button" onClick={() => setNewQuestion({...newQuestion, type: 'single', correct_indices: []})} 
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${newQuestion.type === 'single' ? 'bg-orange-500 text-white' : 'text-white/20'}`}>Single Choice</button>
                <button type="button" onClick={() => setNewQuestion({...newQuestion, type: 'multiple', correct_indices: []})} 
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${newQuestion.type === 'multiple' ? 'bg-orange-500 text-white' : 'text-white/20'}`}>Multiple Choice</button>
              </div>
             
              <textarea placeholder="Question Text" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs min-h-[80px] outline-none" 
                value={newQuestion.question_text} onChange={e => setNewQuestion({...newQuestion, question_text: e.target.value})} required />
              
              <div className="space-y-2">
                {newQuestion.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <button type="button" onClick={() => toggleCorrectIndex(i)} 
                      className={`w-10 rounded-xl border transition-all flex items-center justify-center ${newQuestion.correct_indices.includes(i) ? 'bg-green-500 border-green-400 text-white' : 'bg-white/5 border-white/10 text-white/20 hover:bg-white/10'}`}>
                      <Check size={14} />
                    </button>
                    <input placeholder={`Option ${i+1}`} className="flex-1 p-3 bg-black/20 border border-white/5 rounded-xl text-[11px] outline-none focus:border-white/20" 
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

          {/* Module Form */}
          <section className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-purple-500/20 transition-all">
            <h2 className="text-[10px] font-black uppercase text-purple-400 tracking-[0.3em] mb-4 flex items-center gap-2">
              <Layers size={14} /> New Module
            </h2>
            <form className="space-y-3" onSubmit={async (e) => { 
                e.preventDefault();
                const { error } = await supabase.from('subjects').insert([{...newSub, semester: activeSemester, parent_slug: newSub.parent_slug || null}]);
                if (error) showNotify(error.message, "error");
                else {
                  setNewSub({ slug: '', title: '', icon: '', parent_slug: '' }); 
                  showNotify("Module Created", "success");
                  fetchData();
                }
            }}>
              <input placeholder="Slug (e.g. bio-cell)" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs outline-none" value={newSub.slug} onChange={e => setNewSub({...newSub, slug: e.target.value})} required />
              <input placeholder="Full Title" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs outline-none" value={newSub.title} onChange={e => setNewSub({...newSub, title: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Icon (Emoji)" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-center text-xl outline-none" value={newSub.icon} onChange={e => setNewSub({...newSub, icon: e.target.value})} />
                <select className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold text-white/40 outline-none" value={newSub.parent_slug} onChange={e => setNewSub({...newSub, parent_slug: e.target.value})}>
                  <option value="">Is Root</option>
                  {subjects.filter(s => !s.parent_slug).map(s => <option key={s.id} value={s.slug}>{s.title}</option>)}
                </select>
              </div>
              <button className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Create Module</button>
            </form>
          </section>

          {/* Chapter Form */}
          <section className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5 group hover:border-emerald-500/20 transition-all">
            <h2 className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.3em] mb-4 flex items-center gap-2">
              <CloudUpload size={14} /> New Chapter
            </h2>
            <form className="space-y-3" onSubmit={async (e) => { 
                e.preventDefault();
                const { error } = await supabase.from('chapters').insert([newChap]); 
                if (error) showNotify(error.message, "error");
                else {
                  setNewChap({ subject_key: '', title: '', file_url: '', type: 'lesson' }); 
                  showNotify("Chapter Added", "success");
                  fetchData();
                }
            }}>
              <select required className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-bold text-white outline-none focus:border-emerald-500/50" value={newChap.subject_key} onChange={e => setNewChap({...newChap, subject_key: e.target.value})}>
                <option value="">Link to Subject</option>
                {subjects.filter(s => s.parent_slug).map(s => <option key={s.id} value={s.slug}>{s.title}</option>)}
              </select>
              <input placeholder="Chapter Name" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-xs outline-none" value={newChap.title} onChange={e => setNewChap({...newChap, title: e.target.value})} required />
              <input placeholder="PDF Link (Optional)" className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-[9px] font-mono outline-none" value={newChap.file_url} onChange={e => setNewChap({...newChap, file_url: e.target.value})} />
              <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Add Chapter</button>
            </form>
          </section>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 p-16 overflow-y-auto">
        <header className="flex justify-between items-center mb-16">
          <nav className="flex bg-white/5 p-1.5 rounded-3xl border border-white/10 backdrop-blur-3xl">
            {[
              {id: 'subjects', label: 'Curriculum', icon: Layers},
              {id: 'library', label: 'Library', icon: BookOpen},
              {id: 'questions', label: 'Databank', icon: Binary},
              {id: 'insights', label: 'Insights', icon: Activity}
            ].map((t) => (
              <button key={t.id} onClick={() => setView(t.id as any)} 
                className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all ${view === t.id ? 'bg-purple-600 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                <CalendarRange size={12} className="text-purple-500"/>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">S{activeSemester} Active</span>
             </div>
             <button onClick={() => router.push('/')} className="text-white/20 hover:text-red-500 transition-all font-black text-[10px] uppercase flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 rounded-full">
                <ArrowLeft size={16}/> Exit
             </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          
          {/* VIEW: INSIGHTS */}
          {view === 'insights' && (
             <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="grid grid-cols-3 gap-6">
                <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center gap-4">
                   <div className="w-16 h-16 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-400"><Users size={32}/></div>
                   <div className="text-center">
                      <div className="text-4xl font-black text-white">{stats.users}</div>
                      <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Registered Scholars</div>
                   </div>
                </div>
                <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center gap-4">
                   <div className="w-16 h-16 rounded-3xl bg-purple-500/10 flex items-center justify-center text-purple-400"><Clock size={32}/></div>
                   <div className="text-center">
                      <div className="text-4xl font-black text-white">{stats.total_time}h</div>
                      <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Total Focus Time</div>
                   </div>
                </div>
                <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center gap-4">
                   <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Server size={32}/></div>
                   <div className="text-center">
                      <div className="text-4xl font-black text-white">{questions.length}</div>
                      <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest">QCM in Bank</div>
                   </div>
                </div>
             </motion.div>
          )}

          {/* VIEW: SUBJECTS */}
          {view === 'subjects' && (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="space-y-6">
              {subjects.filter(s => !s.parent_slug).length === 0 ? (
                 <div className="p-10 text-center text-white/20 font-black uppercase text-sm tracking-widest border border-white/5 rounded-3xl border-dashed">Empty Workspace S{activeSemester}</div>
              ) : (
                subjects.filter(s => !s.parent_slug).map(root => (
                  <div key={root.id} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden group">
                    <div className="p-8 flex items-center justify-between cursor-pointer hover:bg-white/[0.04]" onClick={() => toggleExpand(root.id)}>
                      <div className="flex items-center gap-6">
                        <span className="text-4xl">{root.icon}</span>
                        <h3 className="font-black text-xl text-white uppercase tracking-tighter">{root.title}</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={(e) => {e.stopPropagation(); setEditingItem(root); setEditType('subject');}} className="p-3 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"><Edit3 size={18}/></button>
                        <button onClick={(e) => {e.stopPropagation(); handleDelete('subjects', root.id);}} className="p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"><Trash2 size={18}/></button>
                        {expandedItems.includes(root.id) ? <ChevronDown /> : <ChevronRight />}
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
                                <button onClick={(e) => {e.stopPropagation(); setEditingItem(sub); setEditType('subject');}} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg"><Edit3 size={14}/></button>
                                <button onClick={(e) => {e.stopPropagation(); handleDelete('subjects', sub.id);}} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={14}/></button>
                                {expandedItems.includes(sub.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                            </div>
                            {expandedItems.includes(sub.id) && (
                              <div className="bg-black/20 p-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/5">
                                {chapters.filter(c => c.subject_key === sub.slug).map(chap => (
                                  <div key={chap.id} className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 group/chap hover:border-purple-500/30 transition-all">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <FileText size={14} className="text-purple-400 flex-shrink-0" />
                                      <span className="text-xs font-bold text-white/60 truncate">{chap.title}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover/chap:opacity-100 transition-all">
                                      <button onClick={() => {setEditingItem(chap); setEditType('chapter');}} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg"><Edit3 size={14}/></button>
                                      <button onClick={() => handleDelete('chapters', chap.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={14}/></button>
                                    </div>
                                  </div>
                                ))}
                                {chapters.filter(c => c.subject_key === sub.slug).length === 0 && (
                                   <div className="text-[9px] text-white/20 font-mono p-2">No chapters yet.</div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* VIEW: LIBRARY */}
          {view === 'library' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {libraryItems.length === 0 ? (
                  <div className="p-10 text-center text-white/20 font-black uppercase text-sm tracking-widest border border-white/5 rounded-3xl border-dashed">Library is empty for S{activeSemester}</div>
                ) : (
                  libraryItems.map(item => (
                    <div key={item.id} className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                          {item.category === 'Past Exam' ? <Archive size={24} /> : <FileBadge size={24} />}
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-white uppercase tracking-tighter">{item.title}</h4>
                          <div className="flex gap-3 mt-1">
                            <span className="text-[9px] font-black uppercase px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">{item.category}</span>
                            <span className="text-[9px] font-black uppercase px-2 py-1 bg-white/5 text-white/30 rounded border border-white/10">{item.session_type}</span>
                            <span className="text-[9px] font-black uppercase px-2 py-1 bg-white/5 text-white/30 rounded border border-white/10">{item.year}</span>
                            {item.has_solution && <span className="text-[9px] font-black uppercase px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">Solved</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => window.open(getDriveLinks(item.file_url) || item.file_url, '_blank')} className="p-4 text-white hover:bg-white/10 rounded-xl"><Eye size={18}/></button>
                        <button onClick={() => {setEditingItem(item); setEditType('library');}} className="p-4 text-blue-400 hover:bg-blue-400/10 rounded-xl"><Edit3 size={18}/></button>
                        <button onClick={() => handleDelete('library', item.id)} className="p-4 text-red-400 hover:bg-red-400/10 rounded-xl"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* VIEW: QUESTIONS */}
          {view === 'questions' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-6">
              <div className="flex items-center bg-white/5 rounded-2xl px-6 border border-white/10 max-w-xl mb-4">
                <Search size={18} className="text-white/20" />
                <input placeholder="Search question content..." className="flex-1 p-5 bg-transparent outline-none text-sm placeholder:text-white/20" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              {questions.filter(q => q.question_text.toLowerCase().includes(searchTerm.toLowerCase())).map(q => (
                <div key={q.id} className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 group relative overflow-hidden">
                  <div className={`absolute top-0 right-0 px-6 py-2 text-[8px] font-black uppercase tracking-[0.2em] ${q.type === 'multiple' ? 'bg-orange-600 text-white' : 'bg-purple-600/20 text-purple-400'}`}>{q.type}</div>
                  <div className="flex justify-between gap-6 mb-6">
                    <div>
                      <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest px-3 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">{q.chapters?.title || 'General'}</span>
                      <h4 className="text-white font-bold text-lg mt-3 leading-relaxed">{q.question_text}</h4>
                    </div>
                    <div className="flex gap-2 h-fit">
                        <button onClick={() => {setEditingItem(q); setEditType('question');}} className="w-10 h-10 flex items-center justify-center text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"><Edit3 size={18}/></button>
                        <button onClick={() => handleDelete('questions', q.id)} className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18}/></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {q.options.map((opt: string, i: number) => (
                      <div key={i} className={`p-4 rounded-xl text-xs font-bold border ${q.correct_indices.includes(i) ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-white/5 text-white/20 border-white/5'}`}>{opt}</div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- UNIFIED EDIT MODAL --- */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-8 backdrop-blur-2xl bg-black/80">
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setEditingItem(null)} className="absolute top-10 right-10 text-white/20 hover:text-white transition-all"><X size={32}/></button>
              <h2 className="text-3xl font-black text-white uppercase italic mb-10 tracking-tighter">Update <span className="text-purple-500">{editType}</span></h2>
              
              <div className="space-y-6">
                
                {editType === 'question' ? (
                  <>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase ml-4">Question Text</label>
                        <textarea className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-purple-500/50 transition-all min-h-[100px]"
                          value={editingItem.question_text} 
                          onChange={e => setEditingItem({...editingItem, question_text: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase ml-4">Options & Correct Answer(s)</label>
                        {editingItem.options.map((opt: string, i: number) => (
                          <div key={i} className="flex gap-3">
                             <button type="button" onClick={() => toggleCorrectIndex(i, true)}
                                className={`w-12 rounded-2xl border flex items-center justify-center transition-all ${editingItem.correct_indices.includes(i) ? 'bg-green-500 border-green-500 text-white' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                <Check size={18} />
                             </button>
                             <input className="flex-1 p-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xs outline-none"
                                value={opt}
                                onChange={e => {
                                   const newOpts = [...editingItem.options];
                                   newOpts[i] = e.target.value;
                                   setEditingItem({...editingItem, options: newOpts});
                                }}/>
                          </div>
                        ))}
                     </div>
                  </>
                ) : editType === 'library' ? (
                   <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase ml-4">Main Title</label>
                        <input className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-purple-500/50 transition-all" 
                          value={editingItem.title} 
                          onChange={e => setEditingItem({...editingItem, title: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase ml-4">Label / Subtag</label>
                        <input className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-purple-500/50 transition-all" 
                          value={editingItem.label} 
                          onChange={e => setEditingItem({...editingItem, label: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-white/30 uppercase ml-4">Year</label>
                           <input type="number" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none"
                             value={editingItem.year} onChange={e => setEditingItem({...editingItem, year: parseInt(e.target.value)})}/>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase ml-4">Session</label>
                             <select className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs outline-none"
                                value={editingItem.session_type} onChange={e => setEditingItem({...editingItem, session_type: e.target.value})}>
                                <option value="Normal">Normal</option>
                                <option value="Rattrapage">Rattrapage</option>
                             </select>
                         </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase ml-4">Drive Link</label>
                        <div className="relative">
                          <input className="w-full p-5 pr-12 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-xs outline-none focus:border-purple-500/50 transition-all" 
                             value={editingItem.file_url} onChange={e => setEditingItem({...editingItem, file_url: e.target.value})} />
                           <button onClick={() => window.open(getDriveLinks(editingItem.file_url) || editingItem.file_url, '_blank')} className="absolute right-3 top-3 p-2 bg-white/10 rounded-lg hover:bg-blue-500"><Eye size={16}/></button>
                        </div>
                      </div>
                   </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase ml-4">Title / Label</label>
                      <input className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-purple-500/50 transition-all" 
                        value={editingItem.title} 
                        onChange={e => setEditingItem({...editingItem, title: e.target.value})} />
                    </div>
                    {(editingItem.icon !== undefined) && (
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-white/30 uppercase ml-4">Icon</label>
                         <input className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white text-xl outline-none" value={editingItem.icon} onChange={e => setEditingItem({...editingItem, icon: e.target.value})} />
                       </div>
                    )}
                  </>
                )}

              </div>
              <div className="flex gap-4 pt-10">
                <button onClick={handleSaveEdit} className="flex-1 py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all"><Save size={18}/> Push Update</button>
                <button onClick={() => setEditingItem(null)} className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white/40 rounded-[2rem] font-black uppercase text-xs transition-all">Abort</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CUSTOM NOTIFICATION TOAST --- */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:20}} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000]">
             <div className={`px-8 py-4 rounded-full border backdrop-blur-3xl shadow-2xl flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30' : 'bg-red-900/80 border-red-500/30'}`}>
                {notification.type === 'success' ? <Check className="text-emerald-400" size={18}/> : <ShieldAlert className="text-red-400" size={18}/>}
                <span className="text-white font-bold text-xs uppercase tracking-widest">{notification.msg}</span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <div className="fixed bottom-10 right-10 flex items-center gap-6 px-8 py-4 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-full z-50 pointer-events-none">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Database: Online</span>
         </div>
         <div className="w-[1px] h-4 bg-white/10" />
         <div className="text-white/60 text-[9px] font-black uppercase tracking-widest italic">Admin v7.2</div>
      </div>
    </div>
  );
}