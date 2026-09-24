// Evio Airlines — check-in kiosk constants. Black & white only, no accent color.

export const PASSPORT_COUNT = 3;

// Curated destination pool — one is shown on check-in, city and country both.
// Display casing (uppercase, tracked) is handled entirely in CSS, so these
// read normally here. Edit freely; the no-repeat logic below works with any
// list length.
export const DESTINATIONS = [
  { city: "Zurich", country: "Switzerland" },
  { city: "Milan", country: "Italy" },
  { city: "Florence", country: "Italy" },
  { city: "Berlin", country: "Germany" },
  { city: "Munich", country: "Germany" },
  { city: "Melbourne", country: "Australia" },
  { city: "Auckland", country: "New Zealand" },
  { city: "Bora Bora", country: "French Polynesia" },
  { city: "Phuket", country: "Thailand" },
  { city: "Hanoi", country: "Vietnam" },
  { city: "Jaipur", country: "India" },
  { city: "Mumbai", country: "India" },
  { city: "Cairo", country: "Egypt" },
  { city: "Petra", country: "Jordan" },
  { city: "Tel Aviv", country: "Israel" },
  { city: "Istanbul", country: "Turkey" },
  { city: "Cappadocia", country: "Turkey" },
  { city: "Ibiza", country: "Spain" },
  { city: "Seville", country: "Spain" },
  { city: "Granada", country: "Spain" },
  { city: "Nice", country: "France" },
  { city: "Provence", country: "France" },
  { city: "Bordeaux", country: "France" },
  { city: "Oslo", country: "Norway" },
  { city: "Bergen", country: "Norway" },
  { city: "Stockholm", country: "Sweden" },
  { city: "Helsinki", country: "Finland" },
  { city: "Tallinn", country: "Estonia" },
  { city: "Budapest", country: "Hungary" },
  { city: "Krakow", country: "Poland" },
  { city: "Zagreb", country: "Croatia" },
  { city: "Split", country: "Croatia" },
  { city: "Fes", country: "Morocco" },
  { city: "Casablanca", country: "Morocco" },
  { city: "Victoria Falls", country: "Zambia" },
  { city: "Zanzibar", country: "Tanzania" },
  { city: "Mahé", country: "Seychelles" },
  { city: "Port Louis", country: "Mauritius" },
  { city: "Cartagena", country: "Colombia" },
  { city: "Medellín", country: "Colombia" },
  { city: "Cusco", country: "Peru" },
  { city: "Rio de Janeiro", country: "Brazil" },
  { city: "Santiago", country: "Chile" },
  { city: "Quito", country: "Ecuador" },
  { city: "Nassau", country: "Bahamas" },
  { city: "Punta Cana", country: "Dominican Republic" },
  { city: "Montreal", country: "Canada" },
  { city: "Quebec City", country: "Canada" },
  { city: "Whistler", country: "Canada" },
  { city: "Nashville", country: "USA" },
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
    if (bag.length > 1 && bag[0].city === lastDispensed?.city) {
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
    exclude && Math.random() < 0.9
      ? DESTINATIONS.filter((d) => d.city !== exclude.city)
      : DESTINATIONS;
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
