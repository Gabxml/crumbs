const { daysBetween } = require("../utils/dates");

// Works out the dashboard numbers from a user's events.
// Pure function: give it the events and today's date, get numbers back.
// A person's events number in the dozens, so doing this in JavaScript is
// simpler to read than a database aggregation and just as fast.
function computeStats(events, today) {
  const byStatus = { draft: 0, planned: 0, done: 0, archived: 0 };
  const dates = { upcoming: 0, today: 0, past: 0, overdue: 0, none: 0 };
  let images = 0;
  let checklistTotal = 0;
  let checklistDone = 0;
  let withLinks = 0;
  let nextEvent = null;
  const tagCounts = new Map();
  const monthCounts = new Map();

  for (const event of events) {
    const summary = event.summary ?? {};

    if (event.status in byStatus) byStatus[event.status] += 1;

    images += summary.imageCount ?? 0;
    checklistTotal += summary.checklistTotal ?? 0;
    checklistDone += summary.checklistDone ?? 0;
    if (summary.linkUrl) withLinks += 1;

    for (const tag of event.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }

    if (!summary.eventDate) {
      dates.none += 1;
      continue;
    }

    const daysUntil = daysBetween(today, summary.eventDate);
    if (daysUntil < 0) {
      dates.past += 1;
      if (event.status === "planned") dates.overdue += 1;
    } else if (daysUntil === 0) {
      dates.today += 1;
    } else {
      dates.upcoming += 1;
    }

    const month = summary.eventDate.slice(0, 7); // "2026-10"
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);

    // The next event is the soonest one that is still open.
    const isOpen = event.status === "draft" || event.status === "planned";
    if (isOpen && daysUntil >= 0 && (!nextEvent || summary.eventDate < nextEvent.date)) {
      nextEvent = {
        id: String(event._id),
        title: event.title,
        date: summary.eventDate,
        daysUntil,
      };
    }
  }

  // Most events in one month; if tied, the earlier month wins.
  let busiestMonth = null;
  for (const [month, count] of [...monthCounts].sort()) {
    if (!busiestMonth || count > busiestMonth.count) busiestMonth = { month, count };
  }

  const topTags = [...tagCounts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 10);

  return {
    totalEvents: events.length,
    byStatus,
    dates,
    nextEvent,
    busiestMonth,
    content: {
      images,
      eventsWithLinks: withLinks,
      checklistItems: checklistTotal,
      checklistDone,
      checklistCompletionPercent:
        checklistTotal === 0 ? null : Math.round((checklistDone / checklistTotal) * 100),
    },
    topTags,
  };
}

module.exports = { computeStats };
