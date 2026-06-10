import { logoColor } from "@/lib/bracket";
import type { Game } from "@/lib/types";

export default function GameHeading({ game }: { game: Game }) {
  return (
    <h3 className="mb-2.5 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
      <span className="h-2 w-2 rounded-sm" style={{ background: logoColor(game.name) }} />
      {game.name}
    </h3>
  );
}
