import type { FindingCategory } from "../types";

type CategoryCardProps = {
  category: FindingCategory;
  label: string;
  count: number;
  accent: string;
};

export function CategoryCard({ label, count, accent }: CategoryCardProps) {
  return (
    <article className="rounded-lg border border-white/10 bg-slate-900/75 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={`h-3 w-3 rounded-full ${accent}`} />
        <span className="text-3xl font-bold text-white">{count}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-200">{label}</p>
    </article>
  );
}
