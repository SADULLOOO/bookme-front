"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { Review } from "@/lib/types";

export function ReviewDialog({
  trigger,
  bookingId,
  serviceName,
  staffName,
  onSubmitted,
}: {
  trigger: React.ReactNode;
  bookingId: string;
  serviceName: string;
  staffName: string;
  onSubmitted: (review: Review) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    setLoading(true);
    setError(null);
    try {
      const review = await apiFetch<Review>("/reviews", {
        method: "POST",
        body: { booking_id: bookingId, rating, comment: comment.trim() || null },
      });
      toast.success(t("review.thanks"));
      setOpen(false);
      setRating(0);
      setComment("");
      onSubmitted(review);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("review.failed"));
    } finally {
      setLoading(false);
    }
  }

  const shown = hoverRating || rating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("review.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("review.serviceWith", { service: serviceName, staff: staffName })}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-1.5 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
                className="p-0.5"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "size-7 transition-colors",
                    n <= shown ? "fill-avail-3 text-avail-3" : "text-glass-border-strong",
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("review.commentPlaceholder")}
            maxLength={1000}
            rows={3}
          />
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <Button type="submit" disabled={rating === 0 || loading} className="rounded-full">
            {loading ? t("review.submitting") : t("review.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
