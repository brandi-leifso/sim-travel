// EVIO wordmark — set in type, not an image, so it stays crisp at kiosk scale
// and inherits color (black on white screens, white on the black reveal screen).
export default function EvioMark({ size = 28, className = "", style = {} }) {
  return (
    <span className={"evio-mark " + className} style={{ fontSize: size, ...style }}>
      EVIO<span className="evio-mark-tm">™</span>
    </span>
  );
}
