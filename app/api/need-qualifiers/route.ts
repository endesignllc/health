import { NextRequest, NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { needs, needQualifierQuestions, needQualifierOptions } from "@/db/schema";

export async function GET(req: NextRequest) {
  const needSlugs = req.nextUrl.searchParams.get("needSlugs")?.trim() ?? "";
  if (!needSlugs) {
    return NextResponse.json({ questions: [], options: [] });
  }

  const slugList = needSlugs.split(",").map((s) => s.trim()).filter(Boolean);
  if (slugList.length === 0) {
    return NextResponse.json({ questions: [], options: [] });
  }

  // Get need IDs for the requested slugs
  const needRows = await db
    .select({ id: needs.id, slug: needs.slug })
    .from(needs)
    .where(inArray(needs.slug, slugList));

  if (needRows.length === 0) {
    return NextResponse.json({ questions: [], options: [] });
  }

  const needIds = needRows.map((n) => n.id);
  const needSlugById = Object.fromEntries(needRows.map((n) => [n.id, n.slug]));

  // Get all questions for these needs
  const questions = await db
    .select({
      id: needQualifierQuestions.id,
      needId: needQualifierQuestions.needId,
      slug: needQualifierQuestions.slug,
      prompt: needQualifierQuestions.prompt,
      sortOrder: needQualifierQuestions.sortOrder,
    })
    .from(needQualifierQuestions)
    .where(inArray(needQualifierQuestions.needId, needIds))
    .orderBy(asc(needQualifierQuestions.sortOrder), asc(needQualifierQuestions.slug));

  if (questions.length === 0) {
    return NextResponse.json({ questions: [], options: [] });
  }

  // Get all options for these questions
  const questionIds = questions.map((q) => q.id);
  const options = await db
    .select({
      id: needQualifierOptions.id,
      questionId: needQualifierOptions.questionId,
      slug: needQualifierOptions.slug,
      label: needQualifierOptions.label,
      sortOrder: needQualifierOptions.sortOrder,
    })
    .from(needQualifierOptions)
    .where(inArray(needQualifierOptions.questionId, questionIds))
    .orderBy(asc(needQualifierOptions.sortOrder), asc(needQualifierOptions.slug));

  // Add needSlug to each question for easier frontend grouping
  const questionsWithSlug = questions.map((q) => ({
    ...q,
    needSlug: needSlugById[q.needId],
  }));

  const res = NextResponse.json({
    questions: questionsWithSlug,
    options,
  });
  res.headers.set("Cache-Control", "public, max-age=300");
  return res;
}
