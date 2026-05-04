import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Access restricted",
};

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const isConfiguration = params.error === "Configuration";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-lg space-y-6 text-center rounded-xl border-2 border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          {isConfiguration ? "Sign-in configuration" : "Access restricted"}
        </h1>
        {isConfiguration ? (
          <>
            <p className="text-base text-muted-foreground leading-relaxed">
              Auth.js could not finish sign-in because of a server configuration problem (missing
              secret, bad callback URL, or OAuth client mismatch). Check the terminal where{" "}
              <code className="text-sm bg-muted px-1 py-0.5 rounded">npm run dev</code> is running for details.
            </p>
            <ul className="text-left text-base text-muted-foreground list-disc list-inside space-y-3 leading-relaxed">
              <li>
                Set <code className="text-sm bg-muted px-1 rounded">AUTH_SECRET</code> and valid{" "}
                <code className="text-sm bg-muted px-1 rounded">AUTH_GOOGLE_ID</code> /{" "}
                <code className="text-sm bg-muted px-1 rounded">AUTH_GOOGLE_SECRET</code> in{" "}
                <code className="text-sm bg-muted px-1 rounded">.env.local</code>.
              </li>
              <li>
                Add <code className="text-sm bg-muted px-1 rounded break-all">AUTH_URL=http://localhost:3009</code> for local dev so
                callbacks are not tied to <code className="text-sm bg-muted px-1 rounded">0.0.0.0</code> (browsers cannot
                load that host).
              </li>
              <li>
                In Google Cloud Console, authorized redirect URIs must include{" "}
                <code className="text-sm bg-muted px-1 rounded break-all">
                  http://localhost:3009/api/auth/callback/google
                </code>{" "}
                (and{" "}
                <code className="text-sm bg-muted px-1 rounded break-all">
                  http://127.0.0.1:3009/api/auth/callback/google
                </code>{" "}
                if you open the site via 127.0.0.1).
              </li>
            </ul>
          </>
        ) : (
          <>
            <p className="text-base text-muted-foreground leading-relaxed">
              Health Benefits Shop is currently in private preview. The Google account you used
              isn&rsquo;t on this app&rsquo;s allowlist (<code className="text-sm bg-muted px-1 rounded">ALLOWED_EMAILS</code>).
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              If Google sign-in itself failed earlier, confirm your account is a{" "}
              <strong className="text-foreground">Test user</strong> in Google Cloud while the OAuth app is in Testing.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              If you believe this is an error, contact the site owner.
            </p>
          </>
        )}
        <Button asChild variant="outline" size="lg" className="w-full min-h-[52px] text-lg">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
