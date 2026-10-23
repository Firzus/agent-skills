#!/usr/bin/env bash
#
# Interactive runbook: guides a person through manual steps, one stage at a
# time. Created from the runbook skill template.
#
# Layout: LIBRARY (shared by every runbook, leave as is), then TEXT (interface
# strings, translated into the reader's language), then STAGES (this runbook's
# procedure). Run with --dry-run to preview every screen without side effects.
# Environment: ENV_FILE (default .env), NO_COLOR, FORCE_COLOR.

# shellcheck disable=SC2059  # TXT_* strings are printf formats by design.
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════
# LIBRARY
# ══════════════════════════════════════════════════════════════════════════

DRY_RUN=0
TOTAL_STAGES=0          # set by the STAGES section
RUNBOOK_TITLE="Runbook" # set by banner
ENV_FILE="${ENV_FILE:-.env}"
_STAGE=0
_STEP=0
_TMP=""         # env file copy being written, removed on stop
SAVED_ENV=()    # keys written to ENV_FILE
SAVED_SECRET=() # GitHub secrets set
SAVED_VAR=()    # GitHub variables set
TODO_WHAT=()    # manual follow-ups: description...
TODO_CMD=()     # ...and the command that performs it

_init_colors() {
  local on=0 n
  if [[ -n "${NO_COLOR:-}" ]]; then
    on=0
  elif [[ -n "${FORCE_COLOR:-}" ]]; then
    [[ "$FORCE_COLOR" == 0 ]] || on=1
  elif [[ -t 1 && "${TERM:-dumb}" != dumb ]]; then
    n=$(tput colors 2>/dev/null) || n=0
    [[ "$n" =~ ^[0-9]+$ ]] || n=0  # tput prints -1 for no colour
    (( n < 8 )) || on=1
  fi
  if (( on )); then
    BOLD=$'\e[1m' DIM=$'\e[2m' RESET=$'\e[0m'
    ACCENT=$'\e[36m' GREEN=$'\e[32m' YELLOW=$'\e[33m' RED=$'\e[31m'
  else
    BOLD="" DIM="" RESET="" ACCENT="" GREEN="" YELLOW="" RED=""
  fi
}

# _width: text area width in columns (36 to 72).
_width() {
  local cols
  cols=$(tput cols 2>/dev/null) || cols="${COLUMNS:-80}"
  [[ "$cols" =~ ^[0-9]+$ ]] || cols=80
  (( cols <= 76 )) || cols=76
  (( cols >= 40 )) || cols=40
  printf '%s' $(( cols - 4 ))
}

# _len TEXT: character count, independent of the locale (counts every byte
# that does not continue a UTF-8 sequence).
_len() { printf '%s' "$1" | LC_ALL=C tr -d '\200-\277' | wc -c | tr -d ' '; }

# _repeat CHAR COUNT
_repeat() {
  local fill
  (( $2 > 0 )) || return 0
  printf -v fill '%*s' "$2" ''
  printf '%s' "${fill// /$1}"
}

# _wrap WIDTH TEXT: TEXT folded at spaces, trailing blanks removed.
_wrap() { printf '%s\n' "$2" | fold -s -w "$1" | sed 's/[[:space:]]*$//'; }

# _line GLYPH TEXT: TEXT wrapped beside a one-column glyph.
_line() {
  local glyph="$1" row lead
  lead="  $glyph  "
  while IFS= read -r row; do
    printf '%s%s\n' "$lead" "$row"
    lead="     "
  done < <(_wrap $(( $(_width) - 3 )) "$2")
}

# _raw GLYPH TEXT: like _line but never wrapped, so URLs and commands stay
# whole for copying and link detection.
_raw() { printf '  %s  %s\n' "$1" "$2"; }

# _quote VALUE: VALUE as one single-quoted shell word.
_quote() { local q="'\\''"; printf "'%s'" "${1//\'/$q}"; }

# _word ARG: ARG as typed in a shell, quoted only when needed.
_word() {
  if [[ "$1" =~ ^[A-Za-z0-9_./:=@%+,-]+$ ]]; then printf '%s' "$1"; else _quote "$1"; fi
}

