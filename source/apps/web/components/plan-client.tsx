"use client";
import { use, useEffect, useState } from "react";
import Link from "@/components/site-link";
import { ArrowUpRight, Download, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, planPath } from "@/lib/api";
import type { Plan } from "@/types/plan";
import SourceReference from "@/components/source-reference";
export default function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: routeId } = use(params);
  const [id, setId] = useState(routeId);
  const [plan, setPlan] = useState<Plan | null>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("training"),
    [saved, setSaved] = useState(false);
  async function load() {
    setError("");
    try {
      setPlan(await api<Plan>(`/plans/${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (id === "demo") {
      const actual = new URLSearchParams(location.search).get("id");
      if (actual && /^[a-f0-9-]{36}$/i.test(actual)) setId(actual);
      else setError("请先完成评估，或从账号历史记录打开你的方案。");
    } else load();
  }, [id]);
  function download() {
    if (!plan) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "FitLead-我的演示方案.json";
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }
  if (!plan)
    return (
      <main className="page-shell">
        {error ? (
          <div className="panel">
            <h1 className="page-title">暂时无法读取方案</h1>
            <p className="error" role="alert">
              {error}
            </p>
            <div className="row">
              <Button onClick={load}>重试</Button>
              <Button asChild variant="outline">
                <Link href="/assessment">开始我的评估</Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="loading" role="status">
            正在读取你的专属方案…
          </p>
        )}
      </main>
    );
  return (
    <main className="page-shell">
      <div className="plan-header">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h1 className="page-title">为你定制的，第一步。</h1>
          <p className="lead-text">
            {plan.goal} · 每周 {plan.summary.days} 天 ·{" "}
            {plan.summary.location === "gym" ? "健身房" : "居家"}训练 ·{" "}
            {plan.summary.minutes} 分钟 / 次
          </p>
        </div>
        <span className="chip">
          {plan.mode === "rules"
            ? "在线规则方案 · 数据可追溯"
            : "演示方案 · 规则引擎"}
        </span>
      </div>
      <div className="info-box">
        <ShieldCheck
          size={15}
          style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }}
        />
        已完成风险筛查。这份方案提供起步方向，不替代医疗或真人动作评估。
      </div>
      <div className="metrics">
        {[
          [plan.nutrition.calories, "每日能量参考", "kcal"],
          [plan.nutrition.protein, "蛋白质参考", "g / 天"],
          [plan.nutrition.carbs, "碳水化合物参考", "g / 天"],
          [plan.nutrition.fat, "脂肪参考", "g / 天"],
        ].map(([n, l, u]) => (
          <div className="metric" key={l}>
            <span>{l}</span>
            <strong>{n}</strong>
            <small>{u}</small>
          </div>
        ))}
      </div>
      <div className="tabs" role="tablist" aria-label="方案内容">
        {[
          ["training", "每周训练"],
          ["nutrition", "7 天饮食"],
          ...(plan.hydration ? [["hydration", "饮水与恢复"]] : []),
          ["safety", "计算与安全"],
        ].map(([k, t]) => (
          <button
            key={k}
            role="tab"
            id={`tab-${k}`}
            aria-selected={tab === k}
            aria-controls="plan-panel"
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {t}
          </button>
        ))}
      </div>
      <div id="plan-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "hydration" && plan.hydration && (
          <section className="panel">
            <h2>饮水量，看清总水与饮料的区别。</h2>
            <div className="metrics">
              <div className="metric">
                <span>每日总水参考（含食物）</span>
                <strong>
                  {plan.hydration.total_water_ml ??
                    (plan.hydration.range_ml ? "2000–2500" : "需确认")}
                </strong>
                <small>mL / 日</small>
              </div>
              <div className="metric">
                <span>示例菜单中的食物水分</span>
                <strong>{plan.hydration.food_water_ml ?? "—"}</strong>
                <small>mL</small>
              </div>
              <div className="metric">
                <span>菜单基础上的饮料部分参考</span>
                <strong>{plan.hydration.beverage_ml ?? "—"}</strong>
                <small>mL / 日 · 不是强制目标</small>
              </div>
            </div>
            <p className="note" style={{ marginTop: 20 }}>
              {plan.hydration.message}
            </p>
            <div className="info-box">{plan.hydration.exercise_note}</div>
            <p className="note">
              力量日之间安排恢复；连续两次稳定完成上限次数后再小幅进阶。记录实际睡眠与精神状态，不以疲劳或疼痛作为进步标准。
            </p>
            <Link className="text-link" href="/account">
              记录饮水、睡眠与训练 <ArrowUpRight size={16} />
            </Link>
          </section>
        )}
        {tab === "nutrition" && plan.nutrition.menu_totals && (
          <div className="info-box">
            菜单实际汇总（每日）：{plan.nutrition.menu_totals.calories} kcal ·
            蛋白质 {plan.nutrition.menu_totals.protein} g · 碳水{" "}
            {plan.nutrition.menu_totals.carbs} g · 脂肪{" "}
            {plan.nutrition.menu_totals.fat} g。基于 USDA
            指定食材条目计算，变更食材或烹调后需要重新计算。
            {plan.nutrition.vegetarian_note}
          </div>
        )}
        {tab === "training" && (
          <>
            <p className="note">
              力量训练之间安排恢复。动作过程中若疼痛、眩晕或胸闷，立即停止。
            </p>
            {plan.training.map((day, i) => (
              <details key={day.day} open={i === 0}>
                <summary>
                  周{"一二三四五六日"[i]} · {day.title}
                  <span className="note">{day.minutes} 分钟</span>
                </summary>
                <div className="detail-content">
                  {day.exercises.length > 0 ? (
                    <>
                      <p className="note">{day.warmup}</p>
                      <p className="note">强度：{day.intensity}</p>
                      {day.exercises.map((e) => (
                        <div className="exercise" key={e.name}>
                          <strong>{e.name}</strong>
                          <span>
                            {e.sets} 组 × {e.reps} 次 · 休息 {e.rest}
                          </span>
                          <small>
                            替代动作：{e.alternative}。选无痛、可控制的幅度。
                          </small>
                        </div>
                      ))}
                      <p className="note" style={{ marginTop: 16 }}>
                        {day.cooldown}
                      </p>
                    </>
                  ) : (
                    <p className="note">
                      轻松步行、关节活动或充分休息，以能自然交谈为准，不要求追求强度。
                    </p>
                  )}
                </div>
              </details>
            ))}
            <div className="info-box">
              渐进方式：连续两次轻松完成所有组的上限次数后，再增加 1–2
              次或最小可用重量。先保证动作稳定，不需要练到力竭。
            </div>
          </>
        )}
        {tab === "nutrition" && (
          <>
            <p className="note">
              每天 {plan.nutrition.meal_count}{" "}
              {plan.mode === "rules"
                ? "餐的食材份量基线。米饭、肉类/扁豆与西兰花按条目熟重，苹果为生重，油按实际重量；已逐项汇总能量与宏量，参考目标与实际菜单可能不同。"
                : "餐的食材份量示例；重量按熟重、可食部分计算。不是精确配餐，宏量目标与菜单未做逐项营养匹配。"}
              已过滤所选常见过敏原，仍需核对包装、调味料及交叉接触。
            </p>
            <div className="info-box">
              {plan.nutrition.budget === "low"
                ? "经济预算：优先当季蔬菜、米饭和批量烹调。"
                : plan.nutrition.budget === "high"
                  ? "灵活预算：可选择更多当季食材，避免把补剂当作必需品。"
                  : "适中预算：优先常见食材与可持续备餐。"}{" "}
              预算为偏好，不保证当地实际价格。
            </div>
            {plan.meals.map((day, i) => (
              <details key={day.day} open={i === 0}>
                <summary>
                  第 {day.day} 天 · 均衡饮食起步
                  <span className="note">{day.meals.length} 餐</span>
                </summary>
                <div className="detail-content">
                  {day.meals.map((m) => (
                    <div className="meal" key={m.name}>
                      <strong>{m.name}</strong>
                      <p>{m.items.join(" · ")}</p>
                      <small className="note">替换：{m.swap}</small>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </>
        )}
        {tab === "safety" && (
          <>
            <section className="panel">
              <h2>估算如何得出？</h2>
              <div className="summary-grid">
                <div>
                  <span>基础代谢估算</span>
                  {plan.nutrition.bmr} kcal / 天
                </div>
                <div>
                  <span>总日能量需求估算</span>
                  {plan.nutrition.tdee} kcal / 天
                </div>
                <div>
                  <span>计算基础</span>
                  {plan.summary.age} 岁 · {plan.summary.height} cm ·{" "}
                  {plan.summary.weight} kg
                </div>
                <div>
                  <span>调整原则</span>减脂约 -10%；增肌约 +5%；其他维持
                </div>
              </div>
              <p className="note" style={{ marginTop: 15 }}>
                {plan.nutrition.method}
              </p>
              <p className="note">{plan.nutrition.guidance}</p>
            </section>
            <h3>方案假设、局限与恢复</h3>
            <ul className="plan-safety">
              {plan.safety.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      {plan.evidence && (
        <section className="panel">
          <h3>这份方案的计算依据</h3>
          <p className="note">
            公开参考与食物数据不是对本产品的背书，也不能保证个体效果。
          </p>
          {plan.evidence.map((s) => (
            <details key={s.id}>
              <summary>{s.name}</summary>
              <div className="detail-content">
                <p className="note">{s.use}</p>
                <SourceReference source={s} label="查看原始来源 ↗" />
              </div>
            </details>
          ))}
        </section>
      )}
      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>
              保存这份起点，按自己的节奏开始。
            </h3>
            <p className="note" style={{ marginBottom: 0 }}>
              {plan.mode === "rules"
                ? "方案已加密保存。注册账号后可跨设备登录查看；匿名访问仅限当前标签页。"
                : "方案已保存到服务端，仅原浏览器可读。"}
              可导出本地备份。
            </p>
          </div>
          <Button variant="outline" onClick={download}>
            {saved ? <Check size={17} /> : <Download size={17} />}导出方案 JSON
          </Button>
        </div>
        {saved && (
          <p className="success" role="status">
            已发起下载，请在浏览器下载列表中查看。
          </p>
        )}
      </div>
      <div className="panel">
        <h3>希望有人和你一起，把计划落地？</h3>
        <p className="note">
          真人私教可进一步沟通动作、训练习惯与目标。申请不收费，服务费用由真人另行说明。
        </p>
        <Button asChild>
          <Link href={`/consultation?plan=${id}`}>
            申请真人私教指导 <ArrowUpRight size={17} />
          </Link>
        </Button>
      </div>
    </main>
  );
}
