# NationBuilder Events API (v2) — Research Notes

Research for GitHub issue #22 (dashboard "In Person Events", "Events Held",
"Orientations Ran" metrics). This document reports what metadata NationBuilder
event records actually carry, from primary sources only. **It does not
recommend a chapter/branch attribution approach** (regex-on-title,
location-naming convention, or tagging) — that decision is explicitly left to
a human.

Primary sources used:
- The official NationBuilder v2 OpenAPI spec, fetched directly from
  `https://nationbuilder.com/api/v2/docs/v2/released.yaml` (linked from the
  interactive reference at https://nationbuilder.com/api/v2/reference). This
  is the same spec that backs the "Download OpenAPI spec" button on that page.
  A local copy was inspected at
  `/tmp/claude-1000/-home-apc19-web-tools/9662e333-ad6d-4a69-9a0d-7690ab8cd2e2/scratchpad/nb-v2-spec.yaml`
  during this research session.
- https://support.nationbuilder.com/en/articles/9757369-nationbuilder-v2-api-core-concepts
  (NationBuilder's own Intercom-hosted core-concepts doc, fetched as raw HTML
  to avoid summarization artifacts).
- https://nationbuilder.com/event_resource and https://nationbuilder.com/events_api
  (v1 docs, used only to establish v1→v2 deltas, e.g. the `sites` path scoping
  and `tags`/`calendar_id` fields that did **not** carry over to v2).

---

## TL;DR

1. **Endpoint**: `GET /api/v2/events` (also `POST` to create; `GET/PATCH/DELETE
   /api/v2/events/{id}` for a single event). Pagination is **page-based**
   (`page[number]` / `page[size]`, default size 20, max 100) — not cursor-based.
   **Total count without full pagination is supported**, generically, via
   `stats[total]=count` on any v2 endpoint (e.g. `/api/v2/events?stats[total]=count`
   returns `{ meta: { stats: { total: { count: N } } } }`). Date-range filtering
   is not shown with a worked example for events specifically, but the API's
   general filter grammar documents `gt`/`gte`/`lt`/`lte` operators for "date
   attributes," which would apply to the event's `start_at` field
   (`filter[start_at][gte]=...&filter[start_at][lte]=...`) — see caveat in
   §1 below.
2. **No native in-person/virtual field.** The event resource has no
   `is_virtual`, `format`, or `type` attribute. The closest thing is
   `venue_name` (string) and a `venue_address` structured address object —
   both are optional/nullable, so any in-person/virtual split would have to be
   inferred from whether a venue/address is present (or from title/description
   text), not read off a dedicated flag.
3. **No native "Orientation" event type.** There is no `type`/`category` enum
   on the event resource at all (v2 dropped v1's plain `tags` field on events
   entirely). The only categorical field anywhere nearby is the sidecar
   "page" resource's `page_type_name`, which for events is fixed to the
   literal type `Event` — it's not a sub-category and has no "Orientation"
   value.
4. **Chapter/branch attribution: no direct field on the event; the site link
   is indirect.** The event resource carries no `site_id`/`site` relationship,
   no `tags`, and no `calendar_id` (v1 had a `calendar_id`; v2 does not carry
   it forward). NationBuilder v2 **does** support multi-site at the API level
   (`GET /api/v2/sites` returns `id`, `slug`, `name`, `domain`), but an event is
   tied to a site only through its associated **page** resource — each event
   is created together with (and exposes a read-only `page_id` for, and a
   sideloadable `page` relationship to) a `pages` resource, and it's the page
   that carries `site_id`. So: **yes, a site link exists, but only by joining
   event → page → site_id**, not a field on the event itself. There is no
   event-level tagging mechanism in v2 (tagging in v2 is a separate
   `signup_taggings` resource scoped to people/signups, not events).

---

## 1. Endpoint(s), date filtering, pagination, and count

**Endpoint paths** (from the OpenAPI spec, `paths:` section):
- `GET /api/v2/events` — "List all events in a nation" (`operationId:
  listEvents`)
- `POST /api/v2/events` — "Create an event" (`operationId: createEvent`)
- `GET /api/v2/events/{id}` — "Show event with provided ID"
- `PATCH /api/v2/events/{id}` — "Update an existing event"
- `DELETE /api/v2/events/{id}` — delete
- Related: `GET/POST /api/v2/event_rsvps`, `GET/POST /api/v2/event_ticket_levels`

  Source: `nb-v2-spec.yaml` lines ~1554–1815 (paths `"/api/v2/events"` and
  `"/api/v2/events/{id}"`), from
  https://nationbuilder.com/api/v2/docs/v2/released.yaml.

Note: this is a clean break from the v1 API, where events were nested under a
site in the URL itself — `GET /api/v1/sites/:site_slug/pages/events`
(https://nationbuilder.com/events_api, "no longer maintained" per that page).
**v2 events are not path-scoped by site** — there is a single flat
`/api/v2/events` collection across the whole nation.

**Pagination**: page-based, via the shared `pagination_number` /
`pagination_size` parameters (`page[number]`, default `'1'`; `page[size]`,
"default: 20, max: 100, min: 1"). These are the *only* two parameters the
`GET /api/v2/events` operation declares explicitly in the spec (source:
`nb-v2-spec.yaml` lines ~1748–1758 and the `parameters:` component block
~15612–15628). Responses include JSON:API `links` with `self`/`first`/
`last`/`prev`/`next` page-number URLs (schema `pagination_links`, spec lines
~6651–6680) — this is NationBuilder's own confirmation that v2 uses
page-number pagination, not a cursor/opaque-token scheme, despite following
JSON:API conventions generally.

**Filtering**: Filtering is not enumerated per-endpoint in the OpenAPI spec
(the signups list endpoint, which the codebase already uses successfully with
`filter[with_bouncing_email]=false`, *also* only lists
`pagination_number`/`pagination_size` in its explicit `parameters:` block —
so the absence of a `filter` parameter object in the spec for `/api/v2/events`
does not mean filtering is unsupported; it means NationBuilder documents
filtering generically rather than per-resource). The spec's own top-level
`info.description` states:

> "Filtering uses an operator syntax: `filter[attribute]=value` for equality
> (comma-separated values act as OR), and `filter[attribute][operator]=value`
> for other comparisons. String attributes support `eq`, `not_eq`, `eql`,
> `not_eql`, `prefix`, `not_prefix`, `suffix`, `not_suffix`, `match`, and
> `not_match`; numeric and date attributes support `eq`, `not_eq`, `gt`,
> `gte`, `lt`, and `lte`."
> — https://nationbuilder.com/api/v2/docs/v2/released.yaml (top-level `info.description`)

The core-concepts support article corroborates this generically ("You can
use the filter param with any attribute to return a subset of results" —
https://support.nationbuilder.com/en/articles/9757369-nationbuilder-v2-api-core-concepts,
"Filtering" section) with worked examples on other resources, e.g.
`filter[donations_amount_in_cents][gte]=500`. **No worked example specifically
filters events by `start_at`** in either source — see Open Questions.

**Total count**: Confirmed and important. The core-concepts article has a
dedicated "Count" section:

> "You can get the count of any API resource by adding the
> `stats[total]=count` parameter to your request. For example, the following
> will return the count of all donations: `/api/v2/donations?stats[total]=count`...
> The count will be returned in the `meta` field of the response... in the
> following format: `{ meta: { stats: { total: { count: 402 } } } }`"
> — https://support.nationbuilder.com/en/articles/9757369-nationbuilder-v2-api-core-concepts,
> "Count" section

This is described as applying to "any API resource," which per the OpenAPI
spec's generic `meta` description on index responses ("Non-standard
information about the document, such as requested statistics" — schema
`index_document`, spec lines ~6796–6801) is consistent with events too:
`/api/v2/events?stats[total]=count`. This means an "Events Held" /
"In-Person Events" count metric does **not** require paginating through every
record client-side just to get a count — though getting the count *of a
filtered subset* (e.g. events in a given year) still depends on whether
`filter[start_at]` works as described above (unconfirmed by a worked example).

## 2. In-person vs. virtual — no native field

The event resource's read/write attribute list (schema
`event_read_write_attributes`, spec lines ~9214–9607) and the sparse-field
enum `event_field_values` (spec lines ~13788–13823) together define the full
set of documented event attributes:

