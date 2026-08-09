# Fragment: comments

The rule this project settled on: **no inline commentary, a module header where the file carries a decision.** It keeps the reasoning an agent cannot recover from the code, and removes most of the surface that goes stale.

The gap worth filling, in one sentence: linters check that a comment exists and parses; nothing checks that it is true or that it is worth reading.

## The core section

```markdown
## Comments

Write every comment in English, including in a file whose existing comments are in another language. A file that switches language mid-way is the residue of translating only the line being touched.

Open a file with a module header when it carries a decision a reader cannot recover from the code: a constraint, a rejected alternative, a trap that is still reachable. State it in the present tense, as the current state of the world.

Inside the body, prefer fixing the code over explaining it — a clearer name, a named constant, a narrower type. Reach for a comment only where no amount of naming would carry the reason.

Document what a signature cannot say: what a function panics or throws on, and which edge cases it deliberately does not handle.

Update the comment in the same change as the code. When you rename or change a function, search for comments elsewhere that name it — a comment rots without its own file ever being touched.
```

## The test that decides an edge case

A comment describing a past bug is not automatically changelog. Ask: **can the reader still fall into this hole?**

If yes, it stays, however historical it sounds — it is a live warning about a trap the code still permits. If no, it belongs to the commit history.

Without this carve-out, a no-changelog rule deletes the most valuable comments in a codebase.

## What this rules out

```markdown
Write the comment as the current state, never as a delta. "Now returns null" and "previously fell back to an empty list" force the reader to know a version of the code they have never seen.

Define the vocabulary you use, or drop it. A reference to "finding C" or "ticket T2" that resolves nowhere is noise to every reader who was not in the room.
```

These two are the highest-value lines in practice: they are the failures that survive review, because both read like careful work.

## Optional rows

- **Doc comments on the exported surface** — worth stating when the project relies on editor hover and autocomplete. This is the one place a comment earns its keep on every keystroke.
- **First line as a one-sentence summary** — in Rust, everything before the first blank line becomes the search blurb, so it is machine-visible rather than stylistic.
- **Doc versus implementation comment** — `///` against `//` in Rust, `<summary>` against a bare `///` in C#. An untagged `///` in C# is ignored by most consumers, which makes this consequential rather than cosmetic.

## Deliberately absent

Coverage and format rules, because tooling already owns them: `missing_docs` and `missing_docs_in_private_items` in Rust, CS1591 in C#, `tsdoc/syntax` and `jsdoc/check-param-names` in TypeScript, `broken_intra_doc_links` for link resolution, doctests for keeping examples working, and formatters for alignment.

Also absent: any claim that AI-written comments fail in a particular way. No first-party guidance from Anthropic, OpenAI or GitHub addresses comment style, and the one study located found LLM-generated comments to be largely accurate. If a team observes a pattern in its own history, that is a legitimate basis for a rule — write it as an observation from this repository, not as research.

One caveat to keep in mind when applying the no-restatement rule: it is not universal. The rustdoc book recommends line-by-line commentary in teaching examples on a crate's front page.

## Sources

- <https://google.github.io/styleguide/cppguide.html#Comments>
- <https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html>
- <https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/>
- <https://tsdoc.org/>
- <https://github.com/gajus/eslint-plugin-jsdoc>
