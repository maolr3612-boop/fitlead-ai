"use client";
import Link from "@/components/site-link";
import { ArrowUpRight } from "lucide-react";
import { useSavedPlan } from "@/hooks/use-saved-plan";
import { planPath } from "@/lib/api";
export default function SavedPlan() {
  const id = useSavedPlan();
  return id ? (
    <Link
      className="text-link"
      style={{ maxWidth: 220, marginTop: 16 }}
      href={planPath(id)}
    >
      继续查看我的方案 <ArrowUpRight size={15} />
    </Link>
  ) : null;
}

