#!/usr/bin/env python3
"""Check whether a Tauri devUrl is already serving before launching the app."""

from __future__ import annotations

import argparse
import socket
import sys
import urllib.parse
import urllib.request


def parse_host_port(raw_url: str) -> tuple[str, int]:
    parsed = urllib.parse.urlparse(raw_url)
    if not parsed.scheme or not parsed.hostname:
        raise argparse.ArgumentTypeError(f"invalid URL: {raw_url}")

    if parsed.port is not None:
        port = parsed.port
    elif parsed.scheme == "https":
        port = 443
    else:
        port = 80

    return parsed.hostname, port


def port_is_open(host: str, port: int, timeout: float) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check whether a configured Tauri devUrl is already in use."
    )
    parser.add_argument("dev_url", help="devUrl from src-tauri/tauri.conf.json")
    parser.add_argument(
        "--timeout",
        type=float,
        default=1.0,
        help="connection timeout in seconds (default: 1.0)",
    )
    args = parser.parse_args()

    host, port = parse_host_port(args.dev_url)
    if port_is_open(host, port, args.timeout):
        print(f"IN_USE {args.dev_url} ({host}:{port})")
        return 1

    print(f"AVAILABLE {args.dev_url} ({host}:{port})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
