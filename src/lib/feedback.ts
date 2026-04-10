import { redirect } from "next/navigation";

import { FeedbackTone } from "@/lib/validation";

export function redirectWithFeedback(
  pathname: string,
  tone: FeedbackTone,
  message: string,
  extras?: Record<string, string>
): never {
  const params = new URLSearchParams({
    tone,
    message,
    ...extras
  });

  redirect(`${pathname}?${params.toString()}`);
}
