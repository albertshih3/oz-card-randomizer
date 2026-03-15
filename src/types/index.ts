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

export type PackHistoryItem = {
  id: string;
  timestamp: Date;
  cards: Card[];
};
