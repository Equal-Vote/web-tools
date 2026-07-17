# NationBuilder: counting "Volunteer Signups" per year

Research for [issue #20](https://github.com/Equal-Vote/web-tools/issues/20) (child of the `/dashboard` planning map, #18).

Question: how would a planned `/dashboard` page compute a year-by-year "Volunteer Signups" metric from NationBuilder, using the v2 API this repo already calls (`SIGNUPS_API` in `src/util.tsx`, used by `src/ContactExport.tsx`)?

All claims below are sourced from NationBuilder's own documentation (`support.nationbuilder.com` HOWTOs and the `nationbuilder.com` API reference/marketing pages). Nothing here was inferred from blog posts or third-party write-ups.

## 1. How would "volunteer" be identified among signups?

NationBuilder's v2 API exposes three mechanisms that could carry a volunteer signal. None of them is inherently "the volunteer field" — the API has no built-in concept of a volunteer. Which one (if any) this org uses is a data/policy question, not an API fact (see §4).

### a) Tags (`signup_tags` / taggings)
Tags are free-text, organization-defined labels attached to a person/signup record — NationBuilder does not ship with a fixed tag vocabulary. Per the "How to use tags" HOWTO: "Tags are virtual sticky notes added to profiles to describe a characteristic that can help you target people with what they care about most," and tags can be applied manually, automatically by a page (e.g. an event/RSVP/survey page), or automatically by a saved filter (in which case NationBuilder keeps the tag in sync as membership in the filter changes). ([How to use tags](https://support.nationbuilder.com/en/articles/2305680-how-to-use-tags))

In the v2 API, a signup's tags are exposed as a `signup_tags`/`taggings` relationship. You can sideload them with `include=taggings`, and the "Using parameters" HOWTO documents filtering on the sideloaded relationship, e.g. `/api/v2/signups?page[size]=10&include=taggings&filter[taggings][tag_id]=123`. ([Using parameters to interact with the NationBuilder API](https://support.nationbuilder.com/en/articles/9917278-using-parameters-to-interact-with-the-nationbuilder-api))

**Important caveat, straight from the docs:** filtering on a sideloaded/nested relationship does not remove non-matching primary records from the response — the same HOWTO states this explicitly for a parallel example ("The filter does not remove unassociated Signups from the response. Signups that do not have addresses matching the criteria of the filter will still be included in the payload.") This pattern applies to nested-resource filters generally, so a naive `include=taggings&filter[taggings][tag_id]=X` call should not be assumed to return only tagged signups — it needs to be verified against a live instance, or the count should be derived a different way (see §2).

### b) List membership
NationBuilder also has "Lists" — named groupings of people that can be built and maintained by staff (including via saved filters) and managed via the API (`GET /api/v1/lists`, `GET /api/v1/lists/:id/people`, `POST/DELETE /api/v1/lists/:id/people`). ([Lists API](https://nationbuilder.com/lists_api)) This is documented at the v1 API surface; a v2-native list-membership relationship was not found on the sideloading pages fetched during this research and would need to be confirmed in the org's own v2 OpenAPI reference (Developer > API testing in the control panel, per the docs — this research did not have access to that live per-nation reference or to this org's actual instance).

### c) Custom fields (`custom_values`)
Signups carry a `custom_values` hash of organization-defined custom fields, which can be Text, Number, Multiple choice, or Checkbox (boolean) type. ([Custom Fields on the API](https://nationbuilder.com/custom_fields_api)) The v2 API supports equality filtering directly on this hash: `GET /api/v2/signups?filter[custom_values][eq]={ "programming_language": "COBOL" }`, with multiple candidate values combinable as `filter[custom_values][eq]={ "a": "1" },{ "a": "2" }`. ([API v2 walkthrough](https://support.nationbuilder.com/en/articles/9899245-api-v2-walkthrough)) A boolean/checkbox custom field like "Volunteer?" would be filterable the same way.

### Summary of mechanism options
| Mechanism | API surface | Notes |
|---|---|---|
| Tag | `signup_tags`/`taggings` relationship, `include=taggings&filter[taggings][tag_id]=…` | Most common/lightweight NationBuilder pattern for "did this action"; can be auto-applied by a page or saved filter. Nested-filter caveat above needs verification. |
| List membership | v1 `Lists` API (`/api/v1/lists/:id/people`); v2 equivalent unconfirmed | Heavier-weight, more for curated audiences (e.g. mailing/calling lists) than an event flag. |
| Custom field (`custom_values`) | `filter[custom_values][eq]={"field":"value"}` on `/api/v2/signups` | Works well for a boolean "Volunteer?" checkbox field if the org has defined one. |

## 2. Can you get a count without paginating through every record?

Yes. Per the "NationBuilder v2 API Core Concepts" HOWTO, **any v2 index endpoint** supports a `stats[total]=count` query parameter that returns a count in the response's `meta` object without needing to fetch/paginate the underlying records:

> "The count will be returned in the `meta` field of the response, which is a sibling to `data`, in the following format: `{ meta: { stats: { total: { count: 402 } } } }`"

([NationBuilder v2 API Core Concepts](https://support.nationbuilder.com/en/articles/9757369-nationbuilder-v2-api-core-concepts))

This is a query-parameter modifier, so it composes with `filter[...]` params on the same request — meaning a tag filter (or custom-field filter, or date filter) plus `stats[total]=count` should, in principle, return just the matching count in `meta.stats.total.count` in one request, without walking pages. (The docs demonstrate `stats[total]=count` and `filter[...]` in isolation; a combined worked example was not found in the pages fetched for this research, so the combination should be smoke-tested against a real token before being relied on for the dashboard.)

Separately, plain (unfiltered) pagination responses also carry page metadata (`links.self/prev/next`) per page, per the "Using parameters" HOWTO, and one secondary excerpt (not independently re-confirmed against the primary doc in this pass) suggested a `meta.total_count`/`meta.total_pages`/`meta.current_page` block may also appear on paginated list responses — treat that specific field name as unconfirmed until checked against a live response; `stats[total]=count` is the properly documented mechanism for "just give me the number."

## 3. Concrete per-year count query shape

Given a chosen volunteer signal (tag id, or a `custom_values` key/value), a per-year bucketed count would be one `stats[total]=count` request per year, e.g. for tag-based identification:

```
GET /api/v2/signups
    ?include=taggings
    &filter[taggings][tag_id]=<VOLUNTEER_TAG_ID>
    &filter[created_at][gte]=2024-01-01
    &filter[created_at][lt]=2025-01-01
    &stats[total]=count
    &page[size]=1
```

- `filter[taggings][tag_id]=<id>` — restricts to signups with the volunteer tag (subject to the nested-filter caveat in §1a — verify it actually narrows the count, not just the sideload payload).
- `filter[created_at][gte]=… / [lt]=…` — date-range bucketing. The exact `gte`/`gt`/`lte`/`lt` comparison clauses are documented for numeric attributes (e.g. `filter[donations_amount_in_cents][gte]=500`) and demonstrated for a `created_at` timestamp in a nested-relationship example (`filter[petition_signatures][created_at][gte]=2024-01-01` in the API v2 walkthrough). Applying the same `[gte]`/`[lt]` clause pair directly to the top-level signup's own `created_at` follows the documented general `filter[attribute][clause]=value` pattern, but a worked example filtering top-level `signups` by their own `created_at` specifically was not found in the pages fetched — confirm the field name (`created_at` vs. `signup_created_at` or similar) and behavior against a live token before building the dashboard on it.
- `stats[total]=count` — returns `meta.stats.total.count` instead of requiring a full paginated walk.
- `page[size]=1` — defensive minimum page size, since a count-only request still nominally returns data; not required if `stats[total]=count` suppresses/ignores `data` (unconfirmed — check the actual response shape).

For a custom-field ("Volunteer?" checkbox) signal, swap the tag filter for:
```
&filter[custom_values][eq]={ "volunteer": "true" }
```
(exact key name and stored value format — `"true"`/`true`/`"1"` — depend on how the org's custom field is configured).

A full year-by-year table would issue one such request per year (or per year × per candidate volunteer signal, if the org tracks volunteering more than one way), reading `meta.stats.total.count` from each response.

## 4. Open policy decisions (not API facts — flagging, not answering)

1. **Which tag/list/custom-field means "volunteer."** NationBuilder imposes no fixed definition; tags and custom fields are entirely organization-defined ([How to use tags](https://support.nationbuilder.com/en/articles/2305680-how-to-use-tags)). This org has not yet settled on one. Someone with access to the live NationBuilder control panel needs to check what tags/custom fields/lists actually exist for volunteer-related signups (e.g. via **Developer > API testing** in the control panel, which the docs point to for a nation's live, interactive API reference) and pick (or create) one canonical signal.
2. **Whether "volunteer" should be a single flag or several roles rolled up** (e.g. distinct tags for canvassing vs. phone-banking vs. event volunteering, all counted together as "Volunteer Signups"). This changes the filter from a single tag id to an OR across several tag ids/custom values.
3. **Which date field defines "the year" a signup counts toward** — the signup's own `created_at`, or the date of the specific action/page that added the volunteer tag (these can differ if a person is tagged well after their original signup).
4. **Whether historical/backfilled tags should count.** If the volunteer tag was introduced partway through the org's NationBuilder history, older genuine volunteers may be untagged, which would undercount early years — a data-quality question for the org, not something the API can resolve.

## Sources

- [NationBuilder v2 API Core Concepts](https://support.nationbuilder.com/en/articles/9757369-nationbuilder-v2-api-core-concepts) — pagination defaults, sparse fieldsets, `stats[total]=count` and its `meta.stats.total.count` response shape.
- [Using parameters to interact with the NationBuilder API](https://support.nationbuilder.com/en/articles/9917278-using-parameters-to-interact-with-the-nationbuilder-api) — filter clause syntax (`eql`, `prefix`, `suffix`, `match`, `gt`/`gte`/`lt`/`lte`, null checks), `extra_fields[...]` syntax, sideloaded-filter (`include=taggings&filter[taggings][tag_id]=…`) example and the "filter does not remove unassociated records" caveat.
- [API v2 walkthrough](https://support.nationbuilder.com/en/articles/9899245-api-v2-walkthrough) — `custom_values` hash filtering (`filter[custom_values][eq]={...}`), nested `created_at` date-range filter example, signup tag sideposting.
- [How to use tags](https://support.nationbuilder.com/en/articles/2305680-how-to-use-tags) — tags are free-text/org-defined, applied manually, by page, or by saved filter (with auto-add/auto-remove semantics for filter-driven tags).
- [Lists API](https://nationbuilder.com/lists_api) — v1 list-membership endpoints (`/api/v1/lists`, `/api/v1/lists/:id/people`).
- [Custom Fields on the API](https://nationbuilder.com/custom_fields_api) — custom field types (Text/Number/Multiple choice/Checkbox) and storage on person/donation resources.
- [NationBuilder API v2 reference](https://nationbuilder.com/api/v2/reference) — the org's live, interactive per-nation reference (via control panel Developer > API testing) is the authoritative source for the exact fields/filters available on this instance; this research could not access it directly and flags where confirmation against it is still needed.
