# Calendar newsletter archive

Read this when the user asks for a main career-newsletter site, calendar archive, or an update to that archive.

## Outcome

- Put the monthly calendar in the first working viewport.
- Mark only dates that have an actual edition. A date click shows every edition for that date, including multiple same-day editions.
- Let the reader open the full newsletter from the selected-date panel and return to the calendar home.
- Show recent actual editions newest first. Never treat design versions as separate editions.
- Keep the site readable on desktop and mobile, keyboard operable, and usable without a build step when a static archive is sufficient.

## Archive data

Maintain one edition index as the source for both calendar marks and the recent-edition list. Each edition should retain:

- stable ID and date
- delivery time when known; otherwise state that it is unrecorded
- title and one-sentence synthesis
- roles
- highlight and additional-item counts
- new and follow-up counts when known
- comparison status
- relative path to the full edition

The index may contain multiple entries for the same date. Sort by date and delivery time, newest first. Do not infer a delivery time.

## Adding an edition

1. Verify the newsletter first under the HTML-delivery rules.
2. Save the full edition under a stable date-based path. If multiple actual editions exist on one date, add a time or sequence suffix.
3. Add one index entry. Do not overwrite or rename older edition files merely to normalize the archive.
4. Verify that the calendar mark, selected-date panel, full-edition link, return-to-calendar link, and recent list all resolve.
5. Check a month without an edition and a date without an edition for a clear empty state.

## GitHub-ready boundary

A static archive is ready to commit when it has a deterministic entry page, tracked local assets, relative links, no secrets, no machine-specific absolute paths, valid JavaScript, and no placeholder text. Repository creation, branching, pushing, deployment, or making the site public requires the user's explicit request.
