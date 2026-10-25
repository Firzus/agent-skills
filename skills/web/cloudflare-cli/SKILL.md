---
name: cloudflare-cli
description: Operate Cloudflare from the shell with `cf`, Cloudflare's agent-oriented CLI (npm package `cf`, open beta) covering the whole Cloudflare API and Workers projects. Use to sign in and select an account or zone, find the command for a Cloudflare task, inspect or change resources such as DNS records, zones, Workers, D1, KV, R2, queues, and cache, and develop, build, or deploy a Workers project, including choosing between `cf` and Wrangler.
---

# Cloudflare CLI

Run Cloudflare operations through `cf`. Inputs: the task, the target account and
zone, and the project directory when the task concerns a Workers project. Output:
the result of each command, backed by its output, and the identifiers of the
resources read or changed. Side effects: resource commands call the Cloudflare
API on the selected account unless run with `--dry-run` or `--local`; workflow
commands (`init`, `build`, `deploy`, `migrate`) also write project files.

`cf` is in beta and changes between releases. The installed `--help`, `cf schema`,
and `cf cli search` results win over this skill and over remembered Wrangler or
`cf` syntax. For a topic this skill does not cover, retrieve the documentation
index at `https://developers.cloudflare.com/cf/llms.txt`, or run
`cf docs search "<question>"`.

## 1. Check the CLI and the identity

1. Run `cf --version`. The package installs two equivalent commands, `cf` and
   `cloudflare`; if `cf` resolves to another tool (the Cloud Foundry CLI uses the
   same name), use `cloudflare` for the whole task.
2. If both commands are missing, report it and propose `npm i -g cf`. Install only
   with the user's approval. If npm warns that the Node.js version does not match
   the package's `engines`, report the supported versions it names.
3. Run `cf auth whoami` and read its `authenticated` field: the command exits 0
   even when nobody is signed in. A signed-in result also gives `authSource`,
   `tokenValid`, `email`, and `accounts`.
4. When it is not authenticated, the user chooses the method:
   - `cf auth login` opens a browser approval that the user must complete. Add
     `--no-browser` on a remote machine or in a container so it only prints the
     link.
   - Otherwise the user sets `CLOUDFLARE_API_TOKEN` in the environment or in a
     Git-ignored `.env` or `.env.local` of the project. The token takes priority
     over a stored login. Ask the user to set it themselves; never request, echo,
     or write a token value.
   - `--temporary-account` creates or reuses a temporary account when no
     credentials exist, and missing-credential errors recommend it. Use it only
     when the user asks for a temporary account.
5. Select the account. Most account-scoped commands take `CLOUDFLARE_ACCOUNT_ID`,
   then `accountId` in `cloudflare.config.ts`, then a cached choice, then a
   prompt. In an agent shell the prompt cannot appear, so credentials with several
   accounts fail with `More than one account available`: ask the user which
   account to use, then set `CLOUDFLARE_ACCOUNT_ID`. Commands whose `--help` lists
   `--account-id` read only that flag, such as `cf zones create`, which needs it
   to place the zone, and `cf zones list`, which otherwise lists the zones of
   every account the credentials reach.
6. Select the zone, when the task needs one, with `--zone`/`-z` (zone ID or
   domain) or `CLOUDFLARE_ZONE_ID`.

**Done:** the CLI responds, and the account (and zone) the commands will act on
are known and confirmed by the user when more than one was possible.
**Blocked:** CLI absent and installation declined, or no credentials; report the
blocker and the commands the user can run.

## 2. Choose the CLI for a Workers project

Apply this only to `dev`, `build`, `deploy`, and project configuration. Resource
commands (DNS, zones, storage, cache, secrets) use `cf` in every project.

| Project contains | Use |
| --- | --- |
| `cloudflare.config.ts` | `cf` |
| `wrangler.jsonc`, `wrangler.json`, or `wrangler.toml`, and no `cloudflare.config.ts` | The project's Wrangler for `dev`, `build`, and `deploy`; `cf dev`, `cf build`, and `cf deploy` can ignore the Wrangler file or fail |
| Neither | `cf` (`cf init` to start a project); do not add Wrangler |

Run `cf migrate` only when the user asks, on a clean Git worktree:

1. Preview with `cf migrate --dry-run`, which lists the files it would change.
   By default it also installs packages from the network (`cf` as a development
   dependency, and the Vite plugin or Wrangler when the project needs them),
   which changes `package.json` and the lockfile. Install only with the user's
   approval; otherwise pass `--no-install`, which leaves required installation
   items for the user.
2. Run `cf migrate`. It creates `cloudflare.config.ts` next to the Wrangler file,
   sometimes `wrangler.config.ts`, and leaves the Wrangler file unchanged.
3. Both runs exit 1 while `[required]` items remain; that status lists work left,
   not a failed migration. Resolve each item and delete its `TODO(@cloudflare)`
   comment, then delete the `throw` statement it added at the top of
   `cloudflare.config.ts`: until then `cf dev`, `cf build`, and `cf deploy` fail
   with `Migration incomplete`.

Live Worker logs still need Wrangler: `npx wrangler tail <worker>`. Wrangler does
not read `cloudflare.config.ts`, so pass the Worker name. `npx` downloads Wrangler
when the project does not install it; that download needs the user's approval.

