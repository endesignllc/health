import type { PlanConfig } from "@/lib/plan-config/types";
import { cn } from "@/lib/utils";

interface PlanThemeProviderProps {
  config: PlanConfig;
  children: React.ReactNode;
}

/**
 * Injects plan-specific CSS variables for theming.
 * Wrap the store layout to apply plan colors.
 */
export function PlanThemeProvider({ config, children }: PlanThemeProviderProps) {
  const isLaurel = config.slug === "laurel-complete-care";
  
  // Base CSS vars for all plans
  let cssVars = `
    :root {
      --primary: ${config.colors.primary};
      --primary-foreground: ${config.colors.primaryForeground};
      --accent: ${config.colors.accent};
      --accent-foreground: ${config.colors.accentForeground};
      --secondary: ${config.colors.secondary};
      --secondary-foreground: ${config.colors.secondaryForeground};
    }
  `;

  // Laurel-specific tokens per mockup
  if (isLaurel) {
    cssVars += `
      :root {
        /* Laurel design tokens */
        --laurel-navy: #1C3D5F;
        --laurel-sky: #4A90C4;
        --laurel-coral: #E8A598;
        --laurel-bg: #F4F6F3;
        --laurel-surface: #FFFFFF;
        --laurel-surface-tint: #EDF2EE;
        --laurel-line: #DDE3DE;
        --laurel-good: #1F7A4D;
        --laurel-warn: #8F5600;
        --laurel-warn-tint: #FBF0DC;
        
        /* Override background for Laurel */
        --background: 100 11% 95%;
        --card: 0 0% 100%;
        --border: 120 8% 87%;
      }
      
      /* Laurel uses Atkinson Hyperlegible as body font */
      body {
        font-family: var(--font-atkinson), system-ui, -apple-system, "Segoe UI", sans-serif;
        font-size: 18px;
      }
    `;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <div className={cn(isLaurel && "laurel-theme")}>
        {children}
      </div>
    </>
  );
}
