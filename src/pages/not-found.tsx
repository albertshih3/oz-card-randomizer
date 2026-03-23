import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@heroui/button";

const M3_EMPHASIZED_DECELERATE: [number, number, number, number] = [
  0.05, 0.7, 0.1, 1.0,
];

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--md-sys-color-surface)" }}
    >
      <motion.p
        className="text-[10rem] font-bold leading-none select-none"
        style={{ color: "var(--md-sys-color-primary)" }}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: M3_EMPHASIZED_DECELERATE }}
      >
        404
      </motion.p>

      <motion.h1
        className="text-3xl font-semibold mt-4"
        style={{ color: "var(--md-sys-color-on-surface)" }}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: M3_EMPHASIZED_DECELERATE,
          delay: 0.1,
        }}
      >
        Page not found
      </motion.h1>

      <motion.p
        className="text-base mt-2 text-center max-w-md"
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: M3_EMPHASIZED_DECELERATE,
          delay: 0.2,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: M3_EMPHASIZED_DECELERATE,
          delay: 0.3,
        }}
        className="mt-8"
      >
        <Button color="primary" onPress={() => navigate("/")}>
          Go home
        </Button>
      </motion.div>
    </div>
  );
}
