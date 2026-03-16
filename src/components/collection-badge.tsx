import clsx from "clsx";
import { COLLECTION_COLORS } from "@/constants/collections";

interface CollectionBadgeProps {
  collection: string; // ID
  name: string; // Display Name
  className?: string;
}

export const CollectionBadge = ({
  collection,
  name,
  className,
}: CollectionBadgeProps) => {
  // Normalize collection ID to lowercase and remove spaces to match keys
  const normalizedId = collection.toLowerCase().replace(/\s+/g, "");

  const colorClass =
    COLLECTION_COLORS[normalizedId] || "bg-primary/10 text-primary";

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        colorClass,
        className,
      )}
    >
      {name}
    </span>
  );
};
