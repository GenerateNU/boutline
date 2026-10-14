export type Side = "left" | "right";

export interface BoutFencer {
  name: string;
  club: string;
  score: number;
}

export interface Touch {
  time: string;
  scorer: Side;
  leftScore: number;
  rightScore: number;
}

export interface Bout {
  id: string;
  stage: "pool" | "tableau";
  round: string;
  left: BoutFencer;
  right: BoutFencer;
  audit: Touch[];
}