**Done:** the CLI for each project command is chosen from the files present.
**Blocked:** the task needs Wrangler and its download is declined, or a migration
item needs an installation the user has not approved; report what remains and
the command the user can run.

## 3. Find the command

1. Run `cf cli search "<task in plain words>"`. It searches locally without
   credentials and returns up to 5 `{command, summary}` matches. Quote the whole
   task: unquoted words are parsed as commands. Describe only the action and the
   resource type, here and in `cf docs search`: no names, domains, emails,
   account or resource IDs, or tokens.
2. Inspect the match with `cf schema <command words>` (HTTP method, URL path, and
   the path, query, and body parameters) and `cf <command> --help` (flags,
   pagination, destructive behavior).

Generated commands follow `cf <product> [group...] <operation>`:

- The last path parameter is positional, except the zone, which always comes from
  `--zone` or `CLOUDFLARE_ZONE_ID`; earlier path parameters are required flags.
- Query parameters are kebab-case flags, such as `--per-page`.
- A body is passed through the per-field flags that `--help` lists, or whole with
  `--body '<json>'` or `--body @file.json`. Some commands, such as
  `cf dns records create`, have no per-field flags and accept only `--body`. Any
  text flag accepts `@path` to read a file. Binary and multipart uploads use
  `--file`.
- A list returns one page; follow the paging flags its `--help` shows.

**Done:** the command and its arguments are taken from search, schema, or help
output, not from memory.
**Blocked:** no command matches after search, schema, and `cf docs search`;
report the gap instead of guessing a syntax.

## 4. Run it

- Run reads (`get`, `list`, `whoami`, `schema`) directly.
- Before a change to remote resources, run the same command with `--dry-run`,
  which needs no credentials. A generated command prints the method, URL,
  parameters, and body; it resolves neither a domain given to `--zone` nor
  `CLOUDFLARE_ZONE_ID`, so pass the zone ID with `--zone` when the preview must
  show the exact URL. Show the preview with the target account and zone, and run
  the change only when the user has authorized that operation. This covers
  deployments, DNS and configuration edits, cache purges, secrets, tokens,
  members, and anything that buys or bills (registrar, subscriptions, invoices).
- Deletes and other confirmed operations prompt. In an agent shell the prompt
  cannot be answered: without `--force` the command prints `Aborted.` and exits 1.
  `--force` only skips the prompt; pass it once the deletion is authorized. Read
  `--help` for options that widen the deletion, such as
  `cf workers delete --delete-with-references`, which also deletes a Worker that
  other Workers reference.
- Workflow commands (`init`, `build`, `deploy`, `migrate`) answer their own
  confirmation prompts with a fallback value when no terminal is attached, yes or
  no depending on the prompt; stderr shows each one as `Using fallback value in
  non-interactive context`. In a project without configuration, `cf deploy`
  detects the framework and writes `cloudflare.config.ts`, sometimes
  `wrangler.config.ts`, and can edit other project files, such as `package.json`,
  the lockfile, `.gitignore`, `tsconfig.json`, or the framework configuration. Run
  `cf deploy --dry-run` first: it lists the detected settings and the files it
  would create, and in a configured project it builds without deploying, which
  writes the build output. Pass the options that make the run explicit
  (`--mode`, `--worker`, `--message`), and check the files it changed afterwards.
- Use `--local` for development data: it covers KV keys, D1 (`cf d1 raw`,
  `cf d1 migrations list|apply`), and R2 objects, and keeps its state outside the
  account. Other commands reject it rather than call the API.

### Secrets

- Pass a secret value from a file the user controls, never as a literal argument:
  `cf workers secrets update <name> --worker <worker> --type secret_text --text @<file>`
  for one secret, or `--secrets-file <path>` on `cf deploy` or
  `cf workers versions create` to upload secrets with a new version. `@<file>`
  sends the file byte for byte, so it must hold the value without a trailing
  newline (for example, written with `printf '%s'`).
- `--dry-run` masks only the fields the API schema marks as sensitive.
  `cf workers secrets update` masks the value; `cf workers secrets bulk` prints
  the values of its body file in clear. Preview a command that carries secrets
  with a file of placeholder values, and never print secret values back.

### Read the result

- stdout carries only the result: JSON, or the raw content for downloads such as
  R2 objects. Notices, prompts, and errors go to stderr. Filter JSON with `jq`,
  or with `node` when `jq` is not installed; there is no `--format` or `--fields`
  flag. `--quiet` hides notices.
- A failure exits 1 and prints a text block on stderr with the API error code,
  message, HTTP status, and path. Exit 130 means the command was cancelled.

**Done:** each command's exit status and output are read, and every change is
confirmed by a later `get` or `list`.
**Waiting:** a change is previewed and awaits the user's authorization; report
its dry-run and run nothing else that depends on it.

## 5. Report

Report the account and zone used, the commands run, the dry-run shown before each
change, the identifiers created, changed, or deleted, and the reads that confirm
them. State what was not run, such as a change awaiting authorization or a task
that needed Wrangler.

**Done:** requested result delivered and verified on the account.
**Pending:** if a command failed, report it with its stderr block and the next
action instead of claiming the result.
