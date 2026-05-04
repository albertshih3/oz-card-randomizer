import { useState, useId } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import clsx from "clsx";
import { CheckCircle2, MessageCircle, X } from "lucide-react";
import { BottomSheet } from "@/components/m3/bottom-sheet";
import { M3Button } from "@/components/m3/button";
import { event } from "@/lib/gtag";
import { useMediaQuery } from "@/hooks/use-media-query";

type FeedbackType = "bug" | "feature" | "general" | "other";

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: "general", label: "General Feedback" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "other", label: "Other" },
];

const fieldClassName =
  "w-full rounded-[16px] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] px-4 py-3 text-body-medium text-[var(--md-sys-color-on-surface)] outline-none transition-colors duration-short4 ease-standard placeholder:text-[var(--md-sys-color-on-surface-variant)] focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-[0.38]";

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
    <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
      <fieldset className="flex flex-col gap-2" disabled={isSubmitting}>
        <legend
          id={typeId}
          className="mb-2 text-label-medium text-[var(--md-sys-color-on-surface-variant)]"
        >
          Type
        </legend>
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          role="radiogroup"
          aria-labelledby={typeId}
        >
          {FEEDBACK_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={type === t.value}
              onClick={() => setType(t.value)}
              className={clsx(
                "min-h-11 rounded-full border px-4 text-label-large transition-colors duration-short4 ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)] disabled:cursor-not-allowed disabled:opacity-[0.38]",
                type === t.value
                  ? "border-transparent bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
                  : "border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-secondary-container)] hover:text-[var(--md-sys-color-on-secondary-container)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

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
          placeholder="Tell me what's on your mind..."
          rows={5}
          maxLength={2000}
          disabled={isSubmitting}
          className={clsx(fieldClassName, "min-h-32 resize-none")}
        />
        <span className="self-end text-label-medium text-[var(--md-sys-color-on-surface-variant)]">
          {message.length}/2000
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={replyToId}
          className="text-label-medium text-[var(--md-sys-color-on-surface-variant)]"
        >
          Email{" "}
          <span className="text-label-medium text-[var(--md-sys-color-on-surface-variant)] opacity-70">
            (optional, for follow-up)
          </span>
        </label>
        <input
          id={replyToId}
          type="email"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder="username@oaklandzoo.org"
          disabled={isSubmitting}
          className={fieldClassName}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[16px] bg-[var(--md-sys-color-error-container)] px-4 py-3 text-label-large text-[var(--md-sys-color-on-error-container)]"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <M3Button variant="tonal" onPress={onClose} isDisabled={isSubmitting}>
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
    <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-3 text-center">
      <span className="m3-feedback-success-mark flex h-16 w-16 items-center justify-center rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)]">
        <CheckCircle2 size={34} strokeWidth={2.25} />
      </span>
      <p className="text-title-medium text-[var(--md-sys-color-on-surface)]">
        Feedback sent!
      </p>
      <p className="text-body-medium text-[var(--md-sys-color-on-surface-variant)]">
        Thanks for helping make booster packs easier to use.
      </p>
      <M3Button variant="tonal" onPress={onClose} className="mt-2">
        Done
      </M3Button>
    </div>
  );
}

function DialogHeading({
  title,
  description,
  headingId,
  onClose,
}: {
  title: string;
  description: string;
  headingId: string;
  onClose: () => void;
}) {
  return (
    <div className="flex w-full items-start gap-4 px-6 pb-3 pt-5">
      <span
        aria-hidden="true"
        className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)] sm:flex"
      >
        <MessageCircle size={20} strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <h2
          id={headingId}
          className="text-title-large text-[var(--md-sys-color-on-surface)]"
        >
          {title}
        </h2>
        <p className="mt-1 text-body-medium text-[var(--md-sys-color-on-surface-variant)]">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close feedback dialog"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--md-sys-color-on-surface-variant)] transition-colors duration-short4 ease-standard hover:bg-[var(--md-sys-color-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]"
      >
        <X size={20} />
      </button>
    </div>
  );
}

export function FeedbackDialog({ isOpen, onClose }: FeedbackDialogProps) {
  const [submitted, setSubmitted] = useState(false);
  const headingId = "feedback-dialog-heading";
  const isMobile = useMediaQuery("(max-width: 639px)");

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  const title = submitted ? "Feedback sent" : "Submit Feedback";
  const description = submitted
    ? "Your note is on its way."
    : "Let me know if you have found a bug, or if you have any feedback!";

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        aria-labelledby={headingId}
      >
        <DialogHeading
          title={title}
          description={description}
          headingId={headingId}
          onClose={handleClose}
        />
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
      hideCloseButton
      aria-labelledby={headingId}
      classNames={{
        base: "rounded-[28px] bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] shadow-elevation-3",
        backdrop: "bg-black/40",
        header: "border-b-0 p-0",
        body: "p-0",
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader>
              <DialogHeading
                title={title}
                description={description}
                headingId={headingId}
                onClose={handleClose}
              />
            </ModalHeader>
            {submitted ? (
              <ModalBody>
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
