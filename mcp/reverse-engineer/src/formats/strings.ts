export interface FoundString {
  offset: number;
  text: string;
  wide: boolean;
}

export interface StringScan {
  /** Kept strings, ordered by file offset. */
  strings: FoundString[];
  /** Strings of at least `min` characters seen before the scan ended, kept or not. */
  total: number;
  /** True when the scan stopped on reaching `limit` kept strings, so later matches may be missing. */
  truncated: boolean;
}

export interface StringScanOptions {
  min?: number;
  /** Cap on kept strings, applied separately to ASCII and to UTF-16LE. */
  limit?: number;
  /** Keeps only matching strings, so the cap counts matches rather than every string in the file. */
  filter?: (text: string) => boolean;
}

export const STRING_LIMIT = 200000;

const printable = (b: number): boolean => (b >= 0x20 && b < 0x7f) || b === 0x09;

/** ASCII and UTF-16LE strings of at least `min` characters, filtered during the scan. */
export function scanStrings(
  buf: Uint8Array,
  { min = 6, limit = STRING_LIMIT, filter }: StringScanOptions = {},
): StringScan {
  let total = 0;
  let truncated = false;
  const keep = (list: FoundString[], found: FoundString): boolean => {
    total++;
    if (!filter || filter(found.text)) list.push(found);
    if (list.length < limit) return true;
    truncated = true;
    return false;
  };
  const out: FoundString[] = [];
  let start = -1;
  for (let i = 0; i <= buf.length; i++) {
    const b = i < buf.length ? (buf[i] as number) : 0;
    if (printable(b)) {
      if (start < 0) start = i;
    } else {
      if (start >= 0 && i - start >= min) {
        const text = Buffer.from(buf.subarray(start, i)).toString("latin1");
        if (!keep(out, { offset: start, text, wide: false })) break;
      }
      start = -1;
    }
  }
  const wide: FoundString[] = [];
  scan: for (const phase of [0, 1]) {
    let begin = -1;
    let chars = 0;
    // Runs one step past the end so a string ending on the last byte is flushed by the sentinel.
    for (let i = phase; i <= buf.length; i += 2) {
      const lo = i < buf.length ? (buf[i] as number) : 0;
      const hi = i + 1 < buf.length ? (buf[i + 1] as number) : 1;
      if (hi === 0 && printable(lo)) {
        if (begin < 0) begin = i;
        chars++;
      } else {
        if (begin >= 0 && chars >= min) {
          const text = Buffer.from(buf.subarray(begin, i)).toString("utf16le");
          if (!keep(wide, { offset: begin, text, wide: true })) break scan;
        }
        begin = -1;
        chars = 0;
      }
    }
  }
  return { strings: [...out, ...wide].sort((a, b) => a.offset - b.offset), total, truncated };
}

/** ASCII and UTF-16LE strings of at least `min` characters, ordered by file offset. */
export function extractStrings(buf: Uint8Array, min = 6, limit = STRING_LIMIT): FoundString[] {
  return scanStrings(buf, { min, limit }).strings;
}

/** Strings that usually carry meaning: paths, pipes, URLs, registry keys, GUIDs, format strings, file names. */
export const NOTABLE_STRING =
  /\\\\[.?]\\|\\pipe\\|^\/(?:tmp|var|usr|etc|Library|Users|private|dev|proc)\/|https?:\/\/|wss?:\/\/|%[0-9.]*[sdxuS]|HKEY_|SOFTWARE\\|\.(?:dll|sock|json|lock|exe|dylib|so)\b|\{[0-9A-Fa-f]{8}-[0-9A-Fa-f-]{27}\}|\b(?:failed|error|denied|invalid)\b/i;
