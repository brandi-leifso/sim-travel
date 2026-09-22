import Foil from "../components/Foil.jsx";
import VClubMark from "../components/VClubMark.jsx";

// Landing chooser at "/". Keeps the live big-screen behind an explicit click so
// nobody lands on the room display by accident.
export default function Home() {
  return (
    <div className="ge-home">
      <VClubMark height={56} />
      <div>
        <div className="ge-home-kicker">Spring Series · Main Event Day 1B</div>
        <h1 className="ge-home-title">
          <Foil>Golden Egg</Foil> Rebuy
        </h1>
      </div>
      <div className="ge-home-cards">
        <a className="ge-home-card" href="/display">
          <h2>Public Display</h2>
          <p>The big screen the room watches. Open on the venue TV and tap to go live.</p>
        </a>
        <a className="ge-home-card" href="/admin">
          <h2>Floor Control</h2>
          <p>The operator's phone. Arm the egg the player calls, then reveal.</p>
        </a>
      </div>
      <div className="ge-home-note">
        Standalone promo — no live VClub data is touched. Outcomes are for show; award refunds
        manually at the cage.
      </div>
    </div>
  );
}
