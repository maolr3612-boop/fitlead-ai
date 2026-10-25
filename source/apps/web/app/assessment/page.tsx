"use client";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/site-link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ArrowLeft, ShieldCheck, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  api,
  ensureVisitor,
  goals,
  ONLINE,
  pageUrl,
  planPath,
} from "@/lib/api";
const riskLabels: Record<string, string> = {
  minor: "是否未满 18 岁？",
  pregnancy: "是否怀孕或处于产后恢复期？",
  disease: "是否存在需要专业管理的疾病？",
  pain: "是否有持续疼痛或近期受伤？",
  contraindication: "是否存在运动相关禁忌？",
  eating_disorder: "是否存在饮食失调相关风险？",
};
const schema = z.object({
  goal: z.enum(["fat_loss", "muscle", "posture", "fitness"]),
  age: z.number().int().min(1, "请输入 1–100 岁之间的年龄").max(100),
  height: z.number().min(120, "身高需在 120–230 cm").max(230),
  weight: z.number().min(35, "体重需在 35–250 kg").max(250),
  sex: z.enum(["unspecified", "male", "female"]),
  target_weight: z.number().min(35).max(250).nullable(),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  days: z.number().min(1).max(5),
  minutes: z.number().min(20).max(90),
  location: z.enum(["home", "gym"]),
  equipment: z.array(z.enum(["bodyweight", "dumbbell", "band", "machines"])),
  meals: z.number().min(2).max(5),
  preference: z.enum(["balanced", "vegetarian"]),
  allergies: z.array(
    z.enum([
      "peanut",
      "milk",
      "egg",
      "soy",
      "fish",
      "shellfish",
      "wheat",
      "nuts",
    ]),
  ),
  restrictions: z.string().max(300),
  takeaway: z.boolean(),
  budget: z.enum(["low", "medium", "high"]),
  risks: z.object({
    minor: z.enum(["yes", "no", "unknown"]),
    pregnancy: z.enum(["yes", "no", "unknown"]),
    disease: z.enum(["yes", "no", "unknown"]),
    pain: z.enum(["yes", "no", "unknown"]),
    contraindication: z.enum(["yes", "no", "unknown"]),
    eating_disorder: z.enum(["yes", "no", "unknown"]),
  }),
  consent: z.boolean().refine((v) => v, "提交前需同意必要的数据处理"),
  waist: z.number().min(40).max(200).nullable(),
  sleep_hours: z.number().min(0).max(16),
  fluid_restriction: z.enum(["yes", "no", "unknown"]),
  climate: z.enum(["mild", "hot"]),
  red_flags: z.boolean(),
});
type Values = z.infer<typeof schema>;
const initial: Values = {
  goal: "fat_loss",
  age: 28,
  height: 170,
  weight: 70,
  sex: "unspecified",
  target_weight: null,
  experience: "beginner",
  days: 3,
  minutes: 40,
  location: "gym",
  equipment: ["bodyweight", "machines"],
  meals: 3,
  preference: "balanced",
  allergies: [],
  restrictions: "",
  takeaway: false,
  budget: "medium",
  risks: {
    minor: "unknown",
    pregnancy: "unknown",
    disease: "unknown",
    pain: "unknown",
    contraindication: "unknown",
    eating_disorder: "unknown",
  },
  consent: false,
  waist: null,
  sleep_hours: 7,
  fluid_restriction: "unknown",
  climate: "mild",
  red_flags: false,
};
const stepNames = [
  "你的目标",
  "身体数据",
  "训练条件",
  "饮食习惯",
  "风险筛查",
  "确认提交",
];
const stepFields: (keyof Values)[][] = [
  ["goal"],
  ["age", "height", "weight", "sex", "target_weight", "waist", "sleep_hours"],
  ["experience", "days", "minutes", "location", "equipment"],
  ["meals", "preference", "allergies", "restrictions", "takeaway", "budget"],
  ["risks", "fluid_restriction", "red_flags"],
  ["consent"],
];
export default function Assessment() {
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [review, setReview] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const key = useRef("");
  const {
    register,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });
  const v = watch();
  useEffect(() => {
    key.current = crypto.randomUUID();
    const goal = new URLSearchParams(location.search).get("goal");
    if (goal && goal in goals) setValue("goal", goal as Values["goal"]);
    ensureVisitor()
      .then(() => api("/events", { name: "assessment_started" }))
      .catch((e) => setError(e.message));
  }, [setValue]);
  function move(n: number) {
    setStep(n);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function next() {
    if (await trigger(stepFields[step])) move(step + 1);
    else setError("请检查本步骤的输入范围。");
  }
  async function submit() {
    setError("");
    if (!(await trigger())) {
      setError("请检查填写信息，并勾选必要的数据处理同意。");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await ensureVisitor();
      const values = getValues();
      const {
        waist,
        sleep_hours,
        fluid_restriction,
        climate,
        red_flags,
        ...legacy
      } = values;
      const a = await api<{ id: string; risk: string; urgent?: boolean }>(
        "/assessments",
        {
          ...(ONLINE ? values : legacy),
          request_key: key.current,
        },
      );
      if (a.risk === "review") {
        setUrgent(Boolean(a.urgent));
        setReview(true);
        window.scrollTo(0, 0);
        return;
      }
      const p = await api<{ id: string }>("/plans/generate", {
        assessment_id: a.id,
      });
      localStorage.setItem("fl_plan", p.id);
      location.assign(pageUrl(planPath(p.id)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const numberField = (
    name: "age" | "height" | "weight",
    label: string,
    min: number,
    max: number,
    unit: string,
  ) => (
    <div className="field">
      <label htmlFor={name}>
        {label} <span className="note">({unit})</span>
      </label>
      <input
        id={name}
        type="number"
        min={min}
        max={max}
        step={name === "age" ? 1 : 0.1}
        {...register(name, { valueAsNumber: true })}
      />
      {errors[name] && (
        <span className="field-error">
          {errors[name]?.message || `请输入 ${min}–${max} 之间的数字`}
        </span>
      )}
    </div>
  );
  if (review)
    return (
      <main className="page-shell narrow">
        <div className="panel">
          <div className="review-icon">
            <ShieldCheck />
          </div>
          <span className="eyebrow">SAFETY COMES FIRST</span>
          <h1 className="page-title">
            {urgent ? "请先及时寻求医疗评估。" : "先确认安全，再开始训练。"}
          </h1>
          <p>
            根据风险筛查、年龄、身体数据或尚未确认的饮食限制，你需要进一步的专业评估。系统没有生成常规训练或减脂方案。
          </p>
          <div className="info-box">
            {urgent
              ? "你报告了可能需要紧急医疗处理的危险信号。请停止训练，及时前往当地急诊或联系当地急救服务；不要等待网站方案或私教咨询。"
              : "持续疼痛、近期受伤或健康风险请先咨询医生或合格专业人员。不要通过修改真实答案绕过筛查。"}
          </div>
          <div className="row">
            {!urgent && (
              <Button asChild>
                <Link href="/consultation">
                  申请真人咨询 <ArrowRight size={17} />
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setReview(false);
                move(4);
                key.current = crypto.randomUUID();
              }}
            >
              核对我的填写
            </Button>
          </div>
          <p className="note" style={{ marginTop: 20 }}>
            评估数据已保存；尚未授权销售联系。咨询需另外填写联系方式并主动授权。
          </p>
        </div>
      </main>
    );
  return (
    <main className="page-shell narrow">
      <span className="eyebrow">YOUR PERSONAL STARTING POINT</span>
      <h1 className="page-title">从了解你开始。</h1>
      <p className="lead-text">
        每个起点都值得认真对待。完成六步评估，找到适合你的训练与饮食节奏。
      </p>
      <div className="progress-meta">
        <span>健身起步评估</span>
        <span>0{step + 1} / 06</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="评估进度"
        aria-valuenow={step + 1}
        aria-valuemin={0}
        aria-valuemax={6}
      >
        <div style={{ width: `${((step + 1) / 6) * 100}%` }} />
      </div>
      <div className="step-nav">
        {stepNames.map((s, i) => (
          <span key={s} className={i === step ? "current" : ""}>
            {i + 1}. {s}
            {i < 5 ? " /" : ""}
          </span>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 5) submit();
          else next();
        }}
        noValidate
      >
        <div className="panel">
          <span className="eyebrow">STEP 0{step + 1}</span>
          <h2 style={{ marginTop: 10 }}>
            {
              [
                "你最想实现什么？",
                "你的身体起点",
                "把训练放进你的生活",
                "找到可以坚持的饮食方式",
                "安全，是所有计划的前提",
                "确认你的起步信息",
              ][step]
            }
          </h2>
          {step === 0 && (
            <>
              <p className="note">
                选择当前最主要的目标。我们会以可持续的习惯为起点。
              </p>
              <div className="choice-grid">
                {Object.entries(goals).map(([key, label]) => (
                  <label className="choice" key={key}>
                    <input type="radio" value={key} {...register("goal")} />
                    {label}
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <p className="note">
                仅用于方案估算，不作医疗判断。支持成年人自动规划；其他情况转人工评估。
              </p>
              <div className="field-grid">
                {numberField("age", "年龄", 1, 100, "岁")}
                {numberField("height", "身高", 120, 230, "cm")}
                {numberField("weight", "体重", 35, 250, "kg")}
                <div className="field">
                  <label htmlFor="target_weight">目标体重（可选，kg）</label>
                  <input
                    id="target_weight"
                    type="number"
                    min={35}
                    max={250}
                    step="0.1"
                    {...register("target_weight", {
                      setValueAs: (x) =>
                        x == null || x === "" ? null : Number(x),
                    })}
                  />
                  {errors.target_weight && (
                    <span className="field-error">目标体重需在 35–250 kg</span>
                  )}
                </div>
              </div>
              <div className="field">
                <label htmlFor="sex">能量估算参数（可不提供）</label>
                <select id="sex" {...register("sex")}>
                  <option value="unspecified">不提供 · 使用系数中点估算</option>
                  <option value="female">女性相关计算参数</option>
                  <option value="male">男性相关计算参数</option>
                </select>
                <small>计算参数不代表性别认同，估算本身存在误差。</small>
              </div>
              {ONLINE && (
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="waist">腰围（可选，cm）</label>
                    <input
                      id="waist"
                      type="number"
                      min={40}
                      max={200}
                      step="0.1"
                      {...register("waist", {
                        setValueAs: (x) =>
                          x == null || x === "" ? null : Number(x),
                      })}
                    />
                    <small>用于保存身体数据，不据此诊断健康。</small>
                    {errors.waist && (
                      <span className="field-error">
                        腰围需在 40–200 cm 之间
                      </span>
                    )}
                  </div>
                  <div className="field">
                    <label htmlFor="sleep_hours">通常睡眠时长（小时）</label>
                    <input
                      id="sleep_hours"
                      type="number"
                      min={0}
                      max={16}
                      step="0.5"
                      {...register("sleep_hours", { valueAsNumber: true })}
                    />
                    {errors.sleep_hours && (
                      <span className="field-error">请输入 0–16 小时</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <div className="field">
                <label htmlFor="experience">训练经验</label>
                <select id="experience" {...register("experience")}>
                  <option value="beginner">新手 · 尚未规律训练</option>
                  <option value="intermediate">
                    有一定经验 · 规律训练半年以上
                  </option>
                  <option value="advanced">
                    有较多经验 · 稳定训练两年以上
                  </option>
                </select>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="days">每周训练天数</label>
                  <select
                    id="days"
                    {...register("days", { valueAsNumber: true })}
                  >
                    {[1, 2, 3, 4, 5].map((x) => (
                      <option value={x} key={x}>
                        {x} 天
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="minutes">单次可用时间</label>
                  <select
                    id="minutes"
                    {...register("minutes", { valueAsNumber: true })}
                  >
                    {[20, 30, 40, 60, 90].map((x) => (
                      <option value={x} key={x}>
                        {x} 分钟
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="location">训练地点</label>
                <select
                  id="location"
                  {...register("location")}
                  onChange={(e) => {
                    setValue("location", e.target.value as Values["location"]);
                    if (e.target.value === "home")
                      setValue(
                        "equipment",
                        v.equipment.filter((x) => x !== "machines"),
                      );
                  }}
                >
                  <option value="gym">健身房</option>
                  <option value="home">居家</option>
                </select>
              </div>
              <p className="note">选择实际可用器械（不选也可按自重训练）：</p>
              <div className="checklist">
                {[
                  ["bodyweight", "自重 / 无器械"],
                  ["dumbbell", "哑铃"],
                  ["band", "弹力带"],
                  ["machines", "健身房器械"],
                ]
                  .filter(([k]) => k !== "machines" || v.location === "gym")
                  .map(([k, l]) => (
                    <label key={k}>
                      <input
                        type="checkbox"
                        value={k}
                        {...register("equipment")}
                      />
                      {l}
                    </label>
                  ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="meals">每天通常吃几餐？</label>
                  <select
                    id="meals"
                    {...register("meals", { valueAsNumber: true })}
                  >
                    {[2, 3, 4, 5].map((x) => (
                      <option value={x} key={x}>
                        {x} 餐
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="preference">食物偏好</label>
                  <select id="preference" {...register("preference")}>
                    <option value="balanced">均衡饮食</option>
                    <option value="vegetarian">植物性饮食</option>
                  </select>
                </div>
              </div>
              <p className="note">已知食物过敏（多选）：</p>
              <div className="checklist">
                {[
                  ["peanut", "花生"],
                  ["milk", "乳制品"],
                  ["egg", "鸡蛋"],
                  ["soy", "大豆"],
                  ["fish", "鱼类"],
                  ["shellfish", "虾蟹贝类"],
                  ["wheat", "小麦"],
                  ["nuts", "树坚果"],
                ].map(([k, l]) => (
                  <label key={k}>
                    <input
                      type="checkbox"
                      value={k}
                      {...register("allergies")}
                    />
                    {l}
                  </label>
                ))}
              </div>
              <div className="field">
                <label htmlFor="restrictions">
                  其他过敏、饮食禁忌或需要说明的情况（可选）
                </label>
                <textarea
                  id="restrictions"
                  placeholder="有未列出的过敏或限制，请在此说明。"
                  maxLength={300}
                  {...register("restrictions")}
                />
                <small>
                  自由填写的限制需要人工确认，系统不会猜测后生成配餐。
                </small>
              </div>
              <div className="field">
                <label htmlFor="budget">可接受的每日饮食预算</label>
                <select id="budget" {...register("budget")}>
                  <option value="low">经济 · 约 30 元以内</option>
                  <option value="medium">适中 · 约 30–60 元</option>
                  <option value="high">灵活 · 约 60 元以上</option>
                </select>
              </div>
              <label className="check-consent">
                <input type="checkbox" {...register("takeaway")} />
                我经常吃外卖
              </label>
            </>
          )}
          {step === 4 && (
            <>
              <p className="note">
                请如实回答。不确定时请选择“不确定”，我们会建议人工评估。
              </p>
              {Object.entries(riskLabels).map(([k, label]) => (
                <div className="risk-row" key={k}>
                  <span>{label}</span>
                  <select
                    aria-label={label}
                    {...register(`risks.${k}` as `risks.minor`)}
                  >
                    <option value="unknown">不确定</option>
                    <option value="no">否</option>
                    <option value="yes">是</option>
                  </select>
                </div>
              ))}
              {ONLINE && (
                <>
                  <div className="risk-row">
                    <label htmlFor="fluid_restriction">
                      是否有医嘱限水、肾心疾病或不明确的饮水限制？
                    </label>
                    <select
                      id="fluid_restriction"
                      {...register("fluid_restriction")}
                    >
                      <option value="unknown">不确定</option>
                      <option value="no">已确认没有</option>
                      <option value="yes">有</option>
                    </select>
                  </div>
                  <div className="field" style={{ marginTop: 18 }}>
                    <label htmlFor="climate">通常训练环境</label>
                    <select id="climate" {...register("climate")}>
                      <option value="mild">温和 / 室内</option>
                      <option value="hot">炎热 / 大量出汗</option>
                    </select>
                  </div>
                  <label className="check-consent">
                    <input type="checkbox" {...register("red_flags")} />
                    <span>
                      有胸痛、晕厥、严重呼吸困难，或新发会阴麻木、大小便控制异常等危险信号
                    </span>
                  </label>
                  <p className="note">
                    若存在上述急性危险信号，请停止运动并及时寻求当地急诊帮助，不等待网站出方案。
                  </p>
                </>
              )}
              <div className="info-box">
                任何“是”或“不确定”，或不适合自动规划的身体数据，都将停止常规方案生成。
              </div>
            </>
          )}
          {step === 5 && (
            <>
              <div className="summary-grid">
                {[
                  ["主要目标", goals[v.goal]],
                  ["基础数据", `${v.age} 岁 · ${v.height} cm · ${v.weight} kg`],
                  [
                    "目标体重",
                    v.target_weight ? `${v.target_weight} kg` : "未设置",
                  ],
                  [
                    "训练经验",
                    {
                      beginner: "新手",
                      intermediate: "有一定经验",
                      advanced: "较多经验",
                    }[v.experience],
                  ],
                  [
                    "训练条件",
                    `${v.location === "gym" ? "健身房" : "居家"} · 每周 ${v.days} 天 · 每次 ${v.minutes} 分钟`,
                  ],
                  ["可用器械", v.equipment.join(" / ") || "自重"],
                  [
                    "饮食习惯",
                    `每天 ${v.meals} 餐 · ${v.preference === "vegetarian" ? "植物性" : "均衡饮食"}`,
                  ],
                  [
                    "过敏与禁忌",
                    `${v.allergies.join(" / ") || "未选择常见过敏原"} ${v.restrictions}`,
                  ],
                  [
                    "预算与外卖",
                    `${v.budget === "low" ? "经济" : v.budget === "high" ? "灵活" : "适中"} · ${v.takeaway ? "经常外卖" : "不经常外卖"}`,
                  ],
                  [
                    "风险筛查",
                    Object.values(v.risks).every((x) => x === "no")
                      ? "六项均为否"
                      : "存在是或不确定，将建议人工评估",
                  ],
                ].map(([l, t]) => (
                  <div key={l}>
                    <span>{l}</span>
                    {t}
                  </div>
                ))}
              </div>
              <p className="note" style={{ marginTop: 17 }}>
                如需修改，请使用上一步。数据用于安全筛查、规则计算和本浏览器内的方案保存。
              </p>
              <label className="check-consent">
                <input type="checkbox" {...register("consent")} />
                <span>
                  我已阅读
                  <Link href="/privacy" target="_blank" rel="noreferrer">
                    隐私说明（新窗口）
                  </Link>
                  ，同意处理本次评估所需的身体、饮食与风险信息。此同意不包含营销或销售联系授权。
                  {ONLINE &&
                    "在线版数据会加密保存于 Cloudflare 境外云服务；你可导出或删除。"}
                </span>
              </label>
              {errors.consent && (
                <p className="field-error">{errors.consent.message}</p>
              )}
              <div className="info-box">
                {ONLINE
                  ? "当前生成在线规则方案：服务端计算训练、USDA 食材营养与饮水参考，加密保存后可关联账号。"
                  : "当前生成“演示方案”：由可验证规则引擎计算。"}
                未调用生成式 AI。方案仅作健身起步参考。
              </div>
            </>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                step === 0 ? location.assign(pageUrl("/")) : move(step - 1)
              }
              disabled={busy}
            >
              <ArrowLeft size={15} />
              {step === 0 ? "返回首页" : "上一步"}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle size={16} />
                  正在安全检查…
                </>
              ) : step === 5 ? (
                <>
                  {ONLINE ? "提交并生成方案" : "提交并生成演示方案"}{" "}
                  <ArrowRight size={17} />
                </>
              ) : (
                <>
                  下一步 <ArrowRight size={17} />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
      <p className="note">
        <ShieldCheck
          size={13}
          style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }}
        />
        未填写联系方式并授权前，你不会成为可联系的销售线索。请勿在公共设备上保存个人方案。
      </p>
    </main>
  );
}

