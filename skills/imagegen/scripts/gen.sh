#!/usr/bin/env bash
# imagegen/gen.sh
#
# Generates or edits images via gpt-image-2 by shelling out to the local
# `codex` CLI (logged into the user's ChatGPT subscription).
#
# Usage:
#   bash gen.sh --prompt "<text>" --out /abs/out.png
#   bash gen.sh --prompt "<text>" --ref /abs/ref1.png [--ref /abs/ref2.png ...] --out /abs/out.png
#
# Optional:
#   --timeout-sec 300   (default 300)
#   --transparent       enable chroma-key workflow (gpt-image-2 has no native
#                       transparent background — see references/codex-cli.md)
#   --key-color #rrggbb chroma-key color, default #00ff00; use #ff00ff for
#                       green subjects; avoid #0000ff for blue subjects
#
# Exit codes:
#   0 success
#   2 bad args
#   3 `codex` or `python3` missing
#   4 --ref file missing
#   5 `codex exec` failed (auth/network/model)
#   6 no new session rollout detected
#   7 imagegen produced no image payload
#   8 chroma-key removal failed (Pillow missing, or no transparent area)

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
EXTRACT_PY="${SCRIPT_DIR}/extract_image.py"
REMOVE_KEY_PY="${SCRIPT_DIR}/remove_chroma_key.py"

PROMPT=""
OUT=""
TIMEOUT_SEC=300
REFS=()
TRANSPARENT=0
KEY_COLOR="#00ff00"
KEY_COLOR_USER_SET=0

