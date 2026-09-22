// Foil text — gold gradient clipped to the glyphs (animate via .ge-shimmer).
export default function Foil({ children, style = {}, className = "" }) {
  return (
    <span
      className={"ge-foil " + className}
      style={{
        backgroundImage:
          "linear-gradient(100deg, #B8912F 0%, #F7C96F 28%, #FFF4DC 46%, #F7C96F 60%, #CB9B54 78%, #F7C96F 100%)",
        backgroundSize: "220% 100%",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
