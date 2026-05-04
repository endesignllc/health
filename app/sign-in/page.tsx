import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const from = params.from && params.from.startsWith("/") ? params.from : "/";

  // Already signed in → bounce to destination
  if (session?.user) {
    redirect(from);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center rounded-xl border-2 border-border bg-card p-8 sm:p-10 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Health Benefits Shop</h1>
          <p className="text-base font-semibold text-foreground">Private preview</p>
        </div>
        <p className="text-base text-muted-foreground leading-relaxed">
          This site is in early access. Sign in with an authorized Google account to continue.
        </p>
        <form
          action={async (formData) => {
            "use server";
            const target = formData.get("from")?.toString() || "/";
            const safeTarget = target.startsWith("/") ? target : "/";
            await signIn("google", { redirectTo: safeTarget });
          }}
        >
          <input type="hidden" name="from" value={from} />
          <Button type="submit" size="lg" className="w-full min-h-[52px] text-lg">
            Continue with Google
          </Button>
        </form>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If your account isn&rsquo;t on the access list, contact the site owner.
        </p>
      </div>
    </div>
  );
}
