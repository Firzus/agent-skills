#!/usr/bin/env python3
"""Scripted reference player for RuinsGame, through turn.py like a model would play.

  ruins_solver.py <project> <turn log>

Run it after `turn.py install` and `Restart()`. It proves the quest is still
winnable after a fixture change and gives a baseline with no thinking time.
"""

import json
import math
import pathlib
import subprocess
import sys

TURN = str(pathlib.Path(__file__).resolve().parent.parent / "scripts" / "turn.py")
PROJECT, LOG = sys.argv[1], sys.argv[2]
turns = 0


def turn(controls, frames):
    global turns
    turns += 1
    done = subprocess.run([sys.executable, TURN, "--project", PROJECT, "--log", LOG, controls, str(frames)],
                          capture_output=True, text=True, encoding="utf-8")
    if done.returncode != 0:
        sys.exit(done.stderr)
    obs = json.loads(done.stdout)["obs"]
    player = obs["player"]
    print(turns, controls, frames, "->", player["pos"], "hp", player["hp"], obs["lastEvent"], "|", obs["objective"], flush=True)
    return obs


def thing(obs, name):
    return next((x for x in obs["things"] if x["id"] == name), None)


def turn_by(obs, bearing):
    if abs(bearing) < 2:
        return obs
    frames = max(1, round(abs(bearing)))
    return turn("~%s,0" % format(bearing / frames / 0.2, ".3f"), frames)


def walk(obs, distance):
    return turn("W", max(1, min(50, round(distance / 4 * 50 + 1))))


def go_point(obs, x, z, stop):
    for _ in range(8):
        px, _, pz = obs["player"]["pos"]
        distance = math.hypot(x - px, z - pz)
        if distance <= stop:
            return obs
        heading = math.degrees(math.atan2(x - px, z - pz))
        obs = turn_by(obs, (heading - obs["player"]["yaw"] + 540) % 360 - 180)
        obs = walk(obs, distance - stop)
    return obs


def go(obs, name, stop):
    for _ in range(12):
        target = thing(obs, name)
        if target is None:
            return obs
        if target["pos"][2] > 2.5 and obs["player"]["pos"][2] < 2.0:
            obs = go_point(obs, 0.0, 0.5, 0.4)
            obs = go_point(obs, 0.0, 4.0, 0.4)
        obs = turn_by(obs, thing(obs, name)["bearing"])
        distance = thing(obs, name)["dist"]
        if distance <= stop:
            return obs
        obs = walk(obs, distance - stop)
    return obs


obs = turn("-", 0)
obs = go(obs, "key", 1.6)
obs = turn_by(obs, thing(obs, "key")["bearing"])
obs = turn("W+Space", 20)
obs = turn("-", 10)
obs = turn("E", 2)
obs = turn("S+Space", 20)
obs = go(obs, "gate", 1.8)
obs = turn("E", 2)
for enemy in ["skeletonA", "skeletonB"]:
    for _ in range(25):
        if thing(obs, enemy) is None:
            break
        obs = go(obs, enemy, 1.5)
        if thing(obs, enemy) is None:
            break
        obs = turn_by(obs, thing(obs, enemy)["bearing"])
        obs = turn("mouse.left", 31)
        if obs["player"]["hp"] < 45 and obs["player"]["potions"] > 0:
            obs = turn("Q", 2)
obs = go(obs, "chest", 1.5)
obs = turn("E", 2)
print("RESULT", obs["status"], "turns", turns, "deaths", obs["deaths"], "game time", obs["time"])