```
accept_rsvps, additional_rsvps_count, allow_guests, attending_count,
auto_response_broadcaster_id, auto_response_content, auto_response_subject,
capacity_count, contact_email, contact_email_private, contact_name,
contact_phone_number, contact_phone_private, content,
donation_tracking_code_id, duration, event_form_address, event_form_phone,
gather_volunteers, page_id, point_person_id, private, sends_auto_response,
show_guests, start_at, time_zone, user_ticket_currency,
user_ticket_price_in_cents, user_ticket_purchase_url, uses_shifts,
uses_tickets, venue_name
```

Plus one opt-in extra field (`event_extra_field_values`, spec lines
~13824–13829): `venue_address` (a structured address object — see §4).

There is **no** `is_virtual`, `event_type`, `format`, `medium`, or similar
boolean/enum field anywhere in this list. `venue_name` and the
`venue_address` extra field are both nullable/optional (write schema
`event_write_only_attributes.venue_address_attributes`, spec lines
~9632–9660, explicitly typed `[object, 'null']`). The only structural
signal available is whether a venue name/address is populated at all — that
is an inference, not a documented "is this virtual" flag. `capacity_count`
exists ("The number of RSVPs allowed... If set to 0, there is no limit") but
is about RSVP limits, not venue/format.

## 3. No native "Orientation" event type

