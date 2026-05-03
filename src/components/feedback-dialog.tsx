import { useState, useId } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { BottomSheet } from "@/components/m3/bottom-sheet";
import { M3Button } from "@/components/m3/button";
import { event } from "@/lib/gtag";

type FeedbackType = "bug" | "feature" | "general" | "other";

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: "general", label: "General Feedback" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "other", label: "Other" },
];

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function FeedbackForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const typeId = useId();
  const messageId = useId();
  const replyToId = useId();

  const handleSubmit = async () => {
    setError("");
    if (message.trim().length < 5) {
      setError("Please write at least 5 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, replyTo: replyTo || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ?? "Failed to send feedback.",
        );
        return;
      }

      event("feedback_submitted", { feedback_type: type });
      onSuccess();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-6 pb-6 pt-2">
      {/* Type selector */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={typeId}
          className="text-label-medium text-[var(--md-sys-color-on-surface-variant)]"
        >
          Type
        </label>
        <select
          id={typeId}
          value={type}
          onChange={(e) => setType(e.target.value as FeedbackType)}
          className="rounded-lg border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-highest)] px-3 py-2 text-body-medium text-[var(--md-sys-color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
        >
          {FEEDBACK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={messageId}
          className="text-label-medium text-[var(--md-sys-color-on-surface-variant)]"
        >
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={messageId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's on your mind…"
          rows={5}
          maxLength={2000}
          className="resize-none rounded-lg border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-highest)] px-3 py-2 text-body-medium text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
        />
        <span className="text-label-small text-[var(--md-sys-color-on-surface-variant)] self-end">
          {message.length}/2000
        </span>
      </div>

      {/* Reply-to (optional) */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={replyToId}
          className="text-label-medium text-[var(--md-sys-color-on-surface-variant)]"
        >
          Email{" "}
          <span className="text-label-small text-[var(--md-sys-color-on-surface-variant)] opacity-70">
            (optional — for follow-up)
          </span>
        </label>
        <input
          id={replyToId}
          type="email"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder="you@example.com"
          className="rounded-lg border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-highest)] px-3 py-2 text-body-medium text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-label-medium text-[var(--md-sys-color-error)]"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <M3Button variant="text" onPress={onClose} isDisabled={isSubmitting}>
          Cancel
        </M3Button>
        <M3Button
          variant="filled"
          onPress={handleSubmit}
          isLoading={isSubmitting}
          isDisabled={message.trim().length < 5}
        >
          Send
        </M3Button>
      </div>
    </div>
  );
}

function SuccessContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 pb-8 pt-2 text-center">
      <span className="text-4xl" role="img" aria-label="Checkmark">
        ✅
      </span>
      <p className="text-title-medium text-[var(--md-sys-color-on-surface)]">
        Feedback sent!
      </p>
      <p className="text-body-medium text-[var(--md-sys-color-on-surface-variant)]">
        Thanks for the feedback! Look for an update soon!
      </p>
      <M3Button variant="tonal" onPress={onClose} className="mt-2">
        Done
      </M3Button>
    </div>
  );
}

export function FeedbackDialog({ isOpen, onClose }: FeedbackDialogProps) {
  const [submitted, setSubmitted] = useState(false);
  const headingId = "feedback-dialog-heading";

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        aria-labelledby={headingId}
      >
        <h2
          id={headingId}
          className="px-6 pt-2 pb-1 text-title-large text-[var(--md-sys-color-on-surface)]"
        >
          {submitted ? "Done!" : "Submit Feedback"}
        </h2>
        {submitted ? (
          <SuccessContent onClose={handleClose} />
        ) : (
          <FeedbackForm
            onClose={handleClose}
            onSuccess={() => setSubmitted(true)}
          />
        )}
      </BottomSheet>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      backdrop="blur"
      size="md"
      aria-labelledby={headingId}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader id={headingId} className="text-title-large">
              {submitted ? "Done!" : "Submit Feedback"}
            </ModalHeader>
            {submitted ? (
              <ModalBody className="pb-6">
                <SuccessContent onClose={handleClose} />
              </ModalBody>
            ) : (
              <>
                <ModalBody className="px-0 py-0">
                  <FeedbackForm
                    onClose={handleClose}
                    onSuccess={() => setSubmitted(true)}
                  />
                </ModalBody>
                <ModalFooter className="hidden" />
              </>
            )}
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
