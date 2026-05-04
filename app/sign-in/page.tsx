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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Health Benefits Shop</h1>
          <p className="text-sm text-muted-foreground">Private preview</p>
        </div>
        <p className="text-sm text-muted-foreground">
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
          <Button type="submit" className="w-full">
            Continue with Google
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          If your account isn&rsquo;t on the access list, contact the site owner.
        </p>
      </div>
    </div>
  );
}
