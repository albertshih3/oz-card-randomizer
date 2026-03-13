import clsx from "clsx";

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
  const colorMap: Record<string, string> = {
    childrenszoo: "bg-teal-500 text-white",
    tropicalrainforest: "bg-purple-300 text-purple-900", // Lavender-ish
    coo: "bg-red-900 text-white", // Maroon
    booatthezoo: "bg-orange-500 text-white",
    californiatrail: "bg-orange-400 text-white",
    africansavanna: "bg-lime-400 text-black", // Greenish Yellow
    australia: "bg-yellow-500 text-black", // Golden Yellow
    specialedition: "bg-yellow-500 text-black", // Mapping Special Edition to Golden Yellow as requested/inferred
  };

  // Normalize collection ID to lowercase and remove spaces to match keys
  const normalizedId = collection.toLowerCase().replace(/\s+/g, "");

  const colorClass = colorMap[normalizedId] || "bg-primary/10 text-primary";

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
