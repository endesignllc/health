"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { QualifierAnswer } from "@/lib/qualifiers";

type Question = {
  id: string;
  productClassId: string;
  slug: string;
  prompt: string;
  helpText: string | null;
  kind: string;
  sortOrder: number;
};

type Option = {
  id: string;
  questionId: string;
  slug: string;
  label: string;
  sortOrder: number;
};

type QualifierResponse = {
  questions: Question[];
  options: Option[];
};

export function QualifierPanel({
  productClassId,
  answers,
  onChange,
}: {
  productClassId: string;
  answers: QualifierAnswer[];
  onChange: (nextAnswers: QualifierAnswer[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QualifierResponse>({ questions: [], options: [] });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const res = await fetch(
        `/api/qualifiers?productClassId=${encodeURIComponent(productClassId)}`
      );
      const payload = (await res.json()) as QualifierResponse;
      if (cancelled) return;
      setData(payload);
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [productClassId]);

  const optionsByQuestion = useMemo(() => {
    const m = new Map<string, Option[]>();
    for (const o of data.options) {
      const arr = m.get(o.questionId) ?? [];
      arr.push(o);
      m.set(o.questionId, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
    }
    return m;
  }, [data.options]);

  const selectedOptionSlug = (questionSlug: string): string | null => {
    const found = answers.find((a) => a.questionSlug === questionSlug);
    if (!found || !found.optionSlugs.length) return null;
    return found.optionSlugs[0] ?? null;
  };

  const setSingleChoice = (questionSlug: string, optionSlug: string) => {
    const next = answers.filter((a) => a.questionSlug !== questionSlug);
    next.push({ questionSlug, optionSlugs: [optionSlug] });
    onChange(next);
  };

  if (!loading && data.questions.length === 0) return null;

  return (
    <div className="rounded-md border border-border/60 p-3 mt-2 bg-muted/20">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">Refine this pick</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "Show"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-4">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading options…</p>
          ) : (
            <>
              {data.questions.map((q) => {
                const selected = selectedOptionSlug(q.slug);
                return (
                  <div key={q.id} className="space-y-2">
                    <p className="text-sm font-medium">{q.prompt}</p>
                    {q.helpText && (
                      <p className="text-xs text-muted-foreground">{q.helpText}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(optionsByQuestion.get(q.id) ?? []).map((o) => (
                        <Button
                          key={o.id}
                          type="button"
                          variant={selected === o.slug ? "default" : "outline"}
                          size="sm"
                          aria-pressed={selected === o.slug}
                          onClick={() => setSingleChoice(q.slug, o.slug)}
                        >
                          {o.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => onChange([])}
              >
                Just show me options
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