No `type`, `category`, or similar enum field exists on the event resource at
all (confirmed by the same attribute list above — there is nothing named
`type`/`category`/`kind`). The event's associated **page** resource does have
a `page_type_name` field, but for events this is fixed: the create-event
request description states "Events must be created with a page resource,"
and the page-sidepost schema explicitly excludes `page_type_name` because
"the parent resource sets" it (schema `page_sidepost_attributes`, spec lines
~9692–9695) — i.e., every event's page is always typed `Event`, with no
further sub-typing. The generic `pages` create endpoint's own
`page_type_name` field is separately constrained to the literal `'Basic'`
(schema `page_read_write_attributes`, spec lines ~10119–10126) — again, no
"Orientation" value anywhere in the spec.

Separately, v1's event resource did carry a plain `tags` array
(https://nationbuilder.com/event_resource, "v1 API," field list includes
`tags`) but this field was **dropped in v2** — it is absent from
`event_read_write_attributes` / `event_field_values` above. The only tagging
resource in the entire v2 spec is `signup_taggings`
(`/api/v2/signup_taggings`, spec lines ~4814+), which tags **signups**
(people/contacts), not events. So "Orientation" is not, and cannot currently
be, represented as a native type or tag on the event object in v2 — it would
be entirely a naming/title convention on the org's part.

## 4. Fields tying an event to a location or organizational unit

Full inventory of event-adjacent fields relevant to location/org-unit
attribution, per the OpenAPI spec:

- **`venue_name`** (string, nullable) — free-text venue name. Read/write
  attribute (spec lines ~9605–9611).
- **`venue_address` / `venue_address_attributes`** (object, nullable) —
  structured address, opt-in via `extra_fields[events]=venue_address` for
  reads, written via `venue_address_attributes` on create/update. Sub-fields
  per the documented example payload (spec lines ~9636–9653 write shape,
  mirrored in the create-event example at spec lines ~1627–1650): `address1`,
  `address2`, `address3`, `city`, `state`, `zip`, `county`, `country_code`,
  `lat`, `lng`, `fips`, `submitted_address`, `distance`, `import_id`,
  `work_phone`, `phone_number`, `phone_country_code`, `work_phone_number`.
  This is the only structured geographic data on an event.
- **`page_id`** (string, nullable, read-only) — links the event to its
  underlying `pages` resource (schema `event_read_only_attributes`, spec
  lines ~9607–9617). The `page` relationship is also sideloadable
  (`event_sideload_values` enum includes `page`, spec lines ~13778–13787).
  The **page** resource is where site scoping actually lives: `pages` has a
  read/write `site_id` attribute ("The site this page belongs to.", schema
  `page_read_write_attributes` / `page_sidepost_attributes`, spec lines
  ~10143–10147 and ~9744–9748). So an event's site/chapter is reachable only
  via `event.page_id → page.site_id`, never directly on the event.
- **`point_person_id`** (string, nullable) — "ID of the point person assigned
  to RSVPs." This is a signup/contact ID, sideloadable as `point_person`
  (`event_sideload_values`). It identifies a person, not a location, but that
  person's own signup record could in principle carry tags/address data (out
  of scope of the event resource itself).
