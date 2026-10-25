"use client";
import { useState } from "react";
import { api, resetVisitor, ONLINE, pageUrl } from "@/lib/api";
import Link from "@/components/site-link";
import { Button } from "@/components/ui/button";
export default function Privacy() {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  async function perform(all: boolean) {
    setError("");
    setBusy(true);
    try {
      if (ONLINE && all) {
        let signedIn = false;
        try {
          await api("/account");
          signedIn = true;
        } catch {}
        if (signedIn) {
          location.assign(pageUrl("/account"));
          return;
        }
      }
      const r = await api(all ? "/me" : "/me/consent", undefined, "DELETE");
      setMessage(r.message);
      if (all) {
        resetVisitor();
        localStorage.removeItem("fl_plan");
        sessionStorage.removeItem("fl_source");
        sessionStorage.removeItem("fl_campaign");
        setConfirm(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-shell narrow">
      <span className="eyebrow">YOUR DATA. YOUR CONTROL.</span>
      <h1 className="page-title">隐私与数据管理</h1>
      <p className="lead-text">你的评估信息与联系授权，应该始终由你掌控。</p>
      <section className="panel">
        <h2>我们收集哪些信息？</h2>
        <p>
          经你同意后，保存身体数据、训练条件、饮食限制与风险答案，用于安全筛查和生成演示方案。另记录来源渠道、访问和评估事件，用于汇总转化统计。事件不包含联系方式或问卷答案。
        </p>
        <h3>联系方式单独授权</h3>
        <p>
          匿名评估不会自动生成可联系的销售线索。只有主动提交咨询并明确同意联系时，才保存加密联系方式，供已认证管理员处理咨询。
        </p>
        <h3>如何访问与保存？</h3>
        <p>
          {ONLINE
            ? "在线版使用当前标签页的随机访问令牌，服务端会话最长 7 天。关闭标签页后可用账号重新登录。未注册的匿名身份无法跨设备恢复。注册会将当前匿名方案归入新账号，其他账号登录不自动合并匿名数据。"
            : "匿名身份使用本浏览器的 HttpOnly 随机令牌 Cookie，最长 90 天。方案只允许对应令牌读取；清除 Cookie、换浏览器或令牌失效后，无法恢复匿名方案。不要在公共设备保存。"}
          {/* 本地 V1 与在线服务采用独立身份存储。 */}
        </p>
        <h3>保存期限与演示模式</h3>
        <p>
          {ONLINE
            ? "在线数据由 Cloudflare Workers 与独立 D1 数据库处理。评估、方案、联系方式与健康记录使用服务端密钥加密保存；密码采用独立盐的 PBKDF2 哈希，不存明文。数据涉及境外云服务，请在同意后填写。账号数据保留直到你主动删除或运营方按政策清理，尚未启用自动健康数据到期删除。没有邮箱/短信验证，账号恢复依赖注册时展示的离线恢复码。"
            : "V1 数据保存在本地数据库中，直到你主动删除或运营方清理；尚无自动到期清理任务。"}{" "}
          未向 OpenAI 发送问卷、联系方式或健康信息；本版本未启用生成式 AI。
        </p>
        <h3>服务边界</h3>
        <p>
          本产品不是医疗服务，不诊断疾病、损伤或饮食失调。风险不明确时停止自动规划。方案仅作一般健身信息与饮食份量示例，不能保证训练、体重或商业转化结果。
        </p>
      </section>
      <section className="panel">
        <h2>管理本浏览器的数据</h2>
        <p className="note">
          撤回联系授权会删除联系方式、预约和后台备注。删除全部数据会一并删除评估、方案、事件和匿名身份，无法恢复。
        </p>
        <div className="row">
          {ONLINE && (
            <Button asChild variant="outline">
              <Link href="/account">管理账号、导出和删除数据</Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => perform(false)}
            disabled={busy}
          >
            撤回联系授权
          </Button>
          <Button
            variant="outline"
            className="danger"
            onClick={() => setConfirm(true)}
            disabled={busy}
          >
            删除我的全部数据
          </Button>
        </div>
        {confirm && (
          <div className="error">
            <p style={{ color: "inherit" }}>
              确认永久删除本浏览器关联的所有个人数据？此操作无法撤销。
            </p>
            <div className="row">
              <Button
                className="danger"
                variant="outline"
                disabled={busy}
                onClick={() => perform(true)}
              >
                确认永久删除
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                取消
              </Button>
            </div>
          </div>
        )}
        {message && (
          <div className="success" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
      </section>
    </main>
  );
}

