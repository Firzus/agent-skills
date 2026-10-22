# Accessibility audit

Adapted from the upstream `a11y-debugging` skill for the CLI; see
[NOTICE](../NOTICE). Use it to check semantics, labels, focus and keyboard
navigation, tap targets, and contrast.

`take_snapshot` returns the accessibility tree, which is what assistive technology
receives; it is the reference for structure and names. Content hidden with
`opacity: 0` stays in the tree, unlike `display: none` or `aria-hidden="true"`.

For web.dev guidance, append `.md.txt` to an article URL (for example
`https://web.dev/articles/accessible-tap-targets.md.txt`) to fetch its Markdown.

## 1. Baseline with Lighthouse

```sh
chrome-devtools lighthouse_audit <pageId> --mode navigation --outputDirPath <abs-dir>
```

`navigation` reloads the page; `snapshot` audits the current state, such as an open
dialog. The text output gives category scores from 0 to 100, passed and failed
counts, and each failed audit with its nodes (`selector`, `snippet`). Extract
failures from the saved report instead of reading it whole:

```sh
node -e "const r=require(process.argv[1]); Object.values(r.audits).filter(a => a.score !== null && a.score < 1).forEach(a => console.log(JSON.stringify({id: a.id, title: a.title, items: a.details?.items})))" <abs-dir>/report.json
```

## 2. Browser issues

`list_console_messages <pageId> --types issue --includePreservedMessages true`
reports Chrome's own checks, such as missing form labels and invalid ARIA.

## 3. Structure and names

From the snapshot:

- headings: one logical hierarchy without skipped levels;
- landmarks: a `main` region and navigation regions;
- names: every button, link, and input has a non-empty accessible name; images have
  alt text;
- reading order: compare the snapshot order with `take_screenshot` to catch CSS
  reordering.

## 4. Keyboard and focus

1. `press_key <pageId> Tab` (or `Shift+Tab`) with `--includeSnapshot true`.
2. In the snapshot, the element marked `focused` must be the expected next control.
3. When a modal opens, focus must move into it and stay there until it closes; when
   it closes, focus returns to the trigger.

## 5. Measurement snippets

Save a snippet to a file and run it with
`chrome-devtools evaluate_script --pageId <pageId> --sourcePath <abs-file>`. For
snippets taking an element, add `--args <uid>` from the snapshot.

Orphaned form inputs (no `label[for]`, `aria-label`, `aria-labelledby`, or wrapping
label):

```js
() =>
  Array.from(document.querySelectorAll('input, select, textarea'))
    .filter(i => {
      const hasId = i.id && document.querySelector(`label[for="${i.id}"]`);
      const hasAria = i.getAttribute('aria-label') || i.getAttribute('aria-labelledby');
      return !hasId && !hasAria && !i.closest('label');
    })
    .map(i => ({tag: i.tagName, id: i.id, name: i.name, placeholder: i.placeholder}))
```

Tap target size (web.dev recommends at least 48x48 CSS pixels with spacing):

```js
el => {
  const rect = el.getBoundingClientRect();
  return {width: rect.width, height: rect.height};
}
```

Approximate text contrast (WCAG AA: 4.5:1 for normal text, 3:1 for large text). It
ignores transparency, gradients, and background images; check those visually with
`take_screenshot --uid <uid>` and report the result as an estimate:

```js
el => {
  const rgb = s => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
  };
  const lum = ([r, g, b]) => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };
  const style = getComputedStyle(el);
  const l1 = lum(rgb(style.color));
  const l2 = lum(rgb(style.backgroundColor));
  return {
    color: style.color,
    background: style.backgroundColor,
    contrastRatio: ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2),
  };
}
```

Document-level settings:

```js
() => ({
  lang: document.documentElement.lang || 'MISSING',
  title: document.title || 'MISSING',
  viewport: document.querySelector('meta[name="viewport"]')?.content || 'MISSING',
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
})
```

## 6. User preference media features

Test each preference in one `emulate` call, then reset with `emulate <pageId>`:
`--forcedColors active`, `--prefersContrast more`, `--prefersReducedMotion reduce`,
`--colorScheme dark`. Verify with `take_screenshot` and a snapshot.

## Reporting

List each failure with its rule or check, the element (uid, selector, or snippet),
and the evidence source (Lighthouse audit id, issue `msgid`, snippet output).
Automated checks do not cover screen reader output or every WCAG criterion; state
what was not checked.
