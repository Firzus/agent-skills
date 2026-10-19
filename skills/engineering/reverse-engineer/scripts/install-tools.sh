#!/bin/sh
# Installs optional third-party tools of the reverse-engineer skill into the per-user tools root
# ($REVERSE_ENGINEER_TOOLS, or the macOS/Linux default below). No admin rights, no PATH change:
# the reverse-engineer tools look there first. Needs curl, tar and unzip.
# Usage: sh install-tools.sh jdk ghidra jadx ilspycmd   (any subset)
set -eu

[ "$#" -gt 0 ] || { echo "usage: $0 jdk|ghidra|jadx|ilspycmd ..." >&2; exit 2; }
case "$(uname -s)" in
  Darwin) os=mac; default="$HOME/Library/Application Support/reverse-engineer/tools" ;;
  Linux) os=linux; default="${XDG_DATA_HOME:-$HOME/.local/share}/reverse-engineer/tools" ;;
  *) echo "unsupported system $(uname -s); on Windows use install-tools.ps1" >&2; exit 2 ;;
esac
root="${REVERSE_ENGINEER_TOOLS:-$default}"
case "$(uname -m)" in arm64 | aarch64) arch=aarch64 ;; *) arch=x64 ;; esac
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Prints the download URL of the latest release asset of $1 matching the regex $2.
release() {
  url="$(curl -fsSL "https://api.github.com/repos/$1/releases/latest" | grep -o '"browser_download_url": *"[^"]*"' |
    cut -d'"' -f4 | grep -E "$2" | head -n 1)" || true
  [ -n "$url" ] || { echo "no release asset matching $2 in $1" >&2; exit 1; }
  printf '%s\n' "$url"
}

# Downloads $1 and extracts it into $2 (zip by extension, else tar.gz).
fetch() {
  curl -fsSL -o "$tmp/archive" "$1"
  mkdir -p "$2"
  case "$1" in
    *.zip) unzip -qo "$tmp/archive" -d "$2" ;;
    *) tar -xzf "$tmp/archive" -C "$2" ;;
  esac
  rm -f "$tmp/archive"
}

for tool in "$@"; do
  case "$tool" in
    jdk) fetch "https://api.adoptium.net/v3/binary/latest/21/ga/$os/$arch/jdk/hotspot/normal/eclipse" "$root" ;;
    ghidra)
      url="$(release NationalSecurityAgency/ghidra '\.zip$')"
      fetch "$url" "$root"
      ;;
    jadx)
      # The CLI archive, not jadx-gui.
      url="$(release skylot/jadx '/jadx-[0-9.]+\.zip$')"
      fetch "$url" "$root/jadx"
      chmod +x "$root/jadx/bin/jadx" "$root/jadx/bin/jadx-gui"
      ;;
    ilspycmd)
      # Reuse an installed .NET 10+ SDK, else install one into the tools root.
      if command -v dotnet >/dev/null 2>&1 && dotnet --list-sdks | grep -qE '^[1-9][0-9]\.'; then
        dotnet=dotnet
      else
        curl -fsSL -o "$tmp/dotnet-install.sh" https://dot.net/v1/dotnet-install.sh
        bash "$tmp/dotnet-install.sh" --channel 10.0 --install-dir "$root/dotnet"
        dotnet="$root/dotnet/dotnet"
      fi
      "$dotnet" tool update ilspycmd --tool-path "$root/dotnet-tools"
      ;;
    *) echo "unknown tool $tool (jdk, ghidra, jadx, ilspycmd)" >&2; exit 2 ;;
  esac
  echo "installed $tool into $root"
done
