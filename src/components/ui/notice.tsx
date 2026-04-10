import { FeedbackTone } from "@/lib/validation";
import { cn } from "@/lib/utils";

type NoticeProps = {
  tone: FeedbackTone;
  message: string;
};

export function Notice({ tone, message }: NoticeProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      )}
    >
      {message}
    </div>
  );
}
