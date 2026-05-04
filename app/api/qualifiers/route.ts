import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { qualifierOptions, qualifierQuestions } from "@/db/schema";

export async function GET(req: NextRequest) {
  const productClassId = req.nextUrl.searchParams.get("productClassId")?.trim() ?? "";
  if (!productClassId) {
    return NextResponse.json({ questions: [], options: [] });
  }

  const questions = await db
    .select({
      id: qualifierQuestions.id,
      productClassId: qualifierQuestions.productClassId,
      slug: qualifierQuestions.slug,
      prompt: qualifierQuestions.prompt,
      helpText: qualifierQuestions.helpText,
      kind: qualifierQuestions.kind,
      sortOrder: qualifierQuestions.sortOrder,
    })
    .from(qualifierQuestions)
    .where(
      and(
        eq(qualifierQuestions.productClassId, productClassId),
        eq(qualifierQuestions.active, true)
      )
    )
    .orderBy(asc(qualifierQuestions.sortOrder), asc(qualifierQuestions.slug));

  if (!questions.length) {
    return NextResponse.json({ questions: [], options: [] });
  }

  const options = (
    await Promise.all(
      questions.map((q) =>
        db
          .select({
            id: qualifierOptions.id,
            questionId: qualifierOptions.questionId,
            slug: qualifierOptions.slug,
            label: qualifierOptions.label,
            sortOrder: qualifierOptions.sortOrder,
          })
          .from(qualifierOptions)
          .where(eq(qualifierOptions.questionId, q.id))
          .orderBy(asc(qualifierOptions.sortOrder), asc(qualifierOptions.slug))
      )
    )
  ).flat();

  const res = NextResponse.json({
    questions,
    options,
  });
  res.headers.set("Cache-Control", "public, max-age=300");
  return res;
}
