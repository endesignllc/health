import { db } from "@/lib/db";
import { needs } from "@/db/schema";

export default async function AdminNeedsPage() {
  const needsList = await db.select().from(needs);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Need Categories</h1>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Slug</th>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {needsList.map((n) => (
              <tr key={n.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{n.slug}</td>
                <td className="px-4 py-3">{n.name}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                  {n.description ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
