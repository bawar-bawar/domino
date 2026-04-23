# dominos — Multiplayer Dominoes

A cozy multiplayer dominoes room — classic green-felt-and-wood aesthetic.
Built with Next.js (App Router), Tailwind CSS, and Socket.io for real-time play.

## Features

- **Lobby** — create or join a room with a 4-letter code. Pick your avatar and play-to score.
- **Game table** — animated chain, opponent seats with face-down tiles, your hand with playable-tile glows, turn timer, draw/pass, left/right end chooser, table chat + game log.
- **End screen** — scoreboard with progress to target, round recap, rematch or back to lobby.
- **Classic Draw** variant, 2–4 players, highest double opens, correct draw/pass logic, blocked-board detection, pip-count scoring.
- **Real-time multiplayer** over Socket.io. Empty seats are filled with bots when the host starts the game, so solo play works out of the box.
- **Tweaks panel** (⚙ button bottom-left) — felt color (forest/midnight/clay), board zoom, show/hide chat.

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

To test real multiplayer locally, open the URL in a second browser window: create a room in one, copy the 4-letter code, join from the other.

## Project structure

```
app/
  globals.css         - Tailwind layers + shared background utilities
  layout.jsx          - Root layout (fonts)
  page.jsx            - Top-level client: socket connection + screen state machine
components/
  Tile.jsx            - SVG domino tile
  Lobby.jsx           - Home / create / join panels
  GameTable.jsx       - Felt, opponent seats, chain, hand, chat dock
  EndScreen.jsx       - Scoreboard + round recap
  TweaksPanel.jsx     - Felt color, zoom, difficulty, chat toggle
lib/
  domino-engine.js    - Shared game rules (isomorphic)
  game-server.js      - Socket.io room + game state machine, bot AI
server.js             - Custom Next.js server attaching Socket.io
```

## Socket protocol

| Event (client → server) | Payload | Effect |
|---|---|---|
| `createRoom` | `{ name, avatar, seats, points }` | Host creates room, returns `{ code }` |
| `joinRoom` | `{ code, name, avatar }` | Join existing room |
| `startGame` | — | Host starts the round; empty seats filled with bots |
| `playTile` | `{ tileId, side }` | Place a tile at `'left'` or `'right'` |
| `drawTile` | — | Draw from boneyard until playable or empty |
| `passTurn` | — | Pass (only if no legal move and boneyard is empty) |
| `chat` | `{ text }` | Broadcast chat message |
| `nextRound` | `{ newMatch }` | Host advances to next round / new match |
| `leaveRoom` | — | Leave the current room |

| Event (server → client) | Payload |
|---|---|
| `roomUpdate` | `{ code, seats, points, members, hostId, started }` |
| `gameStart` | `{ round }` |
| `stateUpdate` | Per-socket filtered view: `{ players, myIdx, myHand, handCounts, chain, turn, boneyardCount, log, totals, pointsTarget }` |
| `chat` | `{ who, avatar, text, ts }` |
| `roundOver` | `{ winnerIdx, pts, reason, totals, matchWinner, players, chain, ... }` |

Each player receives only their own hand; opponents' tiles are broadcast as counts only.
