const Event = require("../models/Event");
const { Widget } = require("../models/Widget");

// Widgets in display order: row by row (top to bottom), then left to right.
function inDisplayOrder(event, widgets) {
  const rowIndex = new Map((event.rows ?? []).map((row, i) => [String(row._id), i]));
  const position = (widget) => rowIndex.get(String(widget.row)) ?? Number.MAX_SAFE_INTEGER;
  return [...widgets].sort((a, b) => position(a) - position(b) || a.order - b.order);
}

// Builds the event's summary and its searchable text from the event and its
// widgets. Pure function: no database access, so it is easy to test.
function buildSummary(event, widgets) {
  const sorted = inDisplayOrder(event, widgets);
  const ofType = (type) => sorted.filter((w) => w.type === type);

  const notes = ofType("notes");
  const dates = ofType("date").filter((w) => w.date);
  const images = ofType("image").filter((w) => w.image);
  const links = ofType("link").filter((w) => w.url);

  const eventDates = dates.map((w) => w.date).sort(); // "YYYY-MM-DD" sorts as text

  // Card preview: the first notes widget that has text, else the first
  // checklist that has items.
  const firstText = notes.find((w) => (w.body ?? "").trim());
  const firstList = notes.find((w) => (w.checklist ?? []).length > 0);
  const noteExcerpt = firstText
    ? firstText.body.trim().slice(0, 140)
    : firstList
      ? firstList.checklist.map((item) => item.text).join(" · ").slice(0, 140)
      : "";

  const link = links[0];

  const summary = {
    eventDate: eventDates[0] ?? null,
    eventDates,
    noteExcerpt,
    openChecklistItems: notes.reduce(
      (total, w) => total + (w.checklist ?? []).filter((item) => !item.done).length,
      0,
    ),
    imageCount: images.length,
    coverUrl: images[0]?.image.url ?? null,
    linkCount: links.length,
    linkUrl: link?.url ?? null,
    linkTitle: link?.preview?.title ?? null,
    linkImage: link?.preview?.image ?? null,
    linkSiteName: link?.preview?.siteName ?? null,
  };

  // One lowercase string the search box can match against.
  const searchText = [
    event.title,
    event.description,
    ...(event.tags ?? []),
    ...(event.rows ?? []).map((row) => row.name),
    ...notes.flatMap((w) => [w.body, ...(w.checklist ?? []).map((item) => item.text)]),
    ...dates.map((w) => w.label),
    ...links.flatMap((w) => [w.url, w.preview?.title, w.preview?.siteName]),
    ...images.map((w) => w.image.originalName),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()
    .slice(0, 20000);

  return { summary, searchText };
}

// Recomputes and saves an event's summary. Call it after ANY change to the
// event's title/description/tags/rows or to any of its widgets.
// Returns the updated event (plain object), or null if the event is gone.
async function refreshEventSummary(eventId) {
  const [event, widgets] = await Promise.all([
    Event.findById(eventId).lean(),
    Widget.find({ event: eventId }).lean(),
  ]);
  if (!event) return null;

  const { summary, searchText } = buildSummary(event, widgets);

  // This write also bumps `updatedAt`, so editing a widget moves the event to
  // the top of "recently edited" for everyone it is shared with.
  return Event.findByIdAndUpdate(
    eventId,
    { $set: { summary, searchText } },
    { new: true },
  ).lean();
}

module.exports = { buildSummary, refreshEventSummary, inDisplayOrder };
