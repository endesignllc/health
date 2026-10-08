import type { PlanConfig } from "@/lib/plan-config/types";

interface PlanThemeProviderProps {
  config: PlanConfig;
  children: React.ReactNode;
}

/**
 * Injects plan-specific CSS variables for theming.
 * Wrap the store layout to apply plan colors.
 */
export function PlanThemeProvider({ config, children }: PlanThemeProviderProps) {
  const cssVars = `
    :root {
      --primary: ${config.colors.primary};
      --primary-foreground: ${config.colors.primaryForeground};
      --accent: ${config.colors.accent};
      --accent-foreground: ${config.colors.accentForeground};
      --secondary: ${config.colors.secondary};
      --secondary-foreground: ${config.colors.secondaryForeground};
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      {children}
    </>
  );
}
