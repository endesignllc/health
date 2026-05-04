import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * App-level allowlist after Google OAuth succeeds.
 *
 * Set in environment as: ALLOWED_EMAILS="alice@example.com,bob@example.com"
 *
 * Fail-closed: if ALLOWED_EMAILS is unset or empty, NO ONE can sign in.
 * This is intentional — prevents accidental public exposure during preview.
 *
 * While the OAuth consent screen is in Google "Testing" mode, accounts must also be listed
 * under Google Auth Platform → Audience → Test users; otherwise Google rejects them before
 * this callback runs.
 */
function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  pages: {
    signIn: "/sign-in",
    error: "/access-denied",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    /**
     * Gate sign-in by email allowlist.
     * Returning a string redirects to that path; false denies with default error page.
     */
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return "/access-denied";

      const allowed = getAllowedEmails();
      if (allowed.length === 0) return "/access-denied";
      if (!allowed.includes(email)) return "/access-denied";

      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        token.email = profile.email.toLowerCase();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
});
