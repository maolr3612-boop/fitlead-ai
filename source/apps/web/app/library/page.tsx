"use client";
import { useEffect, useState } from "react";
import Link from "@/components/site-link";
import { Search, BookOpen, ArrowUpRight, ShieldCheck } from "lucide-react";
import { api, ONLINE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import SourceReference from "@/components/source-reference";
type Source = {
  id: string;
  name: string;
  url: string;
  license: string;
  use: string;
  area: string;
  reviewed: string;
};
type Exercise = {
  id: string;
  name: string;
  level: string;
  equipment: string;
  category: string;
  primaryMuscles: string[];
  instructions: string[];
};
type Food = {
  id: string;
  name: string;
  dataset: string;
  basis: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  water_g: number | null;
};
type Rehab = {
  id: string;
  title: string;
  category: string;
  summary: string;
  action: string;
  red_flags: string[];
  sources: string[];
};
export default function Library() {
  const [tab, setTab] = useState("exercises"),
    [query, setQuery] = useState(""),
    [searched, setSearched] = useState(""),
    [page, setPage] = useState(1),
    [equipment, setEquipment] = useState(""),
    [level, setLevel] = useState(""),
    [meta, setMeta] = useState<{
      foods: number;
      exercises: number;
      imported_at: string;
      sources: Source[];
    } | null>(null),
    [items, setItems] = useState<(Exercise | Food | Rehab)[]>([]),
    [total, setTotal] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [queryVersion, setQueryVersion] = useState(0);
  useEffect(() => {
    if (ONLINE)
      api("/catalog/meta")
        .then(setMeta)
        .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    let active = true;
    if (!ONLINE || tab === "sources" || tab === "water") return;
    setBusy(true);
    setError("");
    const p =
      tab === "rehabilitation"
        ? "/catalog/rehabilitation"
        : `/catalog/${tab}?q=${encodeURIComponent(searched)}&page=${page}&equipment=${encodeURIComponent(equipment)}&level=${level}`;
    api(p)
      .then((r) => {
        if (active) {
          setItems(r.items);
          setTotal(r.total ?? r.items.length);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [tab, searched, page, equipment, level, queryVersion]);
  function change(t: string) {
    setBusy(false);
    setError("");
    setTab(t);
    setQuery("");
    setSearched("");
    setPage(1);
    setEquipment("");
    setLevel("");
    setItems([]);
  }
  return (
    <main className="page-shell">
      <span className="eyebrow">KNOWLEDGE WITH A SOURCE</span>
      <h1 className="page-title">训练有依据，健康不靠猜。</h1>
      <p className="lead-text">
        可查来源的动作、食物营养与康复知识。目录覆盖不代表适合每个人，先做风险筛查再制定个人计划。
      </p>
      {!ONLINE ? (
        <div className="info-box">
          当前为本地 V1。请为前端配置 NEXT_PUBLIC_API_URL
          以连接资料库与账号服务。线上发布版已按独立 API 设计。
        </div>
      ) : (
        <>
          <div className="metrics">
            {[
              [meta?.exercises ?? "…", "动作文本条目"],
              [meta?.foods ?? "…", "USDA 食物条目"],
              ["8", "康复知识主题"],
              [meta?.imported_at || "…", "数据导入日期"],
            ].map(([v, l]) => (
              <div className="metric" key={l}>
                <span>{l}</span>
                <strong style={{ fontSize: l === "数据导入日期" ? 20 : 28 }}>
                  {v}
                </strong>
              </div>
            ))}
          </div>
          <div
            className="tabs library-tabs"
            role="tablist"
            aria-label="资料类别"
          >
            {[
              ["exercises", "健身动作"],
              ["foods", "食物营养"],
              ["rehabilitation", "康复知识"],
              ["water", "饮水依据"],
              ["sources", "来源与授权"],
            ].map(([k, l]) => (
              <button
                role="tab"
                aria-selected={tab === k}
                key={k}
                className={tab === k ? "active" : ""}
                onClick={() => change(k)}
              >
                {l}
              </button>
            ))}
          </div>
          {["exercises", "foods"].includes(tab) && (
            <form
              className="library-search"
              onSubmit={(e) => {
                e.preventDefault();
                setSearched(query.trim());
                setPage(1);
                setQueryVersion((n) => n + 1);
              }}
            >
              <div className="field">
                <label htmlFor="catalog-query">
                  搜索{tab === "foods" ? "食物" : "动作"}
                </label>
                <input
                  id="catalog-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  maxLength={100}
                  placeholder={
                    tab === "foods"
                      ? "试试：鸡胸、米饭、苹果，或英文名 / FDC ID"
                      : "试试：深蹲、哑铃、划船，或英文动作名"
                  }
                />
              </div>
              {tab === "exercises" && (
                <>
                  <div className="field">
                    <label htmlFor="equipment">器械</label>
                    <select
                      id="equipment"
                      value={equipment}
                      onChange={(e) => {
                        setEquipment(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">全部器械</option>
                      {[
                        "body only",
                        "dumbbell",
                        "barbell",
                        "cable",
                        "machine",
                        "bands",
                        "kettlebells",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="level">经验级别</label>
                    <select
                      id="level"
                      value={level}
                      onChange={(e) => {
                        setLevel(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">全部级别</option>
                      <option value="beginner">beginner · 新手</option>
                      <option value="intermediate">intermediate · 中级</option>
                      <option value="expert">expert · 高级</option>
                    </select>
                  </div>
                </>
              )}
              <Button type="submit" disabled={busy}>
                <Search size={16} />
                搜索
              </Button>
            </form>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {busy && (
            <p className="loading" role="status">
              正在读取资料…
            </p>
          )}
          {!busy && ["exercises", "foods"].includes(tab) && (
            <>
              <p className="note">
                共 {total} 条结果。原始资料主要为英文，提供常见中文关键词映射。
                {tab === "foods"
                  ? "所有营养值按每 100 g 可食部分；生熟请核对名称，缺失值显示“未提供”，不能当作 0。"
                  : "动作目录未经逐项医学审核，含不适合新手的动作；不会将整个目录直接用于自动方案。"}
              </p>
              <div className="catalog-grid">
                {items.map((item) =>
                  tab === "exercises"
                    ? (() => {
                        const e = item as Exercise;
                        return (
                          <article className="catalog-card" key={e.id}>
                            <span className="chip">
                              {e.level} · {e.equipment || "未标注器械"}
                            </span>
                            <h3>{e.name}</h3>
                            <p className="note">
                              {e.primaryMuscles.join(" / ")} · {e.category}
                            </p>
                            <details>
                              <summary>动作说明</summary>
                              <div className="detail-content">
                                <ol className="plan-safety">
                                  {e.instructions.map((x, i) => (
                                    <li key={i}>{x}</li>
                                  ))}
                                </ol>
                                <p className="note">
                                  原始文本，非康复处方。疼痛、损伤或健康风险时先专业评估。
                                </p>
                              </div>
                            </details>
                            <a
                              className="text-link"
                              href={`https://github.com/yuhonas/free-exercise-db/blob/main/exercises/${encodeURIComponent(e.id)}.json`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              查看原条目 <ArrowUpRight size={15} />
                            </a>
                          </article>
                        );
                      })()
                    : (() => {
                        const f = item as Food;
                        return (
                          <article className="catalog-card" key={f.id}>
                            <span className="chip">USDA · FDC {f.id}</span>
                            <h3>{f.name}</h3>
                            <p className="note">
                              {f.dataset} · {f.basis}
                            </p>
                            <div className="summary-grid">
                              {[
                                [f.kcal, "能量", "kcal"],
                                [f.protein_g, "蛋白质", "g"],
                                [f.carbs_g, "碳水", "g"],
                                [f.fat_g, "脂肪", "g"],
                                [f.fiber_g, "膳食纤维", "g"],
                                [f.sodium_mg, "钠", "mg"],
                                [f.water_g, "食物水分", "g"],
                              ].map(([n, l, u]) => (
                                <div key={l}>
                                  <span>{l}</span>
                                  {n === null ? "未提供" : `${n} ${u}`}
                                </div>
                              ))}
                            </div>
                            <a
                              className="text-link"
                              href={`https://fdc.nal.usda.gov/food-details/${f.id}/nutrients`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              查看 USDA 原记录 <ArrowUpRight size={15} />
                            </a>
                          </article>
                        );
                      })(),
                )}
              </div>
              {!items.length && (
                <div className="panel">
                  没有匹配条目，请更换关键词或清除筛选。
                </div>
              )}
              <div className="form-actions">
                <Button
                  variant="outline"
                  disabled={page === 1 || busy}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </Button>
                <span className="note">
                  第 {page} / {Math.max(1, Math.ceil(total / 20))} 页
                </span>
                <Button
                  variant="outline"
                  disabled={page * 20 >= total || busy}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </Button>
              </div>
            </>
          )}
          {tab === "rehabilitation" && !busy && (
            <>
              <div className="info-box">
                <ShieldCheck
                  size={15}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 7,
                  }}
                />
                这是专业资料的知识索引与独立简述，不能诊断、开处方或代替康复师。存在疼痛或危险信号时不自动生成常规计划。
              </div>
              {(items as Rehab[]).map((r) => (
                <article className="panel" key={r.id}>
                  <span className="chip">{r.category}</span>
                  <h2 style={{ marginTop: 12 }}>{r.title}</h2>
                  <p>{r.summary}</p>
                  <p className="note">{r.action}</p>
                  <div className="error">
                    <strong>需要及时医疗评估的信号</strong>
                    <p style={{ color: "inherit", marginBottom: 0 }}>
                      {r.red_flags.join("；")}
                    </p>
                  </div>
                  <div className="row">
                    {r.sources.map((id) => {
                      const s = meta?.sources.find((x) => x.id === id);
                      return s ? (
                        <a
                          key={id}
                          className="text-link"
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.name} ↗
                        </a>
                      ) : null;
                    })}
                  </div>
                </article>
              ))}
            </>
          )}
          {tab === "water" && (
            <section className="panel">
              <span className="eyebrow">
                TOTAL WATER ≠ EXTRA DRINKING WATER
              </span>
              <h2 style={{ marginTop: 15 }}>不是每个人都该喝同一个数字。</h2>
              <p>
                EFSA 的成人参考：女性约 2.0 L、男性约 2.5 L
                每日总水，包含食物、白水与其他饮料；适用于温和环境和适度活动。
              </p>
              <p>
                个人方案会说明示例菜单的食物水分、参考饮料部分与训练环境的不确定性。未确认无饮水限制、存在相关疾病或特殊情况时，不给固定数值。
              </p>
              <div className="info-box">
                训练和高温的额外需求取决于实际出汗与失水，不采用一个简单体重倍数作为人人适用处方，也不鼓励为了打卡而强迫大量饮水。
              </div>
              <SourceReference
                source={{
                  id: "efsa-water",
                  url: "https://www.efsa.europa.eu/en/efsajournal/pub/1459",
                }}
                label="阅读 EFSA 原始依据 ↗"
              />
              <Button asChild>
                <Link href="/assessment">
                  结合我的数据开始评估 <ArrowUpRight size={17} />
                </Link>
              </Button>
            </section>
          )}
          {tab === "sources" && (
            <>
              {meta?.sources.map((s) => (
                <article className="panel" key={s.id}>
                  <span className="chip">
                    {s.area} · 核对于 {s.reviewed}
                  </span>
                  <h3 style={{ marginTop: 14 }}>{s.name}</h3>
                  <p>{s.use}</p>
                  <p className="note">授权与使用边界：{s.license}</p>
                  <SourceReference source={s} />
                </article>
              ))}
              <p className="note">
                不声称覆盖全球所有资料；收录不代表原机构背书。本次导入版本与源文件摘要保存在项目
                manifest.json。
              </p>
            </>
          )}
        </>
      )}
    </main>
  );
}
