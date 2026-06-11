// gedeelde drag & drop payload voor dugout ↔ bracket-slots
export type DragPayload =
  | { name: string; from: "dugout" }
  | { name: string; from: "slot"; r: number; m: number; s: number };

export function setDragPayload(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.setData("text/plain", JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

export function getDragPayload(e: React.DragEvent): DragPayload | null {
  try {
    const p = JSON.parse(e.dataTransfer.getData("text/plain"));
    if (p && typeof p.name === "string" && p.name && (p.from === "dugout" || p.from === "slot")) return p;
  } catch {
    /* geen geldige payload */
  }
  return null;
}
