"use client";
import { useEffect, useState } from "react";
import Link from "@/components/site-link";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { api, ensureVisitor, goals } from "@/lib/api";
import { Button } from "@/components/ui/button";
export default function Consultation() {
  const [goal, setGoal] = useState("fat_loss"),
    [contact, setContact] = useState(""),
    [preferred, setPreferred] = useState("工作日 18:00–21:00"),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    ensureVisitor()
      .then(() => api("/events", { name: "consultation_opened" }))
      .catch((e) => setError(e.message));
    const id = new URLSearchParams(location.search).get("plan");
    if (id)
      api(`/plans/${id}`)
        .then((p) => setGoal(p.summary.goal_key))
        .catch((e) => setError(e.message));
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!consent) {
      setError("请单独确认联系方式使用授权。");
      return;
    }
    const value = contact.trim();
    if (!(
      /^1[3-9]\d{9}$/.test(value) ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
      /^[a-zA-Z][a-zA-Z0-9_-]{5,39}$/.test(value)
    )) {
      setError(
        "请输入有效手机号、邮箱或微信号（微信号至少 6 位，以字母开头）。",
      );
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await ensureVisitor();
      const lead = await api("/leads", { goal, contact: value, consent: true });
      await api("/appointments", {
        lead_id: lead.id,
        preferred_time: preferred,
      });
      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <main className="page-shell narrow">
        <div className="panel">
          <div className="review-icon">
            <Check />
          </div>
          <span className="eyebrow">ONE STEP CLOSER</span>
          <h1 className="page-title">你的咨询申请已收到。</h1>
          <p>
            已记录你的{goals[goal]}目标与期望联系时间：{preferred}。
          </p>
          <div className="info-box">
            这是一份咨询申请，不代表预约时间已确认。具体服务安排和联系时间仍需人工确认。尚未产生任何收费或支付。
          </div>
          <div className="row">
            <Button asChild>
              <Link href="/">
                返回首页 <ArrowUpRight size={17} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/privacy">管理联系授权</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  return (
    <main className="page-shell narrow">
      <span className="eyebrow">HUMAN SUPPORT. YOUR CHOICE.</span>
      <h1 className="page-title">好的计划，也可以有人同行。</h1>
      <p className="lead-text">
        让真人进一步了解你的目标、训练习惯与困惑。你决定是否开始，也随时可以撤回授权。
      </p>
      <div className="panel">
        <h2>真人私教可以提供什么？</h2>
        <p className="note">
          目标与训练条件沟通 · 动作与训练习惯指导 · 进一步评估是否适合服务
        </p>
        <div className="info-box">
          申请咨询免费。后续服务内容与费用需单独确认；本站
          不支持在线支付，不会自动扣款。
        </div>
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="goal">我的当前目标</label>
            <select
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            >
              {Object.entries(goals).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="contact">手机号、邮箱或微信号</label>
            <input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="填写你愿意接收咨询回复的联系方式"
              maxLength={120}
              autoComplete="off"
            />
            <small>只用于本次主动咨询与预约沟通，不用于未授权营销。</small>
          </div>
          <div className="field">
            <label htmlFor="preferred">期望联系时间（北京时间）</label>
            <select
              id="preferred"
              value={preferred}
              onChange={(e) => setPreferred(e.target.value)}
            >
              {[
                "工作日 09:00–12:00",
                "工作日 12:00–14:00",
                "工作日 18:00–21:00",
                "周末 10:00–18:00",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <label className="check-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              我主动申请真人私教咨询，同意使用上述联系方式就本次咨询与我联系。我已阅读
              <Link href="/privacy" target="_blank" rel="noreferrer">
                隐私说明（新窗口）
              </Link>
              ，可随时撤回授权。
            </span>
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <span className="note">未经授权，不主动联系</span>
            <Button type="submit" disabled={busy}>
              {busy ? "正在提交…" : "提交免费咨询申请"}{" "}
              <ArrowUpRight size={17} />
            </Button>
          </div>
        </form>
      </div>
      <p className="note">
        <ShieldCheck
          size={14}
          style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }}
        />
        如涉及疾病、持续疼痛或损伤，请先寻求医疗或合格专业人员评估。
      </p>
    </main>
  );
}
