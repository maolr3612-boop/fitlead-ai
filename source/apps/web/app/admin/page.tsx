"use client";
import { useEffect, useState } from "react";
import { LockKeyhole, ArrowRight, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, goals, ONLINE } from "@/lib/api";
import Link from "@/components/site-link";
type Lead = {
  id: string;
  contact: string;
  goal: string;
  source: string;
  status: string;
  notes: string;
  authorized: boolean;
  preferred_time: string;
};
const statuses: Record<string, string> = {
  new: "新线索",
  contacted: "已联系",
  booked: "已预约",
  converted: "已转化",
  closed: "已关闭",
};
const sources: Record<string, string> = {
  direct: "直接访问",
  douyin: "抖音",
  xiaohongshu: "小红书",
};
function LeadCard({ lead, onSaved }: { lead: Lead; onSaved: () => void }) {
  const [status, setStatus] = useState(lead.status),
    [notes, setNotes] = useState(lead.notes),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api(`/admin/leads/${lead.id}`, { status, notes }, "PATCH");
      setSaved(true);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="admin-lead">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>{lead.contact}</h3>
        <span className="chip">已授权咨询联系</span>
      </div>
      <p>
        {goals[lead.goal]} · 来源：{sources[lead.source]} · 期望联系：
        {lead.preferred_time}
      </p>
      <label className="field">
        <span>跟进状态</span>
        <select
          aria-label={`跟进状态 ${lead.contact}`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setSaved(false);
          }}
        >
          {Object.entries(statuses).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>管理员备注</span>
        <textarea
          aria-label={`备注 ${lead.contact}`}
          value={notes}
          maxLength={2000}
          placeholder="记录与本次咨询有关的跟进信息"
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <Button variant="outline" onClick={save} disabled={busy}>
        {busy ? "保存中…" : "保存跟进"}
      </Button>
      {saved && (
        <p className="success" role="status">
          跟进已保存
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false),
    [loading, setLoading] = useState(true),
    [username, setUsername] = useState("admin"),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [stats, setStats] = useState<any>(null),
    [leads, setLeads] = useState<Lead[]>([]);
  async function refresh() {
    setError("");
    try {
      const [s, l] = await Promise.all([
        api("/admin/stats"),
        api<Lead[]>("/admin/leads"),
      ]);
      setStats(s);
      setLeads(l);
      setAuthenticated(true);
    } catch (e) {
      setAuthenticated(false);
      if (authenticated) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (ONLINE) {
      setLoading(false);
      return;
    }
    refresh();
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/admin/login", { username, password });
      setPassword("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/admin/logout", {});
      setAuthenticated(false);
      setStats(null);
      setLeads([]);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (ONLINE)
    return (
      <main className="page-shell narrow">
        <div className="panel">
          <div className="review-icon">
            <LockKeyhole />
          </div>
          <h1 className="page-title">线上管理入口尚未开放</h1>
          <p>
            这里不是个人账号登录入口。请进入“我的账号”查看和管理自己的方案、记录与数据。
          </p>
          <Button asChild>
            <Link href="/account">
              前往我的账号 <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
      </main>
    );
  if (loading)
    return (
      <main className="page-shell">
        <p className="loading">正在验证管理员身份…</p>
      </main>
    );
  if (!authenticated)
    return (
      <main className="page-shell narrow">
        <div className="panel" style={{ maxWidth: 470, margin: "30px auto" }}>
          <div className="review-icon">
            <LockKeyhole />
          </div>
          <span className="eyebrow">AUTHORIZED ACCESS ONLY</span>
          <h1 className="page-title">管理员登录</h1>
          <p className="note">仅限已配置的管理员账户。普通评估用户无需注册。</p>
          <form onSubmit={login}>
            <div className="field">
              <label htmlFor="username">用户名</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">密码</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "验证中…" : "安全登录"} <ArrowRight size={17} />
            </Button>
          </form>
          <p className="note" style={{ marginTop: 20 }}>
            管理员账号由服务端环境变量配置，不提供公开注册或默认密码。
          </p>
        </div>
      </main>
    );
  return (
    <main className="page-shell">
      <div className="plan-header">
        <div>
          <span className="eyebrow">FITLEAD / WORKSPACE</span>
          <h1 className="page-title">每一次主动联系，都值得认真跟进。</h1>
          <p className="note">仅展示明确授权的咨询客户 · 今日按北京时间统计</p>
        </div>
        <div className="row">
          <Button variant="outline" onClick={refresh}>
            <RefreshCw size={15} />
            刷新
          </Button>
          <Button variant="ghost" onClick={logout}>
            <LogOut size={15} />
            退出
          </Button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {stats && (
        <>
          <div className="metrics">
            {[
              [stats.today_leads, "今日新增线索"],
              [stats.assessments, "累计评估人数"],
              [`${stats.completion_rate}%`, "评估完成率"],
              [stats.consultations, "主动咨询人数"],
            ].map(([n, l]) => (
              <div className="metric" key={l}>
                <span>{l}</span>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
          <div className="panel">
            <h3>来源与预约</h3>
            <p className="note">
              预约申请：{stats.appointments} 人（申请不等于时间确认）
            </p>
            <div className="summary-grid">
              {Object.entries(stats.sources).map(([s, v]: [string, any]) => (
                <div key={s}>
                  <span>{sources[s]}</span>
                  {v.visitors} 次独立访问 · {v.leads} 位已授权咨询
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <h2 style={{ fontSize: 24 }}>客户与跟进</h2>
      <p className="note">
        状态按 新线索 → 已联系 → 已预约 → 已转化 更新；可随时关闭。展示最近 200
        位授权客户。
      </p>
      {leads.length ? (
        leads.map((l) => <LeadCard key={l.id} lead={l} onSaved={() => {}} />)
      ) : (
        <div className="panel">
          <p>还没有主动授权的咨询客户。匿名评估用户不会出现在这里。</p>
        </div>
      )}
    </main>
  );
}
