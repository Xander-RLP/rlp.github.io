#!/usr/bin/env python3
"""RLP26 multi-game bracket server — stdlib only, no dependencies.

Lokale admin-API naast `next dev` (de Next-app proxiet /api/* hierheen):
  POST /api/login  {username, password} -> {token}
  GET  /api/games                       -> all games with their brackets
  POST /api/games  (Bearer)             -> save all games

Inloggegevens komen uit .env (RLP_ADMIN_USER / RLP_ADMIN_PASSWORD).
"""
import json
import os
import re
import secrets
import urllib.parse
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_env():
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


load_env()

PORT = int(os.environ.get("RLP_PORT", 8080))
DATA_FILE = ROOT / "public" / "data.json"
USERNAME = os.environ.get("RLP_ADMIN_USER", "admin")
PASSWORD = os.environ.get("RLP_ADMIN_PASSWORD", "rlp-admin")

TOKENS = set()


def empty_bracket():
    # rounds of 8/4/2/1 matches, two empty team slots each
    return {
        "rounds": [
            [{"teams": [{"name": "", "score": None}, {"name": "", "score": None}]}
             for _ in range(n)]
            for n in (8, 4, 2, 1)
        ]
    }


def default_state():
    return {
        "games": [{
            "id": "cs2-wingman",
            "name": "CS2 Wingman",
            "format": "Counter-Strike 2 · 2v2 Wingman · Single Elimination",
            "bracket": empty_bracket(),
        }]
    }


def load_state():
    if DATA_FILE.exists():
        try:
            data = json.loads(DATA_FILE.read_text())
            if "rounds" in data:  # migrate pre-multi-game file: bare bracket -> CS2 game
                state = default_state()
                state["games"][0]["bracket"] = {"rounds": data["rounds"]}
                save_state(state)
                return state
            if "games" in data:
                return data
        except (json.JSONDecodeError, OSError):
            pass
    return default_state()


def save_state(data):
    DATA_FILE.write_text(json.dumps(data, indent=2))


def valid_bracket(bracket):
    try:
        rounds = bracket["rounds"]
        first = len(rounds[0]) if rounds else 0
        # 4..32 teams, power of two, rounds halving down to the final
        if first < 2 or first > 16 or first & (first - 1):
            return False
        expected, n = [], first
        while n >= 1:
            expected.append(n)
            n //= 2
        if [len(r) for r in rounds] != expected:
            return False
        for rnd in rounds:
            for match in rnd:
                teams = match["teams"]
                if len(teams) != 2:
                    return False
                for t in teams:
                    if not isinstance(t.get("name", ""), str):
                        return False
                    if not (t.get("score") is None or isinstance(t["score"], int)):
                        return False
        return True
    except (KeyError, TypeError):
        return False


def valid_seats(data):
    seats = data.get("seats", [])
    unseated = data.get("unseated", [])
    if not isinstance(seats, list) or not isinstance(unseated, list):
        return False
    for s in seats:
        if not (isinstance(s.get("id"), str) and s["id"]):
            return False
        if s.get("side") not in ("top", "left", "right", "bottom"):
            return False
        if not isinstance(s.get("name", ""), str):
            return False
    return all(isinstance(n, str) for n in unseated)


def valid_state(data):
    try:
        if not valid_seats(data):
            return False
        games = data["games"]
        if not isinstance(games, list) or not games:
            return False
        ids = set()
        for game in games:
            if not (isinstance(game.get("id"), str) and game["id"]):
                return False
            if not (isinstance(game.get("name"), str) and game["name"].strip()):
                return False
            if not isinstance(game.get("format", ""), str):
                return False
            if not isinstance(game.get("start") or "", str):
                return False
            if not isinstance(game.get("image") or "", str):
                return False
            if game.get("type") not in (None, "bracket", "race"):
                return False
            if not isinstance(game.get("description") or "", str):
                return False
            race = game.get("race")
            if race is not None:
                if not isinstance(race.get("goalLabel"), str):
                    return False
                if not isinstance(race.get("target"), (int, float)):
                    return False
                for p in race.get("participants", []):
                    if not (isinstance(p.get("name"), str) and isinstance(p.get("progress"), (int, float))):
                        return False
            if game["id"] in ids:
                return False
            ids.add(game["id"])
            if not valid_bracket(game["bracket"]):
                return False
        return True
    except (KeyError, TypeError):
        return False


WIKI_API = "https://en.wikipedia.org/w/api.php"
USER_AGENT = "RLP26-bracket-site/1.0 (LAN party tournament site)"


