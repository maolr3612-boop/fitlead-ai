import { test, expect, Page } from "@playwright/test";
import path from "node:path";
const shots = path.resolve(
  process.env.FITLEAD_SHOTS_DIR || "../../docs/screenshots-v2",
);
async function go(page: Page, url: string) {
  await page.goto((process.env.FITLEAD_TEST_PREFIX || "") + url);
}
const username = "browser_" + Date.now().toString(36);
const password = "Browser-test-password-45!";
async function complete(page: Page, pain = false) {
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("年龄", { exact: false }).fill("28");
  await page.getByLabel("身高").fill("175");
  await page.getByLabel("体重 (kg)", { exact: true }).fill("75");
  await page.getByLabel("能量估算参数").selectOption("male");
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("花生", { exact: true }).check();
  await page.getByRole("button", { name: "下一步" }).click();
  for (const label of [
    "是否未满 18 岁？",
    "是否怀孕或处于产后恢复期？",
    "是否存在需要专业管理的疾病？",
    "是否有持续疼痛或近期受伤？",
    "是否存在运动相关禁忌？",
    "是否存在饮食失调相关风险？",
  ])
    await page
      .getByLabel(label, { exact: true })
      .selectOption(pain && label.includes("疼痛") ? "yes" : "no");
  await page.getByLabel("是否有医嘱限水").selectOption("no");
  await page.getByRole("button", { name: "下一步" }).click();
  await page.locator("input[type=checkbox]").check();
  await page
    .getByRole("button", { name: "提交并生成方案", exact: true })
    .click();
}

test("real visitor browses traceable foods, exercises, rehabilitation and sources", async ({
  page,
}) => {
  await go(page, "/");
  await page.getByRole("link", { name: "浏览健康资料库" }).click();
  await expect(page.getByText("876", { exact: true })).toBeVisible();
  await expect(page.locator(".catalog-card").first()).toBeVisible();
  await page.getByLabel("搜索动作").fill("深蹲");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.locator(".catalog-card").first()).toContainText(/squat/i);
  await page.getByRole("tab", { name: "食物营养" }).click();
  await page.getByLabel("搜索食物").fill("米饭");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.locator(".catalog-card").first()).toContainText(/rice/i);
  await page.screenshot({
    path: path.join(shots, "01-food-library.png"),
    fullPage: true,
  });
  await page.getByRole("tab", { name: "康复知识" }).click();
  await expect(
    page.getByRole("heading", { name: "腰背与久坐不适" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "饮水依据" }).click();
  await expect(
    page.getByRole("heading", { name: "不是每个人都该喝同一个数字。" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "来源与授权" }).click();
  await expect(
    page.getByRole("heading", { name: "USDA FoodData Central" }),
  ).toBeVisible();
});
test("assessment, calculated hydration, account persistence and cross-device privacy", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await go(page, "/assessment?source=xiaohongshu&campaign=v2_browser");
  await complete(page);
  await expect(
    page.getByText("在线规则方案 · 数据可追溯", { exact: true }),
  ).toBeVisible();
  const planUrl = page.url();
  await page.getByRole("tab", { name: "7 天饮食" }).click();
  await expect(page.getByText("菜单实际汇总", { exact: false })).toBeVisible();
  await page.getByRole("tab", { name: "饮水与恢复" }).click();
  await expect(page.getByText("2500", { exact: true })).toBeVisible();
  await page.screenshot({
    path: path.join(shots, "02-personal-hydration.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "我的账号", exact: true }).click();
  await page.getByRole("tab", { name: "注册账号" }).click();
  await page.getByLabel("账号名称").fill(username);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.locator("input[type=checkbox]").check();
  await page.getByRole("button", { name: "创建我的账号" }).click();
  await expect(
    page.getByRole("heading", { name: `你好，${username}` }),
  ).toBeVisible();
  await expect(page.locator(".recovery-code")).toBeVisible();
  await expect(page.getByRole("link", { name: /减脂塑形/ })).toBeVisible();
  await page.getByLabel("饮料总量").fill("1800");
  await page.getByLabel("实际体重").fill("74.5");
  await page.getByLabel("感受与备注").fill("浏览器测试：今天感觉良好");
  await page.getByRole("button", { name: "保存健康记录" }).click();
  await expect(
    page.getByText("今日记录已保存", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(shots, "03-account-history.png"),
    fullPage: true,
  });
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出账号数据" }).click();
  expect((await dl).suggestedFilename()).toContain("账号数据");
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto(planUrl);
  await expect(
    other.getByRole("heading", { name: "暂时无法读取方案" }),
  ).toBeVisible();
  await go(other, "/account");
  await other.getByLabel("账号名称").fill(username);
  await other.getByLabel("密码", { exact: true }).fill(password);
  await other.getByRole("button", { name: "登录", exact: true }).click();
  await expect(
    other.getByRole("heading", { name: `你好，${username}` }),
  ).toBeVisible();
  await expect(other.getByText("饮料 1800 mL", { exact: false })).toBeVisible();
  await other.getByRole("link", { name: /减脂塑形/ }).click();
  await expect(
    other.getByText("在线规则方案 · 数据可追溯", { exact: true }),
  ).toBeVisible();
  await go(other, "/account");
  await other.getByRole("button", { name: "删除我的账号和数据" }).click();
  await other.getByLabel("当前密码", { exact: true }).fill(password);
  await other.getByRole("button", { name: "确认永久删除账号" }).click();
  await expect(other.getByText("账号和关联个人数据已永久删除。")).toBeVisible();
  await fresh.close();
  expect(errors).toEqual([]);
});
test("pain remains blocked in the online UI", async ({ page }) => {
  await go(page, "/assessment");
  await complete(page, true);
  await expect(
    page.getByRole("heading", { name: "先确认安全，再开始训练。" }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(shots, "04-online-risk-review.png"),
    fullPage: true,
  });
});
test("mobile library and account remain usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page, "/library");
  await expect(page.locator(".catalog-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(shots, "05-library-mobile.png"),
    fullPage: true,
  });
  await go(page, "/account");
  await page.getByRole("tab", { name: "注册账号" }).click();
  await expect(
    page.getByRole("button", { name: "创建我的账号" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(shots, "06-account-mobile.png"),
    fullPage: true,
  });
});
