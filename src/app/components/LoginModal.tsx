"use client";
import { useState } from 'react';
import { X, User, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLogin }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, we use a simple check. 
    // In the cloud version, this is where the API call happens.
    if (username.trim() && password.length >= 4) {
      onLogin(username, password);
      onClose();
    } else {
      alert("Please enter a valid name and password (min 4 chars)");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[var(--card)] w-full max-w-md rounded-[2.5rem] border border-[var(--border)] p-10 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-50 hover:opacity-100">
          <X size={20} />
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#3A6EA5]/10 text-[#3A6EA5] rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <Lock size={36} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Student Portal</h2>
          <p className="text-sm opacity-50 mt-2">Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-4 opacity-30" size={18} />
              <input 
                required
                type="text" 
                placeholder="Student Name"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-transparent outline-none focus:ring-2 focus:ring-[#3A6EA5] transition-all"
                style={{ borderColor: 'var(--border)' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 opacity-30" size={18} />
              <input 
                required
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 rounded-2xl border bg-transparent outline-none focus:ring-2 focus:ring-[#3A6EA5] transition-all"
                style={{ borderColor: 'var(--border)' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-4 opacity-30 hover:opacity-100"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="w-full py-4 mt-4 bg-[#3A6EA5] text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            Unlock Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}