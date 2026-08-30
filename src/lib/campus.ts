export type CampusId = "fsu" | "uf" | "famu";

export const CAMPUSES: {
  id: CampusId;
  short: string;
  name: string;
  colors: [string, string];
}[] = [
  { id: "fsu", short: "FSU", name: "Florida State", colors: ["#782F40", "#CEB888"] },
  { id: "uf", short: "UF", name: "University of Florida", colors: ["#0021A5", "#FA4616"] },
  { id: "famu", short: "FAMU", name: "Florida A&M", colors: ["#137A45", "#F49B21"] },
];

export type Market = {
  id: string;
  category: string;
  question: string;
  yes: number;
  closes: string;
  predicting: number;
  delta: string;
};

export const MARKETS: Market[] = [
  {
    id: "m1",
    category: "Sports",
    question: "Will FSU beat UF in the rivalry game Saturday?",
    yes: 68,
    closes: "04H 17M",
    predicting: 100,
    delta: "+14% TODAY",
  },
  {
    id: "m2",
    category: "Campus Chaos",
    question: "Will someone get chased by a goose near Landis Green before Friday?",
    yes: 82,
    closes: "28H 59M",
    predicting: 100,
    delta: "+281% TODAY",
  },
  {
    id: "m3",
    category: "Campus",
    question: "Will Strozier Library close early tonight?",
    yes: 21,
    closes: "00H 41M",
    predicting: 64,
    delta: "+9% TODAY",
  },
  {
    id: "m4",
    category: "Politics",
    question: "Will the SGA senate bill pass on first vote?",
    yes: 47,
    closes: "12H 05M",
    predicting: 213,
    delta: "+42% TODAY",
  },
];

export const CONFIDENCE = [25, 50, 100, 250];

const KEY = "edubet.campus";

export function getStoredCampus(): CampusId {
  if (typeof window === "undefined") return "fsu";
  const v = window.localStorage.getItem(KEY);
  return (CAMPUSES.find((c) => c.id === v)?.id ?? "fsu") as CampusId;
}

export function storeCampus(id: CampusId) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, id);
}
