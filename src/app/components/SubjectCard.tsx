"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface SubjectCardProps {
  id: string;
  name: string;
  code: string;
  iconName: string;
  count?: number; // Optional: number of files in this subject
}

export default function SubjectCard({ id, name, code, iconName, count = 0 }: SubjectCardProps) {
  // Dynamically grab the icon from Lucide
  const IconComponent = (Icons as any)[iconName] || Icons.BookOpen;

  return (
    <Link href={`/subject/${id}`}>
      <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="group relative p-6 rounded-[2rem] bg-white/[0.03] border border-white/10 backdrop-blur-md overflow-hidden transition-all hover:bg-white/[0.06] hover:border-[#3A6EA5]/50"
      >
        {/* Decorative Background Glow */}
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-[#3A6EA5]/10 blur-3xl group-hover:bg-[#3A6EA5]/20 transition-colors" />

        <div className="flex flex-col h-full gap-4">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-[#3A6EA5]/10 flex items-center justify-center text-[#3A6EA5] group-hover:bg-[#3A6EA5] group-hover:text-white transition-all duration-300">
              <IconComponent size={24} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-black px-3 py-1 bg-white/5 rounded-full border border-white/5 opacity-60 group-hover:opacity-100 transition-opacity">
              {code}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-[#3A6EA5] transition-colors line-clamp-1">
              {name}
            </h3>
            <p className="text-xs font-medium text-white/40 mt-1 uppercase tracking-widest">
              {count} Resources available
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2 text-[#3A6EA5] font-bold text-xs uppercase tracking-tighter opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
            Explore Archive <ChevronRight size={14} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}