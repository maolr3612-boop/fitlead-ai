import Link from "@/components/site-link";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  SlidersHorizontal,
  Dumbbell,
  Flame,
  MoveUpRight,
  Check,
  Sparkles,
  Activity,
} from "lucide-react";
import Visit from "@/components/visit";
import SavedPlan from "@/components/saved-plan";
import { ONLINE } from "@/lib/api";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <>
      <Visit />
      <main className="home">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> SCIENCE MEETS YOUR POTENTIAL
            </div>
            <h1>
              你的专属 AI
              <br />
              健身计划，
              <br />
              <span>
                从这里开始<span className="period">.</span>
              </span>
            </h1>
            <p className="hero-description">
              根据你的目标、身体数据和生活习惯，
              <br className="desktop" />
              制定更适合你的训练与饮食起步方案。
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/assessment">
                  免费开始评估 <ArrowUpRight size={20} />
                </Link>
              </Button>
              <span>约 3–5 分钟 · 无需注册</span>
            </div>
            <SavedPlan />
            <div className="hero-proof">
              <ShieldCheck size={17} />
              <span>隐私由你掌控</span>
              <i />
              <span>先做风险筛查，再制定计划</span>
            </div>
          </div>
          <div className="hero-art" aria-label="抽象运动轨迹与训练计划预览">
            <div className="art-grid" />
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="art-label">
              BUILT AROUND YOU <span>↗</span>
            </div>
            <div className="art-word">
              MOVE
              <br />
              <span>BETTER.</span>
            </div>
            <div className="preview-card">
              <div className="preview-top">
                <span>
                  <Activity size={17} /> 你的每周训练节奏
                </span>
                <span className="chip">方案示例</span>
              </div>
              <div className="week-bars">
                {["一", "二", "三", "四", "五", "六", "日"].map((d, i) => (
                  <div key={d}>
                    <div
                      style={{ height: [46, 22, 70, 22, 92, 38, 22][i] }}
                      className={[0, 2, 4].includes(i) ? "bar active" : "bar"}
                    />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
              <div className="preview-bottom">
                <span>
                  <b>3</b> 次力量训练
                </span>
                <span>
                  <b>恢复</b> 也是进步的一部分
                </span>
              </div>
            </div>
            <div className="art-caption">
              PERSONAL TRAINING. PERSONAL PROGRESS. <span>01 / 03</span>
            </div>
          </div>
        </section>
        {ONLINE && (
          <section className="knowledge-cta">
            <div>
              <span className="eyebrow">EXPLORE THE EVIDENCE</span>
              <h2>从动作到饮水，每一个建议都有来处。</h2>
              <p>
                876 个动作文本 · 8,156 个 USDA 食物条目 ·
                康复知识与来源索引。注册账号，保存个人方案与健康记录。
              </p>
            </div>
            <Button asChild>
              <Link href="/library">
                浏览健康资料库 <ArrowUpRight size={18} />
              </Link>
            </Button>
          </section>
        )}
        <div className="principle-strip">
          <span>
            <SlidersHorizontal /> 因人而异的计划
          </span>
          <span>
            <ShieldCheck /> 安全优先的评估
          </span>
          <span>
            <Dumbbell /> 训练 × 饮食协同
          </span>
          <span>
            <Sparkles /> AI 规划 + 真人支持
          </span>
        </div>
        <section className="section goals">
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 / FIND YOUR FOCUS</span>
              <h2>你的目标，决定你的方向。</h2>
            </div>
            <p>
              无论从哪里起步，
              <br />
              找到适合当下的训练节奏。
            </p>
          </div>
          <div className="goal-grid">
            {[
              {
                title: "减脂塑形",
                en: "LEAN & STRONG",
                text: "建立温和、可持续的热量与运动节奏，让改变更容易坚持。",
                Icon: Flame,
                metric: "01",
                key: "fat_loss",
              },
              {
                title: "增肌增力",
                en: "BUILD YOUR STRENGTH",
                text: "以渐进训练和合理恢复为基础，一步步积累力量。",
                Icon: Dumbbell,
                metric: "02",
                key: "muscle",
              },
              {
                title: "体态与体能",
                en: "MOVE WITH CONFIDENCE",
                text: "从基础活动和动作习惯开始，探索更自在的身体状态。",
                Icon: MoveUpRight,
                metric: "03",
                key: "posture",
              },
            ].map(({ title, en, text, Icon, metric, key }) => (
              <Link
                className="goal-card"
                key={title}
                href={`/assessment?goal=${key}`}
              >
                <div className="goal-card-top">
                  <Icon size={27} />
                  <span>{metric}</span>
                </div>
                <small>{en}</small>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="text-link">
                  从这个目标开始 <ArrowUpRight size={19} />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="section" id="approach">
          <div className="section-heading">
            <div>
              <span className="eyebrow">02 / A SMARTER START</span>
              <h2>少一点猜测，多一点方向。</h2>
            </div>
            <span className="section-tag">从了解你，到适合你</span>
          </div>
          <div className="steps-grid">
            {[
              [
                "01",
                "了解你的起点",
                "填写目标、身体数据、训练条件和饮食习惯。",
              ],
              [
                "02",
                "先确认运动安全",
                "通过风险筛查，判断是否适合自动生成方案。",
              ],
              [
                "03",
                "开启你的新节奏",
                "保存演示计划，按需申请真人私教进一步指导。",
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <span className="step-number">
                  {n}
                  <ArrowRight size={20} />
                </span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="service-section section" id="services">
          <div>
            <span className="eyebrow">03 / SUPPORT THAT FITS</span>
            <h2>
              好的开始，
              <br />
              也可以有人同行。
            </h2>
            <p>
              先用免费评估找到方向，
              <br />
              再由你决定是否需要更多支持。
            </p>
          </div>
          <div className="service-options">
            <article>
              <span className="chip">免费 · 演示模式</span>
              <h3>规则驱动的起步方案</h3>
              <p>
                <Check size={16} /> 个性化训练与饮食参考
              </p>
              <p>
                <Check size={16} /> 风险筛查与恢复建议
              </p>
              <Link className="text-link" href="/assessment">
                开始免费评估 <ArrowUpRight size={17} />
              </Link>
            </article>
            <article>
              <span className="chip muted">自愿申请 · 真人跟进</span>
              <h3>真人私教咨询</h3>
              <p>
                <Check size={16} /> 进一步沟通训练目标与动作问题
              </p>
              <p>
                <Check size={16} /> 了解服务内容、适配情况与费用
              </p>
              <Link className="text-link" href="/consultation">
                了解私教指导 <ArrowUpRight size={17} />
              </Link>
            </article>
          </div>
        </section>
        <section className="final-cta">
          <div>
            <span className="eyebrow">START WHERE YOU ARE.</span>
            <h2>下一步，从了解自己开始。</h2>
          </div>
          <Button asChild>
            <Link href="/assessment">
              免费开始评估 <ArrowUpRight size={20} />
            </Link>
          </Button>
        </section>
        <p className="disclaimer">
          当前为规则引擎演示，未使用真实 AI
          生成。仅为适合一般运动的成年人提供起步参考；有疼痛、疾病、孕产期或其他风险时请先接受专业评估。咨询申请不收费，后续服务与费用由真人沟通确认。
        </p>
      </main>
    </>
  );
}

