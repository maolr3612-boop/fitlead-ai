"use client";
import { useEffect, useState } from "react";
import { api, ONLINE, accessToken } from "@/lib/api";
export function useSavedPlan() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const saved = ONLINE
      ? sessionStorage.getItem("fl_plan") || localStorage.getItem("fl_plan")
      : localStorage.getItem("fl_plan");
    let active = true;
    if (saved && /^[a-f0-9-]{36}$/.test(saved)) {
      if (!ONLINE) setId(saved);
      else if (accessToken())
        api(`/plans/${saved}`)
          .then(() => {
            if (active) {
              setId(saved);
              sessionStorage.setItem("fl_plan", saved);
            }
          })
          .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);
  return id;
}
