import PlanClient from "@/components/plan-client";
export function generateStaticParams() {
  return [{ id: "demo" }];
}
export default function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PlanClient params={params} />;
}
