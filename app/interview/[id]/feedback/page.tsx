import { SessionFeedbackView } from "@/components/interview/session-feedback-view";

export default async function SessionFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionFeedbackView sessionId={id} />;
}
