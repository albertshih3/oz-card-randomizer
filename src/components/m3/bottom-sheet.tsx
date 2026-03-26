import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  "aria-labelledby"?: string;
}

export function BottomSheet(props: BottomSheetProps) {
  const { isOpen, onClose, children } = props;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="m3-bs-backdrop"
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="m3-bs-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={props["aria-labelledby"]}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "var(--md-sys-color-surface)" }}
            variants={{
              hidden: { y: "100%" },
              visible: {
                y: 0,
                transition: { duration: 0.4, ease: [0.05, 0.7, 0.1, 1.0] },
              },
              exit: {
                y: "100%",
                transition: { duration: 0.25, ease: [0.3, 0, 1, 1] },
              },
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div
                className="w-8 h-1 rounded-full"
                style={{
                  backgroundColor: "var(--md-sys-color-outline-variant)",
                }}
              />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
