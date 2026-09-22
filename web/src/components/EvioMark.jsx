import evioLogo from "../assets/evio-logo.png";

// The real Evio brand lockup (transparent PNG) — sized by height, aspect
// ratio preserved. Renders black by default; screens on a dark background
// (the reveal screen) invert it to white via the `.ek-reveal .evio-mark` CSS
// rule rather than needing a second asset.
export default function EvioMark({ size = 28, className = "", style = {} }) {
  return (
    <img
      src={evioLogo}
      alt="Evio"
      className={"evio-mark " + className}
      style={{ height: size, width: "auto", display: "block", ...style }}
    />
  );
}