def _wiki_thumbnail(search):
    params = urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": search, "gsrlimit": 5,
        "prop": "pageimages", "piprop": "thumbnail", "pithumbsize": 512,
    })
    req = urllib.request.Request(f"{WIKI_API}?{params}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=10) as res:
        data = json.loads(res.read())
    pages = (data.get("query") or {}).get("pages") or {}
    # in zoekvolgorde: eerste resultaat mét thumbnail wint
    for page in sorted(pages.values(), key=lambda p: p.get("index", 99)):
        thumb = (page.get("thumbnail") or {}).get("source")
        if thumb:
            return thumb
    return None


def _steam_image(query):
    """Fallback: zoek de game in de Steam-store en pak de header-afbeelding."""
    params = urllib.parse.urlencode({"term": query, "cc": "NL", "l": "en"})
    req = urllib.request.Request(
        f"https://store.steampowered.com/api/storesearch/?{params}",
        headers={"User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=10) as res:
        data = json.loads(res.read())
    items = data.get("items") or []
    if not items:
        return None
    appid = items[0]["id"]
    return f"https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/header.jpg"


def find_game_image(query, game_id):
    """Zoek het spel op Wikipedia (en anders Steam) en sla de afbeelding lokaal op."""
    thumb = _wiki_thumbnail(query) or _wiki_thumbnail(f"{query} video game") or _steam_image(query)
    if not thumb:
        return None
    ext = re.search(r"\.(png|jpe?g|gif|webp)", thumb, re.I)
    ext = ext.group(1).lower().replace("jpeg", "jpg") if ext else "png"
    img_dir = ROOT / "public" / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    safe_id = re.sub(r"[^a-z0-9-]", "", game_id)
    dest = img_dir / f"{safe_id}.{ext}"
    img_req = urllib.request.Request(thumb, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(img_req, timeout=15) as img:
        dest.write_bytes(img.read())
    return f"/images/{dest.name}"


class Handler(SimpleHTTPRequestHandler):
    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self):
        auth = self.headers.get("Authorization", "")
        return auth.startswith("Bearer ") and auth[7:] in TOKENS

    def do_GET(self):
        if self.path == "/api/games":
            self._json(load_state())
        else:
            super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return self._json({"error": "bad json"}, 400)

        if self.path == "/api/login":
            user_ok = secrets.compare_digest(str(body.get("username", "")), USERNAME)
            pass_ok = secrets.compare_digest(str(body.get("password", "")), PASSWORD)
            if user_ok and pass_ok:
                token = secrets.token_hex(16)
                TOKENS.add(token)
                return self._json({"token": token})
            return self._json({"error": "invalid credentials"}, 401)

        if self.path == "/api/games":
            if not self._authorized():
                return self._json({"error": "unauthorized"}, 401)
            if not valid_state(body):
                return self._json({"error": "invalid state"}, 400)
            save_state(body)
            return self._json({"ok": True})

        if self.path == "/api/seat":
            # stoel claimen mag zonder login (LAN); vrijgeven (lege naam) alleen als admin
            seat_id = str(body.get("seatId", "")).strip()
            name = str(body.get("name", "")).strip()[:24]
            state = load_state()
            seats = state.get("seats") or []
            seat = next((s for s in seats if s["id"] == seat_id), None)
            if not seat:
                return self._json({"error": "stoel bestaat niet"}, 404)
            is_admin = self._authorized()
            if not name:
                # stoel intrekken mag iedereen; naam terug naar de pool
                if seat.get("name"):
                    state.setdefault("unseated", []).append(seat["name"])
                seat["name"] = ""
            else:
                if seat.get("name"):
                    return self._json({"error": "deze stoel is al bezet"}, 409)
                unseated = state.get("unseated") or []
                in_pool = any(n.lower() == name.lower() for n in unseated)
                if not is_admin and not in_pool:
                    # zonder admin alleen de eerste plaatsing vanuit de pool; daarna is het vast
                    return self._json({"error": "alleen de admin kan stoelen wijzigen"}, 403)
                for s in seats:  # verhuizen (admin): oude stoel vrijgeven
                    if s.get("name", "").lower() == name.lower():
                        s["name"] = ""
                seat["name"] = name
                state["unseated"] = [n for n in unseated if n.lower() != name.lower()]
            save_state(state)
            return self._json({"ok": True})

        if self.path == "/api/game-image":
            if not self._authorized():
                return self._json({"error": "unauthorized"}, 401)
            query = str(body.get("query", "")).strip()
            game_id = str(body.get("gameId", "")).strip()
            if not query or not game_id:
                return self._json({"error": "query en gameId vereist"}, 400)
            try:
                image = find_game_image(query, game_id)
            except Exception as exc:  # netwerk/parsing — meld het gewoon
                return self._json({"error": f"zoeken mislukt: {exc}"}, 502)
            if not image:
                return self._json({"error": "geen afbeelding gevonden"}, 404)
            return self._json({"image": image})

        return self._json({"error": "not found"}, 404)

    def log_message(self, fmt, *args):
        pass  # keep the console quiet


def main():
    handler = partial(Handler, directory=str(ROOT / "public"))
    with ThreadingHTTPServer(("0.0.0.0", PORT), handler) as httpd:
        print(f"RLP26 admin-API op http://localhost:{PORT} — frontend draait via `npm run dev` op :3000")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
