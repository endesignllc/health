import { interactionWarningsForFlags } from "@/lib/interaction-flags";

interface InteractionFlagNoticeProps {
  flags: string[] | null | undefined;
  className?: string;
}

/** Plain-language interaction notice for manually added products. */
export function InteractionFlagNotice({ flags, className }: InteractionFlagNoticeProps) {
  const warnings = interactionWarningsForFlags(flags);
  if (warnings.length === 0) return null;

  return (
    <div
      className={
        className ??
        "mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
      }
    >
      <p className="font-medium mb-1">Review before use</p>
      <ul className="list-disc pl-4 space-y-1">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
