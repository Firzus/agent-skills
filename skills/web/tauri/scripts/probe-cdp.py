#!/usr/bin/env python3
"""Probe local Chrome DevTools Protocol endpoints for Tauri webviews."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request


def fetch_json(url: str, timeout: float) -> object | None:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError):
        return None


def parse_ports(raw_ports: str) -> list[int]:
    ports: list[int] = []
    for raw_port in raw_ports.split(","):
        raw_port = raw_port.strip()
        if not raw_port:
            continue
        try:
            ports.append(int(raw_port))
        except ValueError:
            raise argparse.ArgumentTypeError(f"invalid port: {raw_port}") from None
    return ports


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Probe local CDP endpoints and report browser/page targets."
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="host to probe (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--ports",
        default="9222,9223,9229",
        help="comma-separated ports to probe (default: 9222,9223,9229)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=1.0,
        help="request timeout in seconds (default: 1.0)",
    )
    args = parser.parse_args()

    found_page = False
    ports = parse_ports(args.ports)

    for port in ports:
        base_url = f"http://{args.host}:{port}"
        version = fetch_json(f"{base_url}/json/version", args.timeout)
        targets = fetch_json(f"{base_url}/json/list", args.timeout)

        if version is None and targets is None:
            continue

        print(f"CDP endpoint: {base_url}")
        if isinstance(version, dict):
            browser = version.get("Browser", "unknown")
            protocol = version.get("Protocol-Version", "unknown")
            websocket = version.get("webSocketDebuggerUrl")
            print(f"  Browser: {browser}")
            print(f"  Protocol-Version: {protocol}")
            if websocket:
                print(f"  Browser WebSocket: {websocket}")

        if isinstance(targets, list) and targets:
            print("  Targets:")
            for target in targets:
                if not isinstance(target, dict):
                    continue
                target_type = target.get("type", "unknown")
                title = target.get("title", "")
                url = target.get("url", "")
                websocket = target.get("webSocketDebuggerUrl", "")
                print(f"  - type={target_type} title={title!r} url={url}")
                if websocket:
                    print(f"    webSocketDebuggerUrl={websocket}")
                if target_type == "page":
                    found_page = True

    if not found_page:
        print("No CDP page targets found.", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
