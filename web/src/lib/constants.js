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
  { city: "Rome", country: "Italy" },
  { city: "Venice", country: "Italy" },
  { city: "Amalfi Coast", country: "Italy" },
  { city: "Berlin", country: "Germany" },
  { city: "Munich", country: "Germany" },
  { city: "Melbourne", country: "Australia" },
  { city: "Sydney", country: "Australia" },
  { city: "Bora Bora", country: "French Polynesia" },
  { city: "Nadi", country: "Fiji" },
  { city: "Phuket", country: "Thailand" },
  { city: "Bangkok", country: "Thailand" },
  { city: "Istanbul", country: "Turkey" },
  { city: "Ibiza", country: "Spain" },
  { city: "Seville", country: "Spain" },
  { city: "Granada", country: "Spain" },
  { city: "Barcelona", country: "Spain" },
  { city: "Nice", country: "France" },
  { city: "Provence", country: "France" },
  { city: "Bordeaux", country: "France" },
  { city: "Paris", country: "France" },
  { city: "London", country: "United Kingdom" },
  { city: "Edinburgh", country: "United Kingdom" },
  { city: "Dublin", country: "Ireland" },
  { city: "Oslo", country: "Norway" },
  { city: "Stockholm", country: "Sweden" },
  { city: "Helsinki", country: "Finland" },
  { city: "Budapest", country: "Hungary" },
  { city: "Vienna", country: "Austria" },
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Prague", country: "Czech Republic" },
  { city: "Athens", country: "Greece" },
  { city: "Santorini", country: "Greece" },
  { city: "Mykonos", country: "Greece" },
  { city: "Dubrovnik", country: "Croatia" },
  { city: "Casablanca", country: "Morocco" },
  { city: "Marrakech", country: "Morocco" },
  { city: "Cape Town", country: "South Africa" },
  { city: "Zanzibar", country: "Tanzania" },
  { city: "Dubai", country: "United Arab Emirates" },
  { city: "Malé", country: "Maldives" },
  { city: "Cartagena", country: "Colombia" },
  { city: "Medellín", country: "Colombia" },
  { city: "Rio de Janeiro", country: "Brazil" },
  { city: "Buenos Aires", country: "Argentina" },
  { city: "Nassau", country: "Bahamas" },
  { city: "Punta Cana", country: "Dominican Republic" },
  { city: "Montego Bay", country: "Jamaica" },
  { city: "Oranjestad", country: "Aruba" },
  { city: "Providenciales", country: "Turks and Caicos" },
  { city: "Cancún", country: "Mexico" },
  { city: "Mexico City", country: "Mexico" },
  { city: "Montreal", country: "Canada" },
  { city: "Whistler", country: "Canada" },
  { city: "Nashville", country: "USA" },
  { city: "New York City", country: "USA" },
  { city: "Los Angeles", country: "USA" },
  { city: "Miami", country: "USA" },
  { city: "Las Vegas", country: "USA" },
  { city: "New Orleans", country: "USA" },
  { city: "Maui", country: "USA" },
  { city: "Bali", country: "Indonesia" },
  { city: "Kyoto", country: "Japan" },
  { city: "Tokyo", country: "Japan" },
  { city: "Seoul", country: "South Korea" },
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
