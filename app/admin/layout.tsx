import Link from "next/link";

/** Admin is session-gated and DB-backed; never prerender at build time. */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold">
              Admin
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/admin/products" className="hover:text-foreground">
                Products
              </Link>
              <Link href="/admin/needs" className="hover:text-foreground">
                Needs
              </Link>
              <Link href="/admin/rules" className="hover:text-foreground">
                Bundle Rules
              </Link>
              <Link href="/admin/orders" className="hover:text-foreground">
                Orders
              </Link>
              <Link href="/" target="_blank" className="hover:text-foreground">
                View store ↗
              </Link>
            </nav>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
