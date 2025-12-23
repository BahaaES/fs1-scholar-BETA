"use client"; // This MUST be the first line
import React from 'react';
import Link from 'next/link';
import { Home, MoveLeft, Atom } from 'lucide-react';

// Make sure the function name is capitalized (NotFound)
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center bg-[var(--background)]">
      
      {/* ATOM ICON */}
      <div className="mb-8 text-[#3A6EA5] opacity-20 animate-spin-slow">
        <Atom size={120} />
      </div>

      <div className="relative">
        <h1 className="text-9xl font-black leading-none tracking-tighter opacity-5 select-none" style={{ color: 'var(--foreground)' }}>
          404
        </h1>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h2 className="text-4xl font-black mb-2" style={{ color: 'var(--foreground)' }}>
            Lost in Space?
          </h2>
          <p className="opacity-60 max-w-md mx-auto" style={{ color: 'var(--foreground)' }}>
            This resource exists in another dimension. Let's get you back to your studies.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-12">
        <Link 
          href="/" 
          className="flex items-center gap-2 px-8 py-4 bg-[#3A6EA5] text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg"
        >
          <Home size={20} /> Return Home
        </Link>
        
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold border transition-all"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          <MoveLeft size={20} /> Go Back
        </button>
      </div>
    </div>
  );
}