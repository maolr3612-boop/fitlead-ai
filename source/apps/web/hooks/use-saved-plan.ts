"use client";
import { useEffect, useState } from "react";
export function useSavedPlan() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem("fl_plan");
    if (saved && /^[a-f0-9-]{36}$/.test(saved)) setId(saved);
  }, []);
  return id;
}
