// Evio Airlines — check-in kiosk constants. Black & white only, no accent color.

export const PASSPORT_COUNT = 3;

// Curated destination pool — one is picked at random on check-in. Edit freely.
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
];

// Picks a destination, avoiding whatever was just shown (`exclude`) 9 times
// out of 10 — pure chance alone repeats far more often than it feels like it
// should over a night of back-to-back guests, so this pushes the odds toward
// variety instead of leaving it to chance.
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
