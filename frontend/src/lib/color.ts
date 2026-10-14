/** Reactive Resume stores colors as "rgba(r, g, b, a)"; <input type="color"> needs "#rrggbb". */

export function rgbaToHex(rgba: string): string {
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return rgba.startsWith("#") ? rgba.slice(0, 7) : "#000000";
  return "#" + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}

export function hexToRgba(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 1)`;
}
