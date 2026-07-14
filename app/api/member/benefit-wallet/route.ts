import { NextResponse } from "next/server";
import { resolveBenefitWallet } from "@/lib/benefit-wallet/resolve";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const wallet = await resolveBenefitWallet();
    return NextResponse.json({ wallet });
  } catch {
    return NextResponse.json({ wallet: null }, { status: 500 });
  }
}
