"use client";
import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

// This interface must match exactly what you pass in the Subject Page
interface BookmarkProps {
  resourceId: string;    
  resourceName: string;
  resource_url: string;  
  userId: string;
}

export default function BookmarkButton({ resourceId, resourceName, resource_url, userId }: BookmarkProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) checkStatus();
  }, [userId, resourceId]);

  const checkStatus = async () => {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .eq("resource_id", resourceId)
      .maybeSingle();
    
    if (data) setIsSaved(true);
  };

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) return alert("Please sign in to save resources");
    if (loading) return;

    setLoading(true);

    if (isSaved) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("resource_id", resourceId);
      
      if (!error) setIsSaved(false);
    } else {
      // We save only the columns that exist in your DB (resource_id, user_id, resource_name)
      const { error } = await supabase.from("bookmarks").insert([{ 
        user_id: userId, 
        resource_id: resourceId, 
        resource_name: resourceName 
      }]);
      
      if (!error) setIsSaved(true);
      else console.error("Insert Error:", error.message);
    }
    setLoading(false);
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.9 }}
      onClick={toggleBookmark}
      className={`p-3 rounded-2xl transition-all duration-300 flex items-center justify-center border ${
        isSaved 
          ? 'text-[#3A6EA5] bg-[#3A6EA5]/15 border-[#3A6EA5]/30' 
          : 'text-white/20 bg-white/5 border-white/5 hover:border-white/20 hover:text-white'
      }`}
    >
      <Bookmark 
        size={18} 
        fill={isSaved ? "currentColor" : "none"} 
        className={loading ? "animate-pulse" : ""}
      />
    </motion.button>
  );
}