// Evio Airlines — check-in kiosk constants. Black & white only, no accent color.

export const PASSPORT_COUNT = 3;

// Curated destination pool — one is shown on check-in. Edit freely; the
// no-repeat logic below works with any list length.
export const DESTINATIONS = [
  "TOKYO",
  "PARIS",
  "BALI",
  "REYKJAVÍK",
  "CAPE TOWN",
  "ROME",
  "KYOTO",
  "MARRAKECH",
  "QUEENSTOWN",
  "LISBON",
  "SANTORINI",
  "BANFF",
  "BANGKOK",
  "AMALFI COAST",
  "DUBAI",
  "BUENOS AIRES",
  "ZERMATT",
  "HAVANA",
  "MALDIVES",
  "VANCOUVER",
  "SYDNEY",
  "BARCELONA",
  "VENICE",
  "SEOUL",
  "SINGAPORE",
  "AMSTERDAM",
  "PRAGUE",
  "MYKONOS",
  "LOS ANGELES",
  "NEW YORK",
  "LONDON",
  "EDINBURGH",
  "NAIROBI",
  "MADRID",
  "VIENNA",
  "COPENHAGEN",
  "DUBROVNIK",
  "PORTO",
  "ATHENS",
  "FIJI",
];

// Fisher–Yates — an unbiased shuffle, not just "sort by random".
function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// The destination actually shown to a guest draws from a shuffled "bag" that
// deals out every destination once before any of them repeat — a genuine
// guarantee of a different destination every single time, not just better
// odds. When the bag empties it's reshuffled, with a check so the new lap
// can't happen to start on the same destination that just ended the last one.
let bag = [];
let lastDispensed = null;
export function pickNextDestination() {
  if (bag.length === 0) {
    bag = shuffle(DESTINATIONS);
    if (bag.length > 1 && bag[0] === lastDispensed) {
      [bag[0], bag[1]] = [bag[1], bag[0]];
    }
  }
  lastDispensed = bag.shift();
  return lastDispensed;
}

// Used only for the departure-board's rapid decoy flicker during the roll —
// this just needs to avoid repeating itself from one flicker to the next,
// not the strict guarantee above (nobody's tracking those for variety).
export function pickDestination(exclude) {
  const pool =
    exclude && Math.random() < 0.9 ? DESTINATIONS.filter((d) => d !== exclude) : DESTINATIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// A little personalization for the reveal — echoes the fields on the physical
// boarding pass (gate / seat / flight) without meaning anything functionally.
export function randomFlightDetails() {
  const gate = 1 + Math.floor(Math.random() * 24);
  const row = 1 + Math.floor(Math.random() * 30);
  const seatLetter = "ABCDEF"[Math.floor(Math.random() * 6)];
  const flightNum = 100 + Math.floor(Math.random() * 900);
  return { gate, seat: `${row}${seatLetter}`, flight: `EV${flightNum}` };
}
