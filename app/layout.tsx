import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Health Benefits Shop | Build Your Budget-Fitting Bundle",
    template: "%s | Health Benefits Shop",
  },
  description:
    "Build a budget-fitting bundle of health and wellness products in under a minute. Shop by need—never by diagnosis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
