import Link from "@/components/site-link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="page-shell narrow">
      <span className="eyebrow">404 / FIND YOUR WAY BACK</span>
      <h1 className="page-title">这条路径暂时没有计划。</h1>
      <p>页面可能已移动，请从首页或评估重新开始。</p>
      <Button asChild>
        <Link href="/">返回首页</Link>
      </Button>
    </main>
  );
}

