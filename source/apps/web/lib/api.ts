export const ONLINE = Boolean(process.env.NEXT_PUBLIC_API_URL);
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const tokenKey = "fitlead_access_v2" + BASE_PATH;
export function accessToken() {
  return typeof window !== "undefined"
    ? sessionStorage.getItem(tokenKey) || ""
    : "";
}
export function clearAccess() {
  sessionStorage.removeItem(tokenKey);
  pending = null;
}
export function pageUrl(path: string) {
  return BASE_PATH + path;
}
export function planPath(id: string) {
  return process.env.NEXT_PUBLIC_STATIC_EXPORT === "1"
    ? `/plan/demo/?id=${encodeURIComponent(id)}`
    : `/plan/${id}`;
}
export async function api<T = any>(
  path: string,
  data?: unknown,
  method?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1${path}`,
      {
        method: method || (data ? "POST" : "GET"),
        credentials: ONLINE ? "omit" : "include",
        headers: {
          "Content-Type": "application/json",
          ...(ONLINE && accessToken()
            ? { Authorization: `Bearer ${accessToken()}` }
            : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
        signal: AbortSignal.timeout(20000),
      },
    );
  } catch {
    throw new Error(
      "网络连接超时或中断，请稍后重试；已保存的数据不会因重试重复创建。",
    );
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("服务连接失败，请确认后端已启动后重试。");
  }
  if (!response.ok || !body.ok)
    throw new Error(body.error?.message || "操作失败，请重试");
  if (ONLINE && body.data?.access_token) {
    sessionStorage.setItem(tokenKey, body.data.access_token);
    pending = null;
  }
  if (ONLINE && (body.data?.deleted || body.data?.signed_out)) clearAccess();
  return body.data;
}
let pending: Promise<any> | null = null;
export function ensureVisitor() {
  if (!pending) {
    const p = new URLSearchParams(location.search);
    const source =
      p.get("source") || sessionStorage.getItem("fl_source") || "direct";
    const campaign =
      p.get("campaign") || sessionStorage.getItem("fl_campaign") || "";
    const s = ["douyin", "xiaohongshu"].includes(source) ? source : "direct";
    const c = /^[a-zA-Z0-9_-]{0,64}$/.test(campaign) ? campaign : "";
    sessionStorage.setItem("fl_source", s);
    sessionStorage.setItem("fl_campaign", c);
    pending = api("/visitors", { source: s, campaign: c }).catch((e) => {
      pending = null;
      throw e;
    });
  }
  return pending;
}
export function resetVisitor() {
  pending = null;
}
export const goals: Record<string, string> = {
  fat_loss: "减脂塑形",
  muscle: "增肌增力",
  posture: "体态改善",
  fitness: "基础体能",
};
