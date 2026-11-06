import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export interface Card {
  id: string;
  name: string;
  number: string;
  collection: string;
  active: boolean;
  collectionName?: string;
}

export type Collection = {
  id: string;
  name: string;
  isWildcardEligible?: boolean;
};

export type CardsByCollection = { [collectionId: string]: Card[] };

export type PackSlotKind = "base" | "wildcard" | "spoonbill";

/** One of the ten logical positions in a pack. An empty slot has no card. */
export type PackSlot = {
  kind: PackSlotKind;
  label: string;
  card: Card | null;
};

export type GeneratedPack = {
  slots: PackSlot[];
};

export type PackHistoryItem = {
  id: string;
  timestamp: Date;
  cards: Card[];
  /** Labels of slots that had no card when the pack was generated. */
  missing: string[];
};
