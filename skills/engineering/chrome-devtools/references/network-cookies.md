# Network requests and cookies

Adapted from the upstream `cookie-debugging` skill for the CLI; see
[NOTICE](../NOTICE). Use it for 401/403 responses, login redirects, expired
sessions, `Cookie`/`Set-Cookie` problems, consent banners, and SameSite or
third-party cookie warnings.

Start the daemon without `--redactNetworkHeaders` for this work, since the headers
are the evidence. Report cookie names and attributes, never their values.

## Where each cookie is visible

| Need | Source |
| --- | --- |
| Values currently sent, including `HttpOnly` | `Cookie` request header in `get_network_request <pageId> --reqid <n>` |
| How a cookie was set (`Domain`, `Path`, `SameSite`, `Secure`, `Expires`) | `Set-Cookie` response header of the login or handshake response |
| Non-`HttpOnly` cookies with attributes | `evaluate_script 'async () => await cookieStore.getAll()' --pageId <pageId>` |
| Browser rejection reasons | `list_console_messages <pageId> --types issue --includePreservedMessages true` |

JavaScript cannot read, modify, or delete `HttpOnly` cookies, and deletion attempts
fail silently. For a clean state, open a separate context instead:
`new_page <url> --isolatedContext <unique-name>`, and `close_page <pageId>` afterwards.
Pages in the same context share cookies and storage.

`cookieStore` requires a secure context (`https://`, `localhost`, `127.0.0.1`); on
plain HTTP use `() => document.cookie`. Its methods are asynchronous: keep the
`async () => await ...` form.

## Diagnose a 401, 403, or login redirect

1. `list_network_requests <pageId> --includePreservedRequests true`, and find the
   failing request (401/403) or redirect (302/307) by `reqid`.
2. `get_network_request <pageId> --reqid <n>`: check whether the `Cookie` header is
   present and carries the expected session cookie names.
3. If no recent request exists, trigger one with `navigate_page <pageId> --type reload`
   or `evaluate_script '() => fetch(location.href).then(r => r.status)' --pageId <pageId>`,
   then inspect the new request.
4. If the cookie is missing, find the earlier `Set-Cookie` and check:
   - `Path` narrower than the request path (`Path=/api` for `/`);
   - `Domain` excluding the requesting host;
   - `Secure` on an `http://` page;
   - `SameSite=Strict` or `Lax` on a cross-site request;
   - `Expires` or `Max-Age` already elapsed.
5. To test an authorization header without a login flow, set it for the page with
   `emulate <pageId> --extraHttpHeaders <json>` (see the quoting rules in SKILL.md),
   and clear it with `--extraHttpHeaders ""`.

## Test a consent banner

1. Open a clean context: `new_page <url> --isolatedContext consent-1`.
2. Record the baseline with `cookieStore.getAll()`, `list_network_requests`, and
   `list_console_messages <pageId> --types issue`. No tracking request should fire
   before consent.
3. `take_snapshot`, then `click` the "Reject" or "Decline" button by uid.
4. Repeat the cookie and request checks: only strictly necessary cookies and the
   consent-state cookie should remain, and no tracking beacon should follow.
5. For revocation, open the preferences control, withdraw consent, and verify that
   non-essential cookies are gone and beacons stop.
6. `close_page` the context page.

## Audit SameSite, Secure, and partitioned cookies

1. `list_console_messages <pageId> --types issue --includePreservedMessages true`.
   Look for cookie issues such as `SameSiteNoneInsecure`, `ThirdPartyCookiePhaseout`,
   `SchemefulSameSite`, and invalid `Partitioned` (CHIPS) attributes, and open one
   with `get_console_message <pageId> <msgid>`.
2. For a full third-party cookie audit, run
   `lighthouse_audit <pageId> --mode navigation --outputDirPath <abs-dir>` and extract
   only that audit:

   ```sh
   node -e "const a=require(process.argv[1]).audits['third-party-cookies']; console.log(JSON.stringify({score: a?.score, displayValue: a?.displayValue, items: a?.details?.items}))" <abs-dir>/report.json
   ```

## Request bodies

`get_network_request` returns bodies inline. Save large or binary bodies with
`--requestFilePath <abs>` and `--responseFilePath <abs>` and read the part you need.
Earlier navigations keep URLs, statuses, and headers, but bodies are usually gone;
reproduce the request when the body matters.