# _echo_piped TEXT: shows input read from a pipe, which no terminal echoes,
# so a scripted rehearsal reads like a real session.
_echo_piped() { [[ -t 0 ]] || printf '%s\n' "$1"; }

_clear() {
  [[ -t 1 ]] || return 0
  tput clear 2>/dev/null || printf '\033[H\033[2J\033[3J'
}

_header() {
  local width count gap done_cols=0
  width=$(_width)
  printf -v count "$TXT_STAGE_OF" "$_STAGE" "$TOTAL_STAGES"
  gap=$(( width - $(_len "$RUNBOOK_TITLE") - $(_len "$count") ))
  (( gap >= 1 )) || gap=1
  (( TOTAL_STAGES == 0 )) || done_cols=$(( width * _STAGE / TOTAL_STAGES ))
  (( done_cols <= width )) || done_cols=$width
  printf '\n  %s%s%s%*s%s%s%s\n' "$BOLD" "$RUNBOOK_TITLE" "$RESET" "$gap" '' "$DIM" "$count" "$RESET"
  printf '  %s%s%s%s%s%s\n' "$ACCENT" "$(_repeat ━ "$done_cols")" "$RESET" \
    "$DIM" "$(_repeat ─ $(( width - done_cols )))" "$RESET"
}

# _stop STATUS: explains where the runbook stopped, then exits with STATUS.
_stop() {
  local text
  stty echo 2>/dev/null || true
  [[ -z "$_TMP" ]] || rm -f "$_TMP"
  if (( _STAGE == 0 )); then text="$TXT_STOPPED_BEFORE"
  else printf -v text "$TXT_STOPPED_AT" "$_STAGE" "$TOTAL_STAGES"; fi
  if (( DRY_RUN )); then
    text+=" $TXT_DRY_NOTHING"
  elif (( ${#SAVED_ENV[@]} )); then
    printf -v text "%s $TXT_RESUME" "$text" "$ENV_FILE"
  fi
  printf '\n'
  _line "$YELLOW■$RESET" "$text"
  printf '\n'
  exit "$1"
}

# banner "Title" ["Purpose"]: opening screen.
banner() {
  local meta
  RUNBOOK_TITLE="$1"
  _clear
  printf -v meta "$TXT_INTRO_META" "$TOTAL_STAGES"
  printf '\n  %s%s◆%s %s%s%s\n' "$BOLD" "$ACCENT" "$RESET" "$BOLD" "$RUNBOOK_TITLE" "$RESET"
  _dim "$meta"
  printf '\n'
  if [[ -n "${2:-}" ]]; then say "$2"; printf '\n'; fi
  say "$TXT_INTRO"
  if (( DRY_RUN )); then printf '\n'; _line "$YELLOW◇$RESET" "$YELLOW$TXT_DRY_RUN$RESET"; fi
  pause "$TXT_START"
}

# stage "Name": new screen with progress, then the stage name.
stage() {
  _clear
  _STAGE=$(( _STAGE + 1 ))
  _STEP=0
  _header
  printf '\n  %s%s%s\n' "$BOLD" "$1" "$RESET"
}

say()  { _wrap "$(_width)" "$1" | sed 's/^/  /'; }
# _dim TEXT: a wrapped secondary paragraph.
_dim() {
  local row
  while IFS= read -r row; do printf '  %s%s%s\n' "$DIM" "$row" "$RESET"; done < <(_wrap "$(_width)" "$1")
}
step() { _STEP=$(( _STEP + 1 )); _line "$ACCENT$_STEP$RESET" "$1"; }
note() { _line " " "$DIM$1$RESET"; }
warn() { _line "$YELLOW▲$RESET" "$YELLOW$1$RESET"; }
# code "...": a URL, command or value to copy, on its own unwrapped line.
code() { printf '     %s%s%s\n' "$ACCENT" "$1" "$RESET"; }

# open_url URL: shows URL and opens it in the default browser.
open_url() {
  local url="$1" opener
  printf '\n'
  if (( DRY_RUN )); then _raw "$ACCENT↗$RESET" "$url $DIM$TXT_NOT_OPENED$RESET"; return 0; fi
  _raw "$ACCENT↗$RESET" "$url"
  for opener in wslview explorer.exe xdg-open open; do
    command -v "$opener" >/dev/null 2>&1 || continue
    if [[ "$opener" == explorer.exe ]]; then
      explorer.exe "$url" >/dev/null 2>&1 || true  # exits 1 even on success
      return 0
    fi
    "$opener" "$url" >/dev/null 2>&1 && return 0
  done
  note "$TXT_OPEN_FAILED"
}

# pause ["Message"]: waits for Enter.
pause() {
  local reply=""
  printf '\n  %s↵  %s%s ' "$DIM" "${1:-$TXT_CONTINUE}" "$RESET"
  read -r reply || [[ -n "$reply" ]] || _stop 1
  _echo_piped "$reply"
}

# confirm "Question": yes/no gate; succeeds only on an explicit yes.
confirm() {
  local reply=""
  printf '\n  %s?%s  %s%s%s %s%s%s ' "$YELLOW" "$RESET" "$BOLD" "$1" "$RESET" "$DIM" "$TXT_YES_NO" "$RESET"
  read -r reply || [[ -n "$reply" ]] || _stop 1
  _echo_piped "$reply"
  [[ "$reply" =~ $TXT_YES ]]
}

# _env_get KEY: KEY's value in ENV_FILE (last definition wins). Fails when the
# key is absent or the value can't be decoded safely (shell escapes, or quotes
# followed by a comment), so the runbook asks for it again.
_env_get() {
  local line value="" found=0 q="'\\''" sq="'"
  [[ -f "$ENV_FILE" ]] || return 1
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    line="${line#export }"
    if [[ "$line" == "$1="* ]]; then value="${line#"$1="}"; found=1; fi
  done < "$ENV_FILE"
  (( found )) || return 1
  value="${value#"${value%%[![:space:]]*}"}"     # leading blanks
  if (( ${#value} >= 2 )) && [[ "$value" == \'*\' ]]; then
    value="${value:1:${#value}-2}"
    [[ "${value//"$q"/}" != *\'* ]] || return 1  # e.g. 'a' # comment
    value="${value//"$q"/$sq}"  # $sq, not \', also works in bash < 4.3
  elif (( ${#value} >= 2 )) && [[ "$value" == \"*\" ]]; then
    value="${value:1:${#value}-2}"
    case "$value" in *[\\\$\"\`]*) return 1 ;; esac
  else
    [[ "$value" != [\'\"]* ]] || return 1
    value="${value%%[[:space:]]#*}"              # drop an inline comment
    value="${value%"${value##*[![:space:]]}"}"   # and trailing blanks
  fi
  printf '%s' "$value"
}

# _env_fail TEXT [PATH]: reports a failed env file write, then stops.
_env_fail() {
  _line "$RED✗$RESET" "$RED$1$RESET"
  [[ -z "${2:-}" ]] || code "$2"
  _stop 1
}

# _env_put KEY VALUE: replaces every KEY line (with or without export) in
# ENV_FILE with KEY='VALUE'. A new file is private (0600); an existing one
# keeps its mode and links. The new content is prepared in a private copy
# beside it; no signal can interrupt the final write, and a failed write keeps
# the copy and names it.
_env_put() {
  local line key_part text copy
  printf -v text "$TXT_ENV_NOT_WRITABLE" "$ENV_FILE"
  [[ -e "$ENV_FILE" ]] || (umask 077; : > "$ENV_FILE") 2>/dev/null || _env_fail "$text"
  [[ -f "$ENV_FILE" && -r "$ENV_FILE" ]] || _env_fail "$text"
  _TMP="$ENV_FILE.runbook-$$"
  (umask 077; : > "$_TMP") 2>/dev/null || { _TMP=""; _env_fail "$text"; }
  while IFS= read -r line || [[ -n "$line" ]]; do
    key_part="${line%$'\r'}"
    [[ "${key_part#export }" == "$1="* ]] || printf '%s\n' "$line"
  done < "$ENV_FILE" > "$_TMP"
  printf '%s=%s\n' "$1" "$(_quote "$2")" >> "$_TMP"
  trap '' INT HUP TERM
  if ! cat "$_TMP" > "$ENV_FILE"; then
    copy="$_TMP"
    _TMP=""
    SAVED_ENV=()  # the env file may be truncated: the copy is what's valid
    printf -v text "$TXT_ENV_WRITE_FAILED" "$ENV_FILE"
    _env_fail "$text" "$copy"  # still ignoring signals until it exits
  fi
  SAVED_ENV+=("$1")
  _trap_stops
  rm -f "$_TMP"
  _TMP=""
}

# _prompt_line PROMPT: reads one line into _REPLY; Readline edits it on a
# terminal. End of input stops the runbook.
_prompt_line() {
  local s=$'\001' e=$'\002'
  _REPLY=""
  if [[ -t 0 ]]; then
    read -e -r -p "$1" _REPLY || [[ -n "$_REPLY" ]] || _stop 1
  else
    printf '%s' "${1//[$s$e]/}"
    read -r _REPLY || [[ -n "$_REPLY" ]] || _stop 1
    printf '%s\n' "$_REPLY"
  fi
}

# ask KEY "Label": visible value into $KEY. On a re-run, Enter keeps the value
# already saved in ENV_FILE.
ask() {
  local saved hint="" s=$'\001' e=$'\002'
  saved=$(_env_get "$1") || saved=""
  [[ -z "$saved" ]] || printf -v hint "$TXT_KEEP_VALUE" "$saved"
  # \001 and \002 tell Readline which bytes are invisible colour codes.
  _prompt_line "  $s$ACCENT$e›$s$RESET$e  $s$BOLD$e$2$s$RESET$e  ${hint:+$s$DIM$e$hint$s$RESET$e }"
  printf -v "$1" '%s' "${_REPLY:-$saved}"
}

# ask_secret KEY "Label": like ask, with hidden input; only the length is shown.
ask_secret() {
  local saved input="" received
  saved=$(_env_get "$1") || saved=""
  printf '  %s›%s  %s%s%s  ' "$ACCENT" "$RESET" "$BOLD" "$2" "$RESET"
  [[ -z "$saved" ]] || printf '%s%s%s ' "$DIM" "$TXT_KEEP_SECRET" "$RESET"
  read -rs input || [[ -n "$input" ]] || _stop 1
  printf '\n'
  if [[ -z "$input" && -n "$saved" ]]; then
    input="$saved"
    note "$TXT_KEPT_SECRET"
  else
    printf -v received "$TXT_RECEIVED" "$(_len "$input")"
    note "$(_repeat • 8) $received"
  fi
  printf -v "$1" '%s' "$input"
}

# _status GLYPH NAME TEXT [ARG]: NAME followed by a dim status message. TEXT is
# a printf format only when ARG is given.
_status() {
  local text="$3"
  (( $# < 4 )) || printf -v text "$3" "$4"
  _line "$1" "$2 $DIM$text$RESET"
}

_gh_ready() { command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; }

# _todo NAME WHAT_FORMAT COMMAND REASON: records a manual follow-up.
_todo() {
  local what
  printf -v what "$2" "$1"
  TODO_WHAT+=("$what")
  TODO_CMD+=("$3")
  _status "$YELLOW▲$RESET" "$1" "$4"
}

# write_env KEY VALUE: saves KEY to ENV_FILE and sets $KEY.
write_env() {
  printf -v "$1" '%s' "$2"
  if (( DRY_RUN )); then
    SAVED_ENV+=("$1"); _status "$GREEN✓$RESET" "$1" "$TXT_ENV_DRY" "$ENV_FILE"; return 0
  fi
  _env_put "$1" "$2"
  _status "$GREEN✓$RESET" "$1" "$TXT_ENV_SAVED" "$ENV_FILE"
}

# set_secret NAME VALUE: GitHub Actions secret, or a manual follow-up.
set_secret() {
  if (( DRY_RUN )); then
    SAVED_SECRET+=("$1"); _status "$GREEN✓$RESET" "$1" "$TXT_SECRET_DRY"; return 0
  fi
  if ! _gh_ready; then
    _todo "$1" "$TXT_SECRET_TODO" "gh secret set $1" "$TXT_GH_NOT_READY"
  elif printf '%s' "$2" | gh secret set "$1" >/dev/null 2>&1; then
    SAVED_SECRET+=("$1"); _status "$GREEN✓$RESET" "$1" "$TXT_SECRET_SET"
  else
    _todo "$1" "$TXT_SECRET_TODO" "gh secret set $1" "$TXT_GH_FAILED"
  fi
}

# set_var NAME VALUE: GitHub Actions variable, or a manual follow-up.
set_var() {
  local cmd
  cmd="gh variable set $1 --body $(_quote "$2")"
  if (( DRY_RUN )); then
    SAVED_VAR+=("$1"); _status "$GREEN✓$RESET" "$1" "$TXT_VAR_DRY"; return 0
  fi
  if ! _gh_ready; then
    _todo "$1" "$TXT_VAR_TODO" "$cmd" "$TXT_GH_NOT_READY"
  elif gh variable set "$1" --body "$2" >/dev/null 2>&1; then
    SAVED_VAR+=("$1"); _status "$GREEN✓$RESET" "$1" "$TXT_VAR_SET"
  else
    _todo "$1" "$TXT_VAR_TODO" "$cmd" "$TXT_GH_FAILED"
  fi
}

# run CMD [ARG...]: shows the command, then runs it, except in a dry run.
# A failure stops the runbook with the command's exit status. Every command
# with side effects goes through run.
run() {
  local arg shown="" status=0 text
  for arg in "$@"; do shown+="${shown:+ }$(_word "$arg")"; done
  printf '\n'
  if (( DRY_RUN )); then _raw "$ACCENT\$$RESET" "$shown $DIM$TXT_NOT_RUN$RESET"; return 0; fi
  _raw "$ACCENT\$$RESET" "$shown"
  "$@" || status=$?
  if (( status )); then
    printf -v text "$TXT_RUN_FAILED" "$status"
    _line "$RED✗$RESET" "$RED$text$RESET"
    _stop "$status"
  fi
  _line "$GREEN✓$RESET" "$DIM$TXT_RUN_DONE$RESET"
}

# _join ITEM...: unique items, comma separated, in first-seen order.
_join() {
  local item out="" seen=" "
  for item in "$@"; do
    [[ "$seen" == *" $item "* ]] && continue
    seen+="$item "
    out+="${out:+, }$item"
  done
  printf '%s' "$out"
}

# _summary_row LABEL_WIDTH LABEL ITEM...: one aligned summary row.
# A label too long for the column gets a line of its own.
_summary_row() {
  local label_w="$1" label="$2" row lead indent cols
  shift 2
  (( $# )) || return 0
  indent=$(printf '%*s' $(( label_w + 2 )) '')
  if (( $(_len "$label") < label_w )); then
    lead=$(printf '  %s%s%s%*s' "$DIM" "$label" "$RESET" $(( label_w - $(_len "$label") )) '')
  else
    printf '  %s%s%s\n' "$DIM" "$label" "$RESET"
    lead="$indent"
  fi
  cols=$(( $(_width) - label_w ))
  for row in "$@"; do  # never split a name: room for the longest plus ", "
    (( cols >= ${#row} + 2 )) || cols=$(( ${#row} + 2 ))
  done
  while IFS= read -r row; do
    printf '%s%s\n' "$lead" "$row"
    lead="$indent"
  done < <(_wrap "$cols" "$(_join "$@")")
}

# finish: closing screen listing what was saved and what remains manual.
finish() {
  local title detail label_w=0 label i
  _clear
  printf -v title "$TXT_COMPLETE" "$RUNBOOK_TITLE"
  printf -v detail "$TXT_DONE_COUNT" "$_STAGE" "$TOTAL_STAGES"
  (( DRY_RUN == 0 )) || detail+=" · $TXT_DRY_DONE"
  printf '\n  %s%s✓%s %s%s%s\n' "$BOLD" "$GREEN" "$RESET" "$BOLD" "$title" "$RESET"
  _dim "$detail"
  printf '\n'
  for label in "$ENV_FILE" "$TXT_SECRETS" "$TXT_VARS"; do
    (( $(_len "$label") + 3 <= label_w )) || label_w=$(( $(_len "$label") + 3 ))
  done
  (( label_w <= $(_width) / 2 )) || label_w=$(( $(_width) / 2 ))
  _summary_row "$label_w" "$ENV_FILE" ${SAVED_ENV[@]+"${SAVED_ENV[@]}"}
  _summary_row "$label_w" "$TXT_SECRETS" ${SAVED_SECRET[@]+"${SAVED_SECRET[@]}"}
  _summary_row "$label_w" "$TXT_VARS" ${SAVED_VAR[@]+"${SAVED_VAR[@]}"}
  if (( ${#TODO_WHAT[@]} )); then
    printf '\n'
    _line "$YELLOW▲$RESET" "$YELLOW$TXT_TODO$RESET"
    for (( i = 0; i < ${#TODO_WHAT[@]}; i++ )); do
      _line "$DIM·$RESET" "${TODO_WHAT[i]}"
      code "${TODO_CMD[i]}"
    done
  fi
  printf '\n'
}

# _trap_stops: Ctrl-C, a closed terminal or a kill stop the runbook cleanly.
_trap_stops() {
  trap 'printf "\n"; _stop 130' INT  # the extra newline ends the ^C line
  trap '_stop 129' HUP
  trap '_stop 143' TERM
}

# _main ARGS: parses options, then runs the stages.
_main() {
  local arg
  _init_colors
  for arg in "$@"; do
    case "$arg" in
      --dry-run) DRY_RUN=1 ;;
      -h|--help) printf "$TXT_HELP" "$0"; exit 0 ;;
      *) printf "$TXT_UNKNOWN_OPTION\n" "$arg" >&2; exit 2 ;;
    esac
  done
  _trap_stops
  run_stages
}

# ══════════════════════════════════════════════════════════════════════════
# TEXT: interface strings in the reader's language. Translate the values only.
# Strings containing %s are printf formats: keep every %s (filled in order with
# what the comment names) and every \n, and write a literal percent sign as %%.
# Other strings are shown as written. TXT_YES is a regex matching a yes answer.
# ══════════════════════════════════════════════════════════════════════════

TXT_HELP="Usage: %s [--dry-run]\n  --dry-run  preview every screen: no browser opens, nothing is saved or run, and GitHub is not touched.\n"  # script path
TXT_UNKNOWN_OPTION="Unknown option: %s (see --help)"  # option
TXT_INTRO_META="%s stages · Ctrl-C stops, running again resumes"  # stage count
TXT_INTRO="Each stage lists the clicks to make in your browser; paste the values it asks for and they are stored for you."
TXT_DRY_RUN="Dry run: no browser opens, and nothing is saved or run."
TXT_START="Press Enter to start"
TXT_CONTINUE="Press Enter when done"
TXT_STAGE_OF="Stage %s of %s"                    # current, total
TXT_NOT_OPENED="(dry run: not opened)"
TXT_OPEN_FAILED="Couldn't open a browser: open the link above yourself."
TXT_YES_NO="[y/N]"
TXT_YES="^[Yy]"
TXT_KEEP_VALUE="(Enter keeps %s)"                # saved value
TXT_KEEP_SECRET="(Enter keeps the saved value)"
TXT_KEPT_SECRET="kept the saved value"
TXT_RECEIVED="received, %s characters"           # length
TXT_ENV_SAVED="saved to %s"                      # env file
TXT_ENV_DRY="would be saved to %s"               # env file
TXT_ENV_WRITE_FAILED="Couldn't write %s. Its updated content is in this file:"  # env file
TXT_ENV_NOT_WRITABLE="Couldn't read or write %s: check that it is a file and its folder's permissions."  # env file
TXT_SECRET_SET="set as a GitHub secret"
TXT_SECRET_DRY="would be set as a GitHub secret"
TXT_VAR_SET="set as a GitHub variable"
TXT_VAR_DRY="would be set as a GitHub variable"
TXT_GH_NOT_READY="not set on GitHub: the gh CLI is missing or signed out. Listed at the end."
TXT_GH_FAILED="not set on GitHub: gh refused it. Listed at the end."
TXT_SECRET_TODO="Set the GitHub secret %s:"      # name
TXT_VAR_TODO="Set the GitHub variable %s:"       # name
TXT_NOT_RUN="(dry run: not run)"
TXT_RUN_DONE="done"
TXT_RUN_FAILED="Failed with exit status %s."     # status
TXT_COMPLETE="Done: %s"                          # runbook title
TXT_DONE_COUNT="%s of %s stages completed"       # completed, total
TXT_DRY_DONE="dry run, nothing was opened, saved or run"
TXT_SECRETS="GitHub secrets"
TXT_VARS="GitHub variables"
TXT_TODO="Left for you to finish"
TXT_STOPPED_BEFORE="Stopped before the first stage."
TXT_STOPPED_AT="Stopped at stage %s of %s."      # current, total
TXT_RESUME="Saved values stay in %s; run again to resume."  # env file
TXT_DRY_NOTHING="Dry run: nothing was saved."

# ══════════════════════════════════════════════════════════════════════════
# STAGES: this runbook's procedure, written in the TEXT language. One stage
# per focused task; TOTAL_STAGES must equal the number of stage calls. All code
# lives in functions and the last line calls _main then exits, so bash has
# parsed every stage before it shows anything: editing this file while it runs
# cannot change the run in progress.
# ══════════════════════════════════════════════════════════════════════════

run_stages() {

TOTAL_STAGES=3

banner "Production setup" "Connects GitHub sign-in and the production database, then applies pending migrations."

# ── Example stages: replace them with the real procedure ─────────────────
stage "GitHub OAuth app"
say "Sign-in with GitHub needs an OAuth app registered on your account."
open_url "https://github.com/settings/applications/new"
step "Fill in Application name and Homepage URL."
step "Set Authorization callback URL to the address below, then click Register application."
code "http://localhost:3000/api/auth/callback/github"
step "Copy the Client ID shown on the next page."
ask GITHUB_CLIENT_ID "Client ID"
step "Click Generate a new client secret, then copy it."
ask_secret GITHUB_CLIENT_SECRET "Client secret"
printf '\n'
write_env GITHUB_CLIENT_ID "$GITHUB_CLIENT_ID"
write_env GITHUB_CLIENT_SECRET "$GITHUB_CLIENT_SECRET"
set_secret GITHUB_CLIENT_SECRET "$GITHUB_CLIENT_SECRET"
pause

stage "Production database"
say "CI deploys with the production connection string; it never goes in the local env file."
step "In your database provider's dashboard, copy the production connection string."
ask_secret PROD_DATABASE_URL "Connection string"
printf '\n'
set_secret DATABASE_URL "$PROD_DATABASE_URL"   # the name CI reads
pause

stage "Migrations"
say "Applies pending migrations to the production database."
warn "Migrations can't be undone automatically. Check that a recent backup exists."
if confirm "Apply pending migrations to production now?"; then
  export DATABASE_URL="$PROD_DATABASE_URL"
  run npx prisma migrate deploy
else
  note "Skipped. When ready, run this with the production connection string:"
  code "DATABASE_URL='<production connection string>' npx prisma migrate deploy"
fi
pause
# ─────────────────────────────────────────────────────────────────────────

finish
}

_main "$@"; exit
