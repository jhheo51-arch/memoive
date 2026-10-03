# HTML and Slack delivery

Read this only when the user requests an HTML newsletter or Slack delivery.

## HTML outcome

- Create a new versioned HTML file and preserve earlier deliverables.
- Use responsive, accessible semantic HTML that works as a standalone file without a build step.
- Prefer large readable headings, generous white space, restrained color, role and geography tags, modular story cards, and a clear three-depth reading flow.
- Treat the hero title and introductory sentence as Codex's editorial synthesis of the verified highlights, not as a direct quotation. Ground them in the selected facts and avoid unsupported claims.
- Show `Weekly career intelligence` without a visible volume number. Do not expose the edition or version anywhere in the HTML; record it in the companion PRD Markdown. A versioned filename remains only as the required storage identifier.
- A design reference may guide hierarchy, spacing, and interaction patterns, but do not copy its branding, logo, proprietary images, or page text.
- Keep `확인된 사실` and `Codex의 해석` visually distinct. Do not include a separate `내 경험과 연결` block.
- Make every source a descriptive, keyboard-accessible link and show the research cutoff date near the title.
- Include the full evidence database in the HTML, not only a shortened additional-evidence list. Show every selected highlight and additional item with `자료명`, `검증상태`, `게시·행사일`, `관련직무`, `활용방식`, `구분`, `국내외`, and `원문`.
- Include top navigation links for `3분 요약`, `심층분석`, `직무 레이더`, `논리 퀴즈`, `기타 자료`, `근거 DB`, and `지난 뉴스레터`. Keep navigation labels independent of item counts because the selected count may change by edition.
- Use a commute-first default: keep each highlight's title, one-line change, tags, and essential signal visible, but collapse the full analysis behind an accessible `심층분석 보기` control. Ensure the full content remains available without JavaScript and when printing.
- Use `기타 자료` as the reader-facing name for non-highlight items.
- Add a `지난 뉴스레터` section that lists real editions newest first. Show date, delivery time when known, and new or follow-up counts when known; do not list design-file versions as separate editions.
- Render the logic quiz as three multiple-choice questions with a visible answer-check button, score, per-question explanation, and reset control. Use accessible fieldsets and radio labels.
- Present the hero eyebrow as plain text without a decorative leading dot.
- Keep short section-guidance sentences on one line at supported desktop widths. At narrow widths, preserve the single line with safe horizontal scrolling instead of clipping text.
- Keep standalone HTML copy destination-neutral. Do not describe the evidence table as being stored in Notion or require the reader to know another storage location.
- Make the evidence database horizontally scrollable on narrow screens and provide simple filters for at least `전체`, `핵심`, and `추가`. Preserve accessible table headers and descriptive source links.
- Include a print-friendly stylesheet.

## Verification

Before delivery, verify that:

1. the file opens without external build tooling;
2. the overview, five or fewer detailed highlights, role radar, career actions, logic quiz, additional signals, and full evidence database are present;
3. there are no placeholder strings or broken local asset paths;
4. the layout remains readable at desktop and narrow widths;
5. source links and dates are present.
6. the evidence database row count matches the selected source set and its filters do not change the underlying rows.

## Slack

- Sending to Slack always requires an explicit request naming the destination.
- Upload the verified HTML as a file when supported. Add a short message stating the cutoff date, what the file contains, and that Slack may require download or browser opening to render HTML.
- If HTML upload is unavailable, send the local file using the platform's supported attachment workflow; do not paste the entire HTML source into the channel.
- Verify that the message or attachment appears in the named destination. Stop after one successful send and do not retry an uncertain send without checking whether a duplicate was created.
