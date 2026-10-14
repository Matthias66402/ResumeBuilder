import type { Modifier } from "@dnd-kit/core";

/** Keeps dragged list entries on their column (same as @dnd-kit/modifiers, without the extra package). */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });
