import { subjectsData } from "./data";

export function getMergedData() {
  if (typeof window === "undefined") return subjectsData;

  const localData = localStorage.getItem("custom_uploads");
  if (!localData) return subjectsData;

  const customUploads = JSON.parse(localData);
  const merged = JSON.parse(JSON.stringify(subjectsData)); // Deep clone

  Object.keys(customUploads).forEach(key => {
    if (merged[key]) {
      merged[key].chapters = [...merged[key].chapters, ...customUploads[key]];
    }
  });

  return merged;
}