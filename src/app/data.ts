// src/app/data.ts

// Keeping the structure so dataHelper.ts doesn't crash
export const subjectsData: any = {
  biology: {
    title: "Biology",
    icon: "🧬",
    chapters: [] // Empty because we use Supabase now
  },
  chemistry: {
    title: "Chemistry",
    icon: "🧪",
    chapters: []
  },
  physics: {
    title: "Physics",
    icon: "⚛️",
    chapters: []
  },
  maths: {
    title: "Mathematics",
    icon: "🧮",
    chapters: []
  }
};