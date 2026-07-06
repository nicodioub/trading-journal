import { format } from "date-fns";

interface ChessComGame {
  end_time: number;
  white: { username: string; result: string };
  black: { username: string; result: string };
}

interface ChessComArchiveResponse {
  games: ChessComGame[];
}

const LOSS_RESULTS = new Set([
  "checkmated",
  "resigned",
  "timeout",
  "abandoned",
  "lose",
]);

export interface ChessComDailyResult {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
}

/**
 * Pulls the player's public monthly archive from the Chess.com API and tallies
 * games that ended on `date` (yyyy-MM-dd). No auth needed — it's a public,
 * unauthenticated endpoint.
 */
export async function fetchChessComDailyResult(
  username: string,
  date: string,
): Promise<ChessComDailyResult> {
  const [year, month] = date.split("-");
  const res = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/${year}/${month}`,
  );
  if (!res.ok) {
    throw new Error(`Chess.com returned ${res.status} for "${username}"`);
  }
  const data = (await res.json()) as ChessComArchiveResponse;
  const lowerUsername = username.toLowerCase();

  let gamesPlayed = 0;
  let gamesWon = 0;
  let gamesLost = 0;

  for (const game of data.games ?? []) {
    const gameDate = format(new Date(game.end_time * 1000), "yyyy-MM-dd");
    if (gameDate !== date) continue;

    const isWhite = game.white.username.toLowerCase() === lowerUsername;
    const result = isWhite ? game.white.result : game.black.result;

    gamesPlayed += 1;
    if (result === "win") gamesWon += 1;
    else if (LOSS_RESULTS.has(result)) gamesLost += 1;
  }

  return { gamesPlayed, gamesWon, gamesLost };
}
