(function (root) {
  "use strict";

  const ISO_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function parseStrictISO(value) {
    if (typeof value !== "string") return null;
    const m = ISO_DATETIME.exec(value);
    if (!m) return null;
    const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > daysInMonth(year, month)) return null;
    if (hour > 23 || minute > 59 || second > 59) return null;
    if (m[8] !== "Z") {
      const [oh, om] = m[8].slice(1).split(":").map(Number);
      if (oh > 23 || om > 59) return null;
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  function validateEvent(d) {
    const errors = [];
    if (!d || typeof d.title !== "string" || !d.title.trim()) {
      errors.push("Schema violation: missing event title.");
    }
    const start = parseStrictISO(d && d.startISO);
    const end = parseStrictISO(d && d.endISO);
    if (!start) errors.push(`Invalid ISO-8601 startISO: ${JSON.stringify(d && d.startISO)}.`);
    if (!end) errors.push(`Invalid ISO-8601 endISO: ${JSON.stringify(d && d.endISO)}.`);
    if (start && end && end <= start) errors.push("Event end must be after its start.");
    return { errors, start, end };
  }

  function formatICSDate(date) {
    return date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[-:]/g, "");
  }

  function escapeICSText(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r\n|\r|\n/g, "\\n");
  }

  function hashString(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  function buildICS(d, now = new Date()) {
    const { errors, start, end } = validateEvent(d);
    if (errors.length) throw new Error(errors.join(" "));
    const dtStart = formatICSDate(start);
    const dtEnd = formatICSDate(end);
    const uid = `${hashString([d.title, dtStart, dtEnd, d.location ?? ""].join("|"))}-${dtStart}@snap-to-action`;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SnapToAction//Deterministic//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(now)}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICSText(d.title)}`
    ];
    if (d.location) lines.push(`LOCATION:${escapeICSText(d.location)}`);
    lines.push("END:VEVENT", "END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
  }

  const api = { parseStrictISO, validateEvent, formatICSDate, escapeICSText, buildICS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SnapICS = api;
})(typeof window !== "undefined" ? window : globalThis);
