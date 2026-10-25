"use client";
import { useEffect } from "react";
import { ensureVisitor } from "@/lib/api";
export default function Visit() {
  useEffect(() => {
    ensureVisitor().catch(() => {});
  }, []);
  return null;
}
