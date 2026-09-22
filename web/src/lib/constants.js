// Golden Egg Rebuy — shared constants, tokens, board model & persistence.
// VClub palette: gold #D4A843, bright #F7C96F, deep #B8912F, pale #FFE7C4.

export const G = {
  gold: "#D4A843",
  goldBright: "#F7C96F",
  goldDeep: "#B8912F",
  goldPale: "#FFE7C4",
  cream: "#F3E9D6",
  bg: "#161514",
  ink: "#0C0C0C",
  text: "#F5F1E8",
  sub: "#A89F8C",
  muted: "#6A6256",
};

export const TOTAL_EGGS = 50;
export const GOLDEN_COUNT = 5;
export const BUYIN = 590; // Main Event Day 1B buy-in (Spring Series schedule)

export const money = (n) => "$" + Number(n).toLocaleString("en-US");

// Seed a fresh board: 50 eggs, GOLDEN_COUNT of them golden, randomly placed.
export function freshBoard() {
  const goldenSet = new Set();
  while (goldenSet.size < GOLDEN_COUNT) {
    goldenSet.add(1 + Math.floor(Math.random() * TOTAL_EGGS));
  }
  return Array.from({ length: TOTAL_EGGS }, (_, i) => ({
    n: i + 1,
    isGolden: goldenSet.has(i + 1),
    status: "available", // available | miss | golden
  }));
}

// ── Board persistence (Display is authoritative; survives a refresh). ──
const GE_STORE = "vc_golden_eggs_v2";

export function loadBoard() {
  try {
    const raw = localStorage.getItem(GE_STORE);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === TOTAL_EGGS) return arr;
    }
  } catch (e) {}
  const b = freshBoard();
  try {
    localStorage.setItem(GE_STORE, JSON.stringify(b));
  } catch (e) {}
  return b;
}

export function persistBoard(arr) {
  try {
    localStorage.setItem(GE_STORE, JSON.stringify(arr));
  } catch (e) {}
}
