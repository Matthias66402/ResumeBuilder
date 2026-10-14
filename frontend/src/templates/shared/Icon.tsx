/** A Phosphor icon from the icon font (@phosphor-icons/web), so any stored icon name renders. */
export default function Icon({ name, color, className = "" }: { name: string; color?: string; className?: string }) {
  if (!name.trim()) return null;
  return <i aria-hidden className={`ph ph-${name} rb-icon ${className}`} style={color ? { color } : undefined} />;
}
