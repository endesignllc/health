import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PlanThemeProvider } from "@/components/PlanThemeProvider";
import { WalletExpiryBannerServer } from "@/components/WalletExpiryBannerServer";
import { getPlanConfig } from "@/lib/plan-config";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const planConfig = getPlanConfig();

  return (
    <PlanThemeProvider config={planConfig}>
      <Header planConfig={planConfig} />
      <Suspense fallback={null}>
        <WalletExpiryBannerServer planConfig={planConfig} />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer planConfig={planConfig} />
    </PlanThemeProvider>
  );
}
