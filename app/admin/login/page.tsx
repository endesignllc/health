import { redirect } from "next/navigation";
import { AdminLoginForm } from "./AdminLoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Admin Login</h1>
        {params.error === "config" && (
          <p className="text-sm text-destructive text-center">
            ADMIN_TOKEN is not configured.
          </p>
        )}
        <AdminLoginForm redirectTo={params.from ?? "/admin"} />
      </div>
    </div>
  );
}
