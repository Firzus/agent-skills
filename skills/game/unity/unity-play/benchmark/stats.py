#!/usr/bin/env python3
"""Summarize turn.py --log files: one line per run, from the first turn to the last.

  stats.py <folder with one <run>.jsonl per run>

think/turn is the mean gap between two turns: the model's decision time plus
its harness overhead. cli is the time spent inside turn.py.
"""

import json
import pathlib
import sys


def main():
    for path in sorted(pathlib.Path(sys.argv[1]).glob("*.jsonl")):
        rows = [json.loads(line) for line in path.open(encoding="utf-8") if line.strip()]
        if not rows:
            continue
        obs = {}
        replies = [r["reply"] for r in rows if r["rc"] == 0]
        try:
            obs = json.loads(replies[-1]).get("obs") or {}
        except (json.JSONDecodeError, AttributeError, IndexError):
            pass
        gaps = [b["start"] - a["end"] for a, b in zip(rows, rows[1:])]
        print(
            f"{path.stem}: status={obs.get('status') if isinstance(obs, dict) else None}"
            f" turns={len(rows)} errors={sum(r['rc'] != 0 for r in rows)}"
            f" wall={rows[-1]['end'] - rows[0]['start']:.1f}s"
            f" cli={sum(r['end'] - r['start'] for r in rows):.1f}s"
            f" think/turn={(sum(gaps) / len(gaps)) if gaps else 0:.1f}s"
        )


if __name__ == "__main__":
    main()
