import { NextResponse } from "next/server";
import { analyzeTrack } from "@/lib/mock-ai";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const resumeText = typeof body?.resumeText === "string" ? body.resumeText : "";
  const jobDescriptionText =
    typeof body?.jobDescriptionText === "string" ? body.jobDescriptionText : "";

  if (!resumeText.trim() && !jobDescriptionText.trim()) {
    return NextResponse.json(
      { error: { code: "MISSING_INPUT", message: "Provide at least a resume or a job description." } },
      { status: 400 }
    );
  }

  // Simulates the latency of a real extraction/LLM-analysis backend call.
  await new Promise((resolve) => setTimeout(resolve, 600));

  const track = analyzeTrack(resumeText, jobDescriptionText);
  return NextResponse.json({ track });
}