- **`contact_name` / `contact_email` / `contact_phone_number`** (+ privacy
  flags) — free-text contact-person fields on the event itself, not linked to
  a signup ID.
- **`auto_response_broadcaster_id`** and **`donation_tracking_code_id`** —
  sideloadable relationships (`auto_response_broadcaster`, `tracking_code`)
  to email-broadcaster and donation-tracking-code resources respectively;
  neither is location/org-unit data.
- No **`calendar_id`** field exists in v2 (present in v1 —
  https://nationbuilder.com/event_resource — but absent from the v2
  `event_field_values` enum). There is no `calendars` resource anywhere in
  the v2 spec (confirmed by an exhaustive text search of the spec file for
  "calendar").
- No **`tags`** field or sideloadable tagging relationship exists on events in
  v2 (see §3).

**Sites / multi-site feature — does it exist at the API level, and how is an
event scoped to one?**

Yes, `sites` is a first-class v2 resource: `GET /api/v2/sites` ("List all
sites in a nation," spec lines ~5327–5354) returns objects with attributes
`domain`, `name`, `slug` (schema `site_read_only_attributes`, spec lines
~15170–15194; `site_field_values` enum, spec lines ~15163–15169). This is a
read-only list endpoint in the spec — no `POST`/`PATCH`/`DELETE` for sites
was found.

Scoping is **via a field on a related object, not via the event's own URL
path**: v1 scoped events by path (`/api/v1/sites/:site_slug/pages/events`,
https://nationbuilder.com/events_api), but v2 flattened this — `/api/v2/events`
is nation-wide, and the site link is carried on the sideposted/related `page`
resource's `site_id` attribute (see above), reachable by sideloading
`include=page` on an event request and reading `page.attributes.site_id`, or
by fetching `page_id` and calling `/api/v2/pages/{id}` (page-scoped index
endpoints were not found in the current spec pass; only sideload/lookup by
ID was confirmed).

## Open questions / things NOT found in primary docs

- **No worked example of date-range filtering on events specifically.** The
  generic filter grammar (`filter[attribute][gte]=...` etc., documented for
  "date attributes") strongly implies `filter[start_at][gte]=...&filter[start_at][lte]=...`
  works against `/api/v2/events`, and the same generic mechanism is exactly
  what the codebase already relies on for signups (`filter[with_bouncing_email]=false`
  in `src/util.tsx`'s `SIGNUPS_API`) despite that endpoint's `GET` operation
  also not enumerating a `filter` parameter in the spec. But no NationBuilder
  doc page or spec example was found that filters `/api/v2/events` by
  `start_at` directly — this should be smoke-tested against a real nation
  before being relied on for the dashboard.
- **Whether `stats[total]=count` can be combined with a `filter[...]`** to get
  a count of, say, "events in 2025" without paginating, versus only giving
  the count of the entire unfiltered collection. The support article's only
  worked example (`/api/v2/donations?stats[total]=count`) does not combine it
  with a filter. This is a reasonable expectation given JSON:API conventions
  (filters generally apply before any other query processing) but is not
  explicitly demonstrated in the docs found.
- **Whether there is a page-scoped or site-scoped events listing endpoint**
  (e.g. something like filtering `/api/v2/events` by `filter[page][site_id]=`
  or an equivalent relationship filter, analogous to the documented
  `filter[taggings][tag_id]=123` pattern used for signups elsewhere in the
  docs). No such filter was found demonstrated for events in the spec or
  support docs — only the generic relationship-sideload path
  (`include=page`) was confirmed.
- **The exact read-time shape of the `venue_address` extra field** is
  inferred from the *write*-side example (`venue_address_attributes`) in the
  spec; a distinct read-only schema for the returned `venue_address` object
  was not separately defined in the spec beyond its name appearing in the
  `event_extra_field_values` enum, so the exact set of sub-fields returned on
  a `GET` (versus accepted on write, which includes write-only members like
  `delete` and `import_id`) is not 100% guaranteed to match.
- **Whether NationBuilder's control-panel UI exposes an "Orientation" event
  template or convention that isn't visible in the API schema** (e.g. a
  UI-only label stored as part of `content` or `venue_name` text) was out of
  scope for this API-focused pass and not investigated.
