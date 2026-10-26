import { test, expect, Page, APIRequestContext } from "@playwright/test";
import path from "node:path";
const prefix = process.env.QA_PREFIX || "/fitlead-ai";
const api = "https://fitlead-health-api.maolr3612.workers.dev/api/v1";
const shots = path.resolve(
  "../../docs/qa-2026-10-26",
  process.env.QA_STAGE || "before",
);
const pwd = "QA-test-password-57!";
const go = (p: Page, url: string) => p.goto(prefix + url);
async function cleanup(
  request: APIRequestContext,
  username: string,
  password: string,
) {
  const r = await request.post(api + "/auth/login", {
    data: { username, password },
  });
  if (r.ok()) {
    const body = await r.json();
    await request.delete(api + "/me", {
      headers: { Authorization: "Bearer " + body.data.access_token },
      data: { password },
    });
  }
}
test("registration, errors, download, logout, recovery and clean account drafts", async ({
  page,
  request,
}) => {
  const username = "qa_" + Date.now().toString(36);
  let password = pwd;
  try {
    await go(page, "/account/");
    await page.getByRole("tab", { name: "注册账号" }).click();
    await page.getByLabel("账号名称").fill(username);
    await page.getByLabel("密码", { exact: true }).fill(pwd);
    await page.getByRole("button", { name: "创建我的账号" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("同意");
    await page.locator("input[type=checkbox]").check();
    await page.getByRole("button", { name: "创建我的账号" }).click();
    await expect(
      page.getByRole("heading", { name: `你好，${username}` }),
    ).toBeVisible();
    const recovery = (await page.locator(".recovery-code").innerText()).trim();
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "下载恢复码" }).click();
    expect((await dl).suggestedFilename()).toContain("恢复码");
    await page.getByRole("button", { name: "我已保存，隐藏恢复码" }).click();
    await expect(page.locator(".recovery-code")).toHaveCount(0);
    await page.getByLabel("感受与备注").fill("私密草稿：退出后不应保留");
    await page.getByRole("button", { name: "退出账号" }).click();
    await page.getByRole("tab", { name: "登录账号" }).click();
    await page.getByLabel("账号名称").fill(username);
    await page.getByLabel("密码", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "不正确",
    );
    await page.getByLabel("密码", { exact: true }).fill(pwd);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: `你好，${username}` }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(shots, "01-logout-draft.png"),
      fullPage: true,
    });
    await expect(page.getByLabel("感受与备注")).toHaveValue("");
    await page.getByRole("button", { name: "退出账号" }).click();
    await page.getByRole("tab", { name: "恢复账号" }).click();
    await page.getByLabel("账号名称").fill(username);
    await page.getByLabel("离线恢复码").fill(recovery);
    await page.getByLabel("新密码").fill("QA-recovered-password-58!");
    await page.getByRole("button", { name: "使用恢复码重置" }).click();
    await expect(
      page.getByRole("heading", { name: `你好，${username}` }),
    ).toBeVisible();
    password = "QA-recovered-password-58!";
    await expect(page.locator(".recovery-code")).toBeVisible();
    await page.getByRole("button", { name: "我已保存，隐藏恢复码" }).click();
    await page.getByRole("button", { name: "删除我的账号和数据" }).click();
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await expect(page.getByLabel("当前密码", { exact: true })).toHaveCount(0);
  } finally {
    await cleanup(request, username, password);
  }
});
test("homepage links, payment disclosure, consultation validation and consent withdrawal", async ({
  page,
}) => {
  await go(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "你的专属 AI",
  );
  await page.getByRole("link", { name: "如何开始", exact: true }).click();
  await expect(page).toHaveURL(/#approach$/);
  await page.getByRole("link", { name: "服务介绍", exact: true }).click();
  await expect(page).toHaveURL(/#services$/);
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((nodes) =>
      [...new Set(nodes.map((n) => n.getAttribute("href")!))].filter((h) =>
        h.startsWith("/"),
      ),
    );
  const statuses = await Promise.all(
    hrefs.map(async (href) => ({
      href,
      status: (await page.request.get(href)).status(),
    })),
  );
  expect(statuses.filter((x) => x.status >= 400)).toEqual([]);
  await page.getByRole("link", { name: "了解私教指导" }).click();
  await expect(
    page.getByText("不支持在线支付", { exact: false }),
  ).toBeVisible();
  expect(await page.locator('input[autocomplete="cc-number"]').count()).toBe(0);
  await page.getByRole("button", { name: "提交免费咨询申请" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("授权");
  await page.locator("input[type=checkbox]").check();
  await page.getByLabel("手机号、邮箱或微信号").fill("123");
  await page.getByRole("button", { name: "提交免费咨询申请" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("有效");
  await page
    .getByLabel("手机号、邮箱或微信号")
    .fill("qa-no-delivery@example.com");
  await page.getByRole("button", { name: "提交免费咨询申请" }).click();
  await expect(
    page.getByRole("heading", { name: "你的咨询申请已收到。" }),
  ).toBeVisible();
  await expect(
    page.getByText("尚未产生任何收费或支付。", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(shots, "02-consultation-payment.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "管理联系授权" }).click();
  await page.getByRole("button", { name: "撤回联系授权" }).click();
  await expect(page.getByRole("status")).toContainText("已撤回");
  await page.getByRole("button", { name: "删除我的全部数据" }).click();
  await page.getByRole("button", { name: "确认永久删除", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已删除");
});
test("unavailable online administration is not presented as a working login", async ({
  page,
}) => {
  await go(page, "/admin/");
  await page.getByRole("heading").first().waitFor();
  await page.screenshot({
    path: path.join(shots, "03-admin-entry.png"),
    fullPage: true,
  });
  await expect(page.getByText("线上管理入口尚未开放")).toBeVisible();
  await expect(page.getByRole("button", { name: "安全登录" })).toHaveCount(0);
});

test("slow resource requests can be left and failed searches can be retried unchanged", async ({
  page,
}) => {
  await page.route(/\/api\/v1\/catalog\/exercises(?:\?|$)/, async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue().catch(() => {});
  });
  await go(page, "/library/");
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("tab", { name: "饮水依据" }).click();
  await page.screenshot({
    path: path.join(shots, "04-library-loading.png"),
    fullPage: true,
  });
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "EFSA 官方摘要（备用链接） ↗" }),
  ).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
  await page.addInitScript(() => {
    const actualFetch = window.fetch.bind(window);
    let first = true;
    window.fetch = (input, init) => {
      if (first && String(input).includes("/api/v1/catalog/exercises?")) {
        first = false;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: false,
              data: null,
              error: { message: "检索暂不可用，请重试" },
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return actualFetch(input, init);
    };
  });
  await go(page, "/library/");
  await expect(
    page.getByRole("alert").filter({ hasText: "检索暂不可用" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.locator(".catalog-card").first()).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "检索暂不可用" }),
  ).toHaveCount(0);
});
