const test = require("node:test");
const assert = require("node:assert/strict");
const { computeStats } = require("../services/eventStats");

const today = "2026-10-02";
const make = (id, status, tags, summary) => ({ _id: id, title: `Event ${id}`, status, tags, summary });

const events = [
  make("a", "planned", ["school"], { eventDate: "2026-10-05", checklistTotal: 4, checklistDone: 3, imageCount: 2, linkUrl: "https://x.com" }),
  make("b", "planned", ["school", "work"], { eventDate: "2026-10-20", checklistTotal: 2, checklistDone: 0, imageCount: 1 }),
  make("c", "planned", ["fun"], { eventDate: "2026-09-28" }), // overdue
  make("d", "done", ["school"], { eventDate: "2026-09-10", checklistTotal: 2, checklistDone: 2 }),
  make("e", "draft", [], { eventDate: "2026-10-02" }), // today
  make("f", "draft", ["work"], {}), // no date
  make("g", "archived", ["fun"], { eventDate: "2026-11-15" }),
];

test("counts by status", () => {
  const stats = computeStats(events, today);
  assert.equal(stats.totalEvents, 7);
  assert.deepEqual(stats.byStatus, { draft: 2, planned: 3, done: 1, archived: 1 });
});

test("splits events into upcoming, today, past, overdue and undated", () => {
  const { dates } = computeStats(events, today);
  assert.deepEqual(dates, { upcoming: 3, today: 1, past: 2, overdue: 1, none: 1 });
});

test("the next event is the soonest open one (today counts, archived does not)", () => {
  const { nextEvent } = computeStats(events, today);
  assert.deepEqual(nextEvent, { id: "e", title: "Event e", date: "2026-10-02", daysUntil: 0 });
});

test("content totals and checklist completion", () => {
  const { content } = computeStats(events, today);
  assert.equal(content.images, 3);
  assert.equal(content.eventsWithLinks, 1);
  assert.equal(content.checklistItems, 8);
  assert.equal(content.checklistDone, 5);
  assert.equal(content.checklistCompletionPercent, 63); // 5/8 = 62.5 -> 63
});

test("top tags are ordered by count, then name", () => {
  const { topTags } = computeStats(events, today);
  assert.deepEqual(topTags[0], { tag: "school", count: 3 });
  assert.deepEqual(topTags.slice(1), [
    { tag: "fun", count: 2 },
    { tag: "work", count: 2 },
  ]);
});

test("busiest month", () => {
  assert.deepEqual(computeStats(events, today).busiestMonth, { month: "2026-10", count: 3 });
});

test("an empty account gives zeros and nulls, not errors", () => {
  const stats = computeStats([], today);
  assert.equal(stats.totalEvents, 0);
  assert.equal(stats.nextEvent, null);
  assert.equal(stats.busiestMonth, null);
  assert.equal(stats.content.checklistCompletionPercent, null);
  assert.deepEqual(stats.topTags, []);
});
