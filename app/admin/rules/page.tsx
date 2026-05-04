import { db } from "@/lib/db";
import { needProductRules } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminRulesPage() {
  const rules = await db.query.needProductRules.findMany({
    with: { need: true, requiredCategory: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Bundle Rules</h1>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Need</th>
              <th className="text-left px-4 py-3 font-medium">Required Category</th>
              <th className="text-left px-4 py-3 font-medium">Min</th>
              <th className="text-left px-4 py-3 font-medium">Max</th>
              <th className="text-left px-4 py-3 font-medium">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rules.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">{r.need?.name ?? "—"}</td>
                <td className="px-4 py-3">{r.requiredCategory?.name ?? "—"}</td>
                <td className="px-4 py-3">{r.minItems}</td>
                <td className="px-4 py-3">{r.maxItems}</td>
                <td className="px-4 py-3">{r.priorityWeight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