usage() {
  cat <<'EOF' >&2
gen.sh: generate or edit an image with gpt-image-2 via the Codex CLI.

  --prompt <text>         (required) structured prompt to send to imagegen
  --out <path>            (required) absolute path for the output image
  --ref <path>            (optional, repeatable) reference image to attach
  --timeout-sec <n>       (optional, default 300) hard timeout for codex exec
  --transparent           (optional) generate on a chroma-key background and
                          convert that key to alpha locally. gpt-image-2 has
                          no native background=transparent support.
  --key-color <#rrggbb>   (optional, default #00ff00) chroma-key color used
                          when --transparent is set. Pick a color absent
                          from the subject (e.g. #ff00ff for green subjects).
  -h | --help             show this help

Requires `codex` (logged in via `codex login`) and `python3` on PATH.
`--transparent` additionally requires the Pillow Python package.
This skill never reads OPENAI_API_KEY.
EOF
}

err() { printf 'gen.sh: %s\n' "$*" >&2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt)
      [[ $# -ge 2 ]] || { err "--prompt requires a value"; exit 2; }
      PROMPT="$2"; shift 2;;
    --out)
      [[ $# -ge 2 ]] || { err "--out requires a value"; exit 2; }
      OUT="$2"; shift 2;;
    --ref)
      [[ $# -ge 2 ]] || { err "--ref requires a value"; exit 2; }
      REFS+=("$2"); shift 2;;
    --timeout-sec)
      [[ $# -ge 2 ]] || { err "--timeout-sec requires a value"; exit 2; }
      TIMEOUT_SEC="$2"; shift 2;;
    --transparent)
      TRANSPARENT=1; shift 1;;
    --key-color)
      [[ $# -ge 2 ]] || { err "--key-color requires a value"; exit 2; }
      KEY_COLOR="$2"; KEY_COLOR_USER_SET=1; shift 2;;
    -h|--help)
      usage; exit 0;;
    *)
      err "unknown arg: $1"; usage; exit 2;;
  esac
done

if [[ "$TRANSPARENT" -eq 1 ]]; then
  if [[ ! "$KEY_COLOR" =~ ^#[0-9A-Fa-f]{6}$ ]]; then
    err "--key-color must be #rrggbb, got: $KEY_COLOR"
    exit 2
  fi
fi

if [[ -z "$PROMPT" ]]; then
  err "missing --prompt"; usage; exit 2
fi
if [[ -z "$OUT" ]]; then
  err "missing --out"; usage; exit 2
fi

case "$OUT" in
  /*|[A-Za-z]:[\\/]*) ;;
  *)
    err "--out must be an absolute path: $OUT"; exit 2;;
esac

if ! command -v codex >/dev/null 2>&1; then
  err "codex CLI not found on PATH; install from https://github.com/openai/codex and run 'codex login'"
  exit 3
fi
if ! command -v python3 >/dev/null 2>&1; then
  err "python3 not found on PATH"
  exit 3
fi

for ref in "${REFS[@]+"${REFS[@]}"}"; do
  if [[ ! -f "$ref" ]]; then
    err "--ref file does not exist: $ref"
    exit 4
  fi
done

OUT_DIR="$(dirname -- "$OUT")"
mkdir -p "$OUT_DIR"

SESSIONS_DIR="${HOME}/.codex/sessions"
mkdir -p "$SESSIONS_DIR"

LOG_FILE="$(mktemp -t imagegen-codex-XXXXXX.log)"
BEFORE_FILE="$(mktemp -t imagegen-before-XXXXXX.list)"
AFTER_FILE="$(mktemp -t imagegen-after-XXXXXX.list)"
NEW_FILE="$(mktemp -t imagegen-new-XXXXXX.list)"
RAW_FILE=""
if [[ "$TRANSPARENT" -eq 1 ]]; then
  # When chroma-keying, extract_image.py writes the keyed source here; the
  # final alpha PNG goes to $OUT after remove_chroma_key.py runs.
  RAW_FILE="$(mktemp -t imagegen-raw-XXXXXX.png)"
fi

cleanup() {
  rm -f "$LOG_FILE" "$BEFORE_FILE" "$AFTER_FILE" "$NEW_FILE" 2>/dev/null || true
  if [[ -n "$RAW_FILE" ]]; then
    rm -f "$RAW_FILE" 2>/dev/null || true
  fi
}
trap cleanup EXIT

(cd "$SESSIONS_DIR" && find . -type f -name '*.jsonl' 2>/dev/null | sort) > "$BEFORE_FILE" || true

FINAL_PROMPT="$PROMPT"
if [[ "$TRANSPARENT" -eq 1 ]]; then
  # gpt-image-2 does not support background=transparent. We emulate native
  # transparency by forcing a flat solid chroma-key background and then
  # removing it locally with remove_chroma_key.py. The augmentation below is
  # appended (not prepended) so the user's structured prompt schema is
  # preserved as the primary signal.
  FINAL_PROMPT="${PROMPT}

Background (chroma-key, mandatory): the entire background must be one perfectly flat solid color, exactly ${KEY_COLOR}. The background color must be uniform with NO gradient, NO shadow, NO contact shadow, NO reflection, NO floor plane, NO vignette, NO texture, and NO lighting variation. The subject must be fully separated from the background with crisp edges and generous symmetric padding (~10-12% on each side). Do NOT use ${KEY_COLOR} anywhere in the subject itself. Do not output a checkerboard transparency placeholder. Do not output a white or off-white background under any circumstance."
fi

CODEX_PROMPT=$(cat <<EOF
Call the imagegen tool exactly once with the prompt below, verbatim and unmodified, then stop.

Do not paraphrase, summarize, translate, or augment. Do not write any files yourself; the imagegen tool's payload is enough.

--- BEGIN PROMPT ---
${FINAL_PROMPT}
--- END PROMPT ---
EOF
)

CODEX_ARGS=(exec --enable image_generation --sandbox read-only --skip-git-repo-check)
for ref in "${REFS[@]+"${REFS[@]}"}"; do
  CODEX_ARGS+=(-i "$ref")
done
CODEX_ARGS+=(-)

set +e
if command -v timeout >/dev/null 2>&1; then
  printf '%s' "$CODEX_PROMPT" | timeout "${TIMEOUT_SEC}s" codex "${CODEX_ARGS[@]}" >"$LOG_FILE" 2>&1
else
  printf '%s' "$CODEX_PROMPT" | codex "${CODEX_ARGS[@]}" >"$LOG_FILE" 2>&1
fi
CODEX_RC=$?
set -e

if [[ $CODEX_RC -ne 0 ]]; then
  err "codex exec failed (rc=${CODEX_RC}; likely auth, network, or model). See: $LOG_FILE"
  trap - EXIT
  exit 5
fi

(cd "$SESSIONS_DIR" && find . -type f -name '*.jsonl' 2>/dev/null | sort) > "$AFTER_FILE" || true
comm -13 "$BEFORE_FILE" "$AFTER_FILE" > "$NEW_FILE" || true

NEW_COUNT="$(wc -l < "$NEW_FILE" | tr -d ' ')"
if [[ "${NEW_COUNT:-0}" -eq 0 ]]; then
  err "no new session rollout detected under ${SESSIONS_DIR}"
  exit 6
fi

NEW_PATHS=()
while IFS= read -r rel; do
  [[ -z "$rel" ]] && continue
  NEW_PATHS+=("${SESSIONS_DIR}/${rel#./}")
done < "$NEW_FILE"

EXTRACT_OUT="$OUT"
if [[ "$TRANSPARENT" -eq 1 ]]; then
  EXTRACT_OUT="$RAW_FILE"
fi

set +e
python3 "$EXTRACT_PY" --out "$EXTRACT_OUT" --rollouts "${NEW_PATHS[@]}"
EX_RC=$?
set -e

case "$EX_RC" in
  0) ;;
  7)
    err "imagegen produced no image payload (feature flag off, quota exceeded, or capability refused)"
    exit 7;;
  *)
    err "extract_image.py failed (rc=${EX_RC})"
    exit "$EX_RC";;
esac

if [[ "$TRANSPARENT" -eq 1 ]]; then
  # Build remove_chroma_key arg list. If the user passed an explicit
  # --key-color, honor it. Otherwise rely on --auto-key border so the
  # script samples the *actual* background color the model produced
  # (which is rarely a perfect match for the prompted hex).
  RK_ARGS=(
    --input "$RAW_FILE"
    --out "$OUT"
    --auto-key border
    --transparent-threshold 18
    --opaque-threshold 80
    --despill
    --edge-feather 0.5
    --edge-contract 1
  )
  if [[ "$KEY_COLOR_USER_SET" -eq 1 ]]; then
    RK_ARGS+=(--key-color "$KEY_COLOR")
  fi
  set +e
  python3 "$REMOVE_KEY_PY" "${RK_ARGS[@]}"
  RK_RC=$?
  set -e

  case "$RK_RC" in
    0)
      printf '%s\n' "$OUT"
      exit 0;;
    3)
      err "chroma-key removal failed: Pillow is required. Install with 'python3 -m pip install --user pillow'."
      exit 8;;
    7)
      err "chroma-key removal validation failed (no transparent area). The model likely ignored the chroma-key instruction. Try a different --key-color or rerun."
      exit 8;;
    *)
      err "remove_chroma_key.py failed (rc=${RK_RC})"
      exit 8;;
  esac
fi

printf '%s\n' "$OUT"
exit 0
