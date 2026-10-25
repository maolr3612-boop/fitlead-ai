"use client";
import { useEffect, useState } from "react";
import Link from "@/components/site-link";
import { ArrowUpRight, LockKeyhole, Download, LogOut } from "lucide-react";
import { api, ONLINE, ensureVisitor, clearAccess, planPath } from "@/lib/api";
import { Button } from "@/components/ui/button";
type Checkin = {
  day: string;
  weight: number | null;
  water_ml: number;
  sleep_hours: number;
  exercise_minutes: number;
  notes: string;
};
type AccountData = {
  account: { id: string; username: string };
  plans: { id: string; goal: string; created_at: string; calories: number }[];
  checkins: Checkin[];
};
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob(
      [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
      { type: "text/plain;charset=utf-8" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export default function Account() {
  const [data, setData] = useState<AccountData | null>(null),
    [mode, setMode] = useState("login"),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [recovery, setRecovery] = useState(""),
    [code, setCode] = useState(""),
    [consent, setConsent] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [confirmDelete, setConfirmDelete] = useState(false),
    [confirmPassword, setConfirmPassword] = useState("");
  const [record, setRecord] = useState<Checkin>({
    day: today(),
    weight: null,
    water_ml: 0,
    sleep_hours: 7,
    exercise_minutes: 0,
    notes: "",
  });
  async function load() {
    const r = await api<AccountData>("/account");
    setData(r);
    return r;
  }
  useEffect(() => {
    if (!ONLINE) {
      setLoading(false);
      return;
    }
    load()
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);
  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (mode === "register") {
        if (!consent) throw new Error("请先同意账号与健康数据处理说明");
        await ensureVisitor();
      }
      const result = await api(
        `/auth/${mode}`,
        mode === "register"
          ? { username, password, consent: true }
          : mode === "recover"
            ? { username, password, recovery_code: recovery }
            : { username, password },
      );
      setCode(result.recovery_code || "");
      setPassword("");
      setRecovery("");
      await load();
      setMessage(
        mode === "register"
          ? "账号已创建，当前匿名方案已保存到此账号。"
          : "已安全登录，可查看个人历史与记录。",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    try {
      await api("/auth/logout", {});
      setData(null);
      setCode("");
      clearAccess();
      setMessage("已退出账号，本标签页的访问令牌已清除。");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await api("/account/checkins", record);
      await load();
      setMessage("今日记录已保存到账号；同一天再次提交会更新。");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    setBusy(true);
    try {
      download(await api("/account/export"), "FitLead-我的账号数据.json");
      setMessage("已发起数据导出，请查看浏览器下载列表。");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount() {
    setBusy(true);
    setError("");
    try {
      await api("/me", { password: confirmPassword }, "DELETE");
      setData(null);
      setCode("");
      setConfirmDelete(false);
      setConfirmPassword("");
      localStorage.removeItem("fl_plan");
      setMessage("账号和关联个人数据已永久删除。");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-shell">
      <span className="eyebrow">YOUR HEALTH. YOUR PRIVATE SPACE.</span>
      <h1 className="page-title">让每一次进步，有迹可循。</h1>
      <p className="lead-text">
        账号关联你的评估、方案与每日记录。健康数据加密保存，资料库不要求注册。
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {!ONLINE ? (
        <div className="panel">
          <p>
            当前本地 V1 尚未配置在线账号 API。请连接在线服务后使用账号功能。
          </p>
        </div>
      ) : loading ? (
        <p className="loading">正在检查账号状态…</p>
      ) : !data ? (
        <section className="panel account-auth">
          <div className="review-icon">
            <LockKeyhole />
          </div>
          <div className="tabs" role="tablist" aria-label="账号操作">
            {[
              ["login", "登录账号"],
              ["register", "注册账号"],
              ["recover", "恢复账号"],
            ].map(([k, l]) => (
              <button
                role="tab"
                aria-selected={mode === k}
                className={mode === k ? "active" : ""}
                key={k}
                onClick={() => {
                  setMode(k);
                  setError("");
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <form onSubmit={authenticate}>
            <div className="field">
              <label htmlFor="account-name">账号名称</label>
              <input
                id="account-name"
                autoComplete="username"
                value={username}
                maxLength={32}
                pattern="[a-z0-9_]{3,32}"
                required
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
              />
              <small>
                3–32 位小写字母、数字或下划线，不需要提交身份证或真实姓名。
              </small>
            </div>
            {mode === "recover" && (
              <div className="field">
                <label htmlFor="recovery-code">离线恢复码</label>
                <input
                  id="recovery-code"
                  value={recovery}
                  onChange={(e) => setRecovery(e.target.value)}
                  minLength={20}
                  maxLength={100}
                  required
                  autoComplete="off"
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="account-password">
                {mode === "recover" ? "新密码" : "密码"}
              </label>
              <input
                id="account-password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                minLength={mode === "login" ? 1 : 12}
                maxLength={128}
                required
                onChange={(e) => setPassword(e.target.value)}
              />
              <small>注册或恢复时至少 12 位；请使用独立的强密码。</small>
            </div>
            {mode === "register" && (
              <label className="check-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  我已阅读
                  <Link href="/privacy" target="_blank">
                    隐私说明
                  </Link>
                  ，同意将当前评估、方案和主动填写的健康记录关联此账号，用于个人查看、导出和删除，不包含营销联系授权。
                </span>
              </label>
            )}
            <div className="form-actions">
              <span className="note">不自动订阅，不收取注册费用</span>
              <Button type="submit" disabled={busy}>
                {busy
                  ? "处理中…"
                  : mode === "register"
                    ? "创建我的账号"
                    : mode === "recover"
                      ? "使用恢复码重置"
                      : "登录"}{" "}
                <ArrowUpRight size={16} />
              </Button>
            </div>
          </form>
          <p className="note" style={{ marginTop: 17 }}>
            会话仅保存在当前标签页，关闭后可重新登录。注册会归入当前匿名方案；登录已有账号不会自动合并其他匿名身份。没有邮箱或短信验证服务，恢复依赖首次展示的离线恢复码。
          </p>
        </section>
      ) : (
        <>
          <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <span className="eyebrow">MY ACCOUNT</span>
                <h2 style={{ margin: "8px 0" }}>
                  你好，{data.account.username}
                </h2>
                <p className="note">
                  {data.plans.length} 份已保存方案 · {data.checkins.length}{" "}
                  天健康记录
                </p>
              </div>
              <div className="row">
                <Button variant="outline" disabled={busy} onClick={exportData}>
                  <Download size={16} />
                  导出账号数据
                </Button>
                <Button variant="ghost" onClick={signOut} disabled={busy}>
                  <LogOut size={15} />
                  退出账号
                </Button>
              </div>
            </div>
          </div>
          {code && (
            <section className="panel">
              <h3>请保存这次的离线恢复码</h3>
              <p className="note">
                仅本次显示。拥有此码的人可以重置账号密码。保存到自己的密码管理器，不要发给他人。每次恢复后旧码失效。
              </p>
              <code className="recovery-code">{code}</code>
              <div className="row" style={{ marginTop: 16 }}>
                <Button
                  variant="outline"
                  onClick={() =>
                    download(
                      `FitLead 账号：${data.account.username}\n恢复码：${code}\n请离线保管，不要分享。`,
                      "FitLead-离线恢复码.txt",
                    )
                  }
                >
                  下载恢复码
                </Button>
                <Button variant="ghost" onClick={() => setCode("")}>
                  我已保存，隐藏恢复码
                </Button>
              </div>
            </section>
          )}
          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">MY PLANS</span>
                <h2 style={{ fontSize: 24 }}>我的历史方案</h2>
              </div>
              <Button asChild>
                <Link href="/assessment">
                  创建新的评估 <ArrowUpRight size={16} />
                </Link>
              </Button>
            </div>
            {data.plans.length ? (
              data.plans.map((p) => (
                <Link className="history-row" key={p.id} href={planPath(p.id)}>
                  <span>
                    <strong>{p.goal}</strong>
                    <small>
                      {new Date(p.created_at).toLocaleString("zh-CN", {
                        timeZone: "Asia/Shanghai",
                      })}{" "}
                      · {p.calories} kcal / 日参考
                    </small>
                  </span>
                  <ArrowUpRight size={18} />
                </Link>
              ))
            ) : (
              <p className="note">
                还没有保存的方案。完成一次评估后会自动出现在这里。
              </p>
            )}
          </section>
          <section className="panel">
            <h2>记录今天，观察趋势。</h2>
            <p className="note">
              以下是实际发生的记录，不是网站规定的目标。饮水量只填饮料部分，不重复加入食物水分。相同日期会更新记录。
            </p>
            <form onSubmit={save}>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="record-day">日期（北京时间）</label>
                  <input
                    id="record-day"
                    type="date"
                    value={record.day}
                    max={today()}
                    required
                    onChange={(e) =>
                      setRecord({ ...record, day: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="record-weight">实际体重（可选，kg）</label>
                  <input
                    id="record-weight"
                    type="number"
                    min={35}
                    max={250}
                    step="0.1"
                    value={record.weight ?? ""}
                    onChange={(e) =>
                      setRecord({
                        ...record,
                        weight:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="record-water">饮料总量（mL）</label>
                  <input
                    id="record-water"
                    type="number"
                    min={0}
                    max={10000}
                    step={1}
                    value={record.water_ml}
                    onChange={(e) =>
                      setRecord({ ...record, water_ml: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="record-sleep">睡眠（小时）</label>
                  <input
                    id="record-sleep"
                    type="number"
                    min={0}
                    max={16}
                    step="0.5"
                    value={record.sleep_hours}
                    onChange={(e) =>
                      setRecord({
                        ...record,
                        sleep_hours: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="record-exercise">训练或运动（分钟）</label>
                  <input
                    id="record-exercise"
                    type="number"
                    min={0}
                    max={300}
                    value={record.exercise_minutes}
                    onChange={(e) =>
                      setRecord({
                        ...record,
                        exercise_minutes: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="record-notes">感受与备注（可选）</label>
                <textarea
                  id="record-notes"
                  maxLength={500}
                  value={record.notes}
                  onChange={(e) =>
                    setRecord({ ...record, notes: e.target.value })
                  }
                />
              </div>
              <Button type="submit" disabled={busy}>
                保存健康记录
              </Button>
            </form>
            {data.checkins.length > 0 && (
              <div style={{ marginTop: 22 }}>
                {data.checkins.slice(0, 14).map((r) => (
                  <div className="history-row" key={r.day}>
                    <span>
                      <strong>{r.day}</strong>
                      <small>
                        {r.weight ?? "未填"} kg · 饮料 {r.water_ml} mL · 睡眠{" "}
                        {r.sleep_hours} h · 运动 {r.exercise_minutes} min
                      </small>
                      {r.notes && <small>{r.notes}</small>}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setRecord(r);
                        setMessage("已载入该日记录，修改后保存即可更新。");
                      }}
                    >
                      修改
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="panel">
            <h3>账号与数据控制</h3>
            <p className="note">
              删除会移除账号、方案、评估、记录和已授权咨询，不能恢复。已下载的本地文件由你自行管理。
            </p>
            <Button
              variant="outline"
              className="danger"
              onClick={() => setConfirmDelete(true)}
            >
              删除我的账号和数据
            </Button>
            {confirmDelete && (
              <div className="error">
                <p style={{ color: "inherit" }}>
                  确认永久删除？请用当前密码再次确认。
                </p>
                <div className="field">
                  <label htmlFor="delete-password">当前密码</label>
                  <input
                    id="delete-password"
                    type="password"
                    autoComplete="current-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="row">
                  <Button
                    className="danger"
                    variant="outline"
                    disabled={busy || !confirmPassword}
                    onClick={deleteAccount}
                  >
                    确认永久删除账号
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmDelete(false)}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

