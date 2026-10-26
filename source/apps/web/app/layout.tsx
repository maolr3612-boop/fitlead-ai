import type { Metadata } from "next";
import Link from "@/components/site-link";
import { Activity, ArrowUpRight } from "lucide-react";
import "./globals.css";
import { ONLINE } from "@/lib/api";
export const metadata: Metadata = {
  title: "FitLead AI · 为你而练",
  description: "从科学评估开始，建立属于你的训练与饮食节奏。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <header className="header">
          <Link className="brand" href="/" aria-label="FitLead AI 首页">
            <span className="brand-icon">
              <Activity size={23} />
            </span>
            FitLead<span className="brand-ai">AI</span>
          </Link>
          <nav aria-label="主导航">
            <Link href="/library">健康资料库</Link>
            <Link href="/account">我的账号</Link>
            <Link href="/#approach">如何开始</Link>
            <Link href="/#services">服务介绍</Link>
            <Link href="/consultation">
              真人私教 <ArrowUpRight size={13} />
            </Link>
          </nav>
          <Link href="/assessment" className="nav-cta">
            开始评估 <ArrowUpRight size={15} />
          </Link>
        </header>
        <nav className="mobile-quick-nav" aria-label="移动快捷导航">
          <Link href="/library">动作与健康资料库 ↗</Link>
          <Link href="/account">我的账号与记录 ↗</Link>
        </nav>
        {children}
        <footer>
          <Link className="brand" href="/">
            FitLead <span className="brand-ai">AI</span>
          </Link>
          <p>让每一次开始，都有科学的方向。</p>
          <div>
            <Link href="/library">动作 · 营养 · 康复</Link>
            <Link href="/account">账号与健康记录</Link>
            <Link href="/privacy">隐私与数据管理</Link>
            {!ONLINE && <Link href="/admin">管理后台</Link>}
            <span>© 2026 FitLead AI</span>
          </div>
          <small>
            本产品提供一般健身信息，不替代医疗诊断、治疗或专业运动评估。
            {ONLINE
              ? "在线规则方案 · 资料可追溯 · 个人数据加密保存。"
              : "演示模式 · 规则引擎。"}
          </small>
        </footer>
      </body>
    </html>
  );
}
