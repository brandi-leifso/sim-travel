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

export function pickDestination() {
  return DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
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
