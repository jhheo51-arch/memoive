# Notion newsletter and evidence database

Use this mode only when the user explicitly asks to save the current edition to Notion or create a Notion database.

## Destination and version safety

1. Find and fetch the exact destination page before writing. Do not infer a similarly named page.
2. Create a new child page titled `커리어 뉴스레터 YYYY-MM-DD`.
3. If that title already exists under the destination, preserve it and create the next available `v02`, `v03`, and so on. Never silently overwrite an edition.
4. Create the evidence database inside the newsletter page, not elsewhere in the workspace.

## Newsletter page

Use the format in [newsletter-format.md](newsletter-format.md). The page must contain the cutoff date, actual coverage period, three-minute overview, highlight details, beyond-the-highlights items, the three role-radar sections, and up to three actions. Do not add a reader-facing `조사 품질 메모` section.

## Evidence database

Title it `커리어 뉴스레터 자료 YYYY-MM-DD`, adding the same version suffix as the newsletter page when needed.

Required visible properties, matching the standard table layout:

- `자료명`: title
- `검증상태`: select with `본문 확인`, `세션 소개 확인`, `근거 제한`
- `게시·행사일`: date
- `관련직무`: multi-select with `BA`, `Consultant`, `PM/PO`
- `활용방식`: multi-select with `면접`, `포트폴리오`, `학습`, `기업분석`
- `구분`: select with `핵심`, `추가`
- `국내외`: select with `국내`, `해외`
- `원문`: URL

Recommended supporting properties:

- `출처`: rich text
- `자료유형`: select with `공식 발표`, `고객 사례`, `채용·직무`, `콘퍼런스`
- `한줄요약`: rich text

Create one row per selected source. Every row page must separate:

1. `확인된 사실`
2. `Codex의 해석`
3. `내 커리어 활용 포인트`

Add `근거 한계` only when material uncertainty exists. Use `세션 소개 확인` for conference agendas or session descriptions when the presentation or outcome has not been inspected. Use `근거 제한` when access or evidence is materially incomplete. Do not label a search-result snippet as `본문 확인`.

## Placement and accessibility

1. Place the database immediately after the career-actions section, where a research-quality memo would otherwise have appeared.
2. Add the heading `근거자료 전체보기` and one short sentence explaining that the table contains verification status, dates, role tags, and original links.
3. Set the database to inline display so its rows are immediately visible and interactive on the newsletter page. Do not leave it as a full-page child that requires an extra click.
4. Keep the most decision-useful columns visible first: `자료명`, `검증상태`, `게시·행사일`, `관련직무`, `활용방식`, `구분`, `국내외`, `원문`.

## Verification

After writing:

1. Fetch the newsletter page and confirm it is under the requested parent and contains the database.
2. Fetch the database and confirm it is inline, then confirm every required property exists.
3. Query the database and confirm the total row count and the separate `핵심` and `추가` counts.
4. Report the Notion page link, counts, and unresolved items. Do not claim visual verification unless the rendered table was actually inspected.
