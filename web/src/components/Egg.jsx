// The numbered egg tile. variant: available | miss | golden | hero
export default function Egg({ n, variant = "available", selected = false, onClick, style = {}, big = false }) {
  return (
    <button
      type="button"
      className={
        "ge-egg ge-egg-" +
        variant +
        (selected ? " is-selected" : "") +
        (big ? " ge-egg-big" : "")
      }
      onClick={onClick}
      disabled={variant !== "available" || !onClick}
      style={style}
      aria-label={"Egg " + n}
    >
      <span className="ge-egg-shell">
        <span className="ge-egg-speck" aria-hidden="true" />
        <span className="ge-egg-shine" aria-hidden="true" />
        <span className="ge-egg-num">{n}</span>
        {variant === "miss" && <span className="ge-egg-crack" aria-hidden="true" />}
      </span>
    </button>
  );
}
