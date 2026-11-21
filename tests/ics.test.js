const test = require("node:test");
const assert = require("node:assert/strict");
const { parseStrictISO, validateEvent, formatICSDate, escapeICSText, buildICS } = require("../ics.js");

const EVENT = {
  intent: "event",
  title: "Devin Demo Day & Pitch",
  startISO: "2026-12-01T18:00:00Z",
  endISO: "2026-12-01T20:00:00Z",
  location: "San Francisco, CA"
};
const NOW = new Date("2026-11-21T15:30:45.123Z");

test("formatICSDate emits a single trailing Z", () => {
  assert.equal(formatICSDate(new Date("2026-12-01T18:00:00Z")), "20261201T180000Z");
  assert.equal(formatICSDate(new Date("2026-12-01T18:00:00.999Z")), "20261201T180000Z");
});

test("buildICS writes UTC DTSTART/DTEND without a double Z", () => {
  const ics = buildICS(EVENT, NOW);
  assert.match(ics, /\r\nDTSTART:20261201T180000Z\r\n/);
  assert.match(ics, /\r\nDTEND:20261201T200000Z\r\n/);
  assert.doesNotMatch(ics, /ZZ/);
});

test("buildICS converts offset times to UTC", () => {
  const ics = buildICS({ ...EVENT, startISO: "2026-12-02T01:00:00+07:00", endISO: "2026-12-02T03:00:00+07:00" }, NOW);
  assert.match(ics, /\r\nDTSTART:20261201T180000Z\r\n/);
  assert.match(ics, /\r\nDTEND:20261201T200000Z\r\n/);
});

test("buildICS includes required UID and DTSTAMP", () => {
  const ics = buildICS(EVENT, NOW);
  assert.match(ics, /\r\nUID:[0-9a-f]{8}-20261201T180000Z@snap-to-action\r\n/);
  assert.match(ics, /\r\nDTSTAMP:20261121T153045Z\r\n/);
});

test("UID is stable for the same event and differs for another event", () => {
  const uid = ics => ics.match(/UID:(.*)\r\n/)[1];
  assert.equal(uid(buildICS(EVENT, NOW)), uid(buildICS(EVENT, new Date())));
  assert.notEqual(uid(buildICS(EVENT, NOW)), uid(buildICS({ ...EVENT, title: "Other" }, NOW)));
});

test("buildICS output is well-formed RFC 5545", () => {
  const ics = buildICS(EVENT, NOW);
  const lines = ics.split("\r\n");
  assert.equal(lines[0], "BEGIN:VCALENDAR");
  assert.equal(lines.at(-1), "");
  assert.equal(lines.at(-2), "END:VCALENDAR");
  assert.ok(!/[^\r]\n/.test(ics), "lines must end with CRLF");
  assert.ok(lines.includes("SUMMARY:Devin Demo Day & Pitch"));
  assert.ok(lines.includes("LOCATION:San Francisco\\, CA"));
});

test("escapeICSText escapes TEXT special characters", () => {
  assert.equal(escapeICSText("a\\b;c,d\ne"), "a\\\\b\\;c\\,d\\ne");
});

test("parseStrictISO accepts ISO-8601 date-times with Z or offset", () => {
  assert.ok(parseStrictISO("2026-12-01T18:00:00Z"));
  assert.ok(parseStrictISO("2026-12-01T18:00:00.500Z"));
  assert.ok(parseStrictISO("2026-12-01T18:00:00-05:00"));
  assert.ok(parseStrictISO("2028-02-29T00:00:00Z"));
});

test("parseStrictISO rejects loose or impossible dates", () => {
  for (const bad of [
    "Dec 1 2026",
    "2026-12-01",
    "2026-12-01T18:00:00",
    "2026-12-01 18:00:00Z",
    "2026-13-01T18:00:00Z",
    "2026-02-30T18:00:00Z",
    "2027-02-29T00:00:00Z",
    "2026-12-01T24:00:00Z",
    "2026-12-01T18:00:00+25:00",
    "",
    undefined,
    1764612000000
  ]) {
    assert.equal(parseStrictISO(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test("validateEvent rejects non-ISO dates and end before start", () => {
  assert.deepEqual(validateEvent(EVENT).errors, []);
  assert.equal(validateEvent({ ...EVENT, startISO: "Dec 1 2026", endISO: "Nov 30 2026" }).errors.length, 2);
  assert.deepEqual(validateEvent({ ...EVENT, endISO: "2026-12-01T17:00:00Z" }).errors, ["Event end must be after its start."]);
  assert.deepEqual(validateEvent({ ...EVENT, endISO: EVENT.startISO }).errors, ["Event end must be after its start."]);
  assert.equal(validateEvent({ ...EVENT, title: " " }).errors.length, 1);
});

test("buildICS refuses invalid events", () => {
  assert.throws(() => buildICS({ ...EVENT, startISO: "Dec 1 2026" }, NOW), /Invalid ISO-8601 startISO/);
});
