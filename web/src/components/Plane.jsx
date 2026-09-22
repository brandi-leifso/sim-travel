// A simple flat airplane silhouette — the app's one recurring travel motif.
// Uses currentColor so it can be recolored via CSS `color`.
export default function Plane({ size = 20, className = "", style = {} }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={style}
      aria-hidden="true"
    >
      <path d="M21 15.5v-2l-8-5V4a1.5 1.5 0 0 0-3 0v4.5l-8 5v2l8-2.5V18l-2.5 1.8V21l4-1.2 4 1.2v-1.2L13.5 18v-5.5l7.5 2.5z" />
    </svg>
  );
}
