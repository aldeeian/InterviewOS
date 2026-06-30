import { NextResponse } from "next/server";
import { followUpFor, nextQuestion, scoreAnswer } from "@/lib/mock-ai";
import type { Difficulty, InterviewCategory, ScoreAxes } from "@/lib/types";

interface RespondRequestBody {
  category: InterviewCategory;
  difficulty: Difficulty;
  jobSkills?: string[];
  focusAreas?: string[];
  askedQuestionIds: string[];
  currentQuestion?: string;
  currentQuestionFollowUps?: number;
  answer?: string;
}

interface RespondResponseBody {
  reply: string;
  questionId: string;
  isNewQuestion: boolean;
  scores?: ScoreAxes;
  feedback?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RespondRequestBody | null;
  if (!body || !body.category || !body.difficulty) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "category and difficulty are required." } },
      { status: 400 }
    );
  }

  // Simulates real AI-call latency so the UI's streaming/typing indicator feels real.
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 400));

  const jobSkills = body.jobSkills ?? [];
  const focusAreas = body.focusAreas ?? [];
  const askedQuestionIds = body.askedQuestionIds ?? [];

  let scores: ScoreAxes | undefined;
  let feedback: string | undefined;

  if (body.answer) {
    const scored = scoreAnswer(body.currentQuestion ?? "", body.answer, jobSkills);
    scores = scored.scores;
    feedback = scored.feedback;

    const wordCount = body.answer.trim().split(/\s+/).filter(Boolean).length;
    const shallow = wordCount < 25 || scored.scores.structure < 55;
    const alreadyFollowedUp = (body.currentQuestionFollowUps ?? 0) >= 1;

    if (shallow && !alreadyFollowedUp) {
      const reply = followUpFor(body.currentQuestion ?? "", body.answer);
      const payload: RespondResponseBody = {
        reply,
        questionId: "followup",
        isNewQuestion: false,
        scores,
        feedback,
      };
      return NextResponse.json(payload);
    }
  }

  const question = nextQuestion(body.category, body.difficulty, askedQuestionIds, focusAreas);
  const payload: RespondResponseBody = {
    reply: question.prompt,
    questionId: question.id,
    isNewQuestion: true,
    scores,
    feedback,
  };
  return NextResponse.json(payload);
}
