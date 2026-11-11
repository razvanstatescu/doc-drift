# Forge for Confluence: verified platform reference (Doc Drift Sentinel)

Checked 2026-11-11. Every fact is tagged **Verified** (with its source) or **Unverified**. Source keys:

- [BYL] https://developer.atlassian.com/platform/forge/manifest-reference/modules/confluence-content-byline-item/ (last updated Oct 9, 2026)
- [UBP] https://developer.atlassian.com/platform/forge/apis-reference/confluence-api-bridge/updateBylineProperties/
- [UCP] https://developer.atlassian.com/platform/forge/ui-kit/hooks/use-content-property/
- [SCHEMA] JSON schema shipped in npm `@forge/manifest@13.9.0` (`out/schema/manifest-schema.json`). This is the schema `forge lint` and `forge deploy` validate against.
- [PKG] npm registry, plus the published source of `@forge/react@12.5.0` and `@forge/confluence-bridge@4.0.0`
- [V2] https://dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json (the OpenAPI spec behind https://developer.atlassian.com/cloud/confluence/rest/v2/)
- [V1] https://dac-static.atlassian.com/cloud/confluence/swagger.v3.json (the spec behind https://developer.atlassian.com/cloud/confluence/rest/v1/)
- [EVT] https://developer.atlassian.com/platform/forge/events-reference/confluence/
- [SCOPES] https://developer.atlassian.com/cloud/confluence/scopes-for-oauth-2-3LO-and-forge-apps/
- [DC] https://developer.atlassian.com/platform/forge/manifest-reference/display-conditions/ , [DCC] .../display-conditions/confluence/ , [DCE] .../display-conditions/entity-property-conditions/
- [RC] https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product.requestconfluence/
- [MOD] https://developer.atlassian.com/platform/forge/manifest-reference/modules/<module-page>/

---

## 1. `confluence:contentBylineItem`

### Properties ([BYL], Verified; constraints from [SCHEMA], Verified)

| Property | Notes |
|---|---|
| `key` | Required. `^[a-zA-Z0-9_-]+$` |
| `resource` | Required for UI Kit or Custom UI. In [SCHEMA], the resource key is at most 47 characters (`^[a-zA-Z0-9_\-]{1,23}(/[a-zA-Z0-9_\-]{1,23})?$`) |
| `render` | `native` for UI Kit ([SCHEMA] also accepts `default`) |
| `resolver` | `{ function }` or `{ endpoint }` |
| `title` | Required. String or `{ i18n }` |
| `icon` | Relative path to a declared resource, or an absolute URL. Max 255 characters. Falls back to a generic app icon |
| `tooltip`, `description` | String or `{ i18n }` |
| `viewportSize` | [BYL]: `small`, `medium`, `large`, `xlarge`, `max`, `fullscreen`, `resizable` (Preview), `{width, height}` (Preview). **[SCHEMA] 13.9.0 enum for the byline is only `small`, `medium`, `large`, `fullscreen`, `resizable`, or `{width,height}`.** `xlarge` and `max` may fail lint, so stick to `large`. Only valid together with `resource` |
| `viewportContainer` | `popup` (default) or `modal` |
| `displayConditions` | See below |
| `dynamicProperties` | `{ function: <function key> }` (must be an object, not a string) |
| `contentPropertyKey` | String. [SCHEMA]: 1 to 255 characters, `^[a-zA-Z0-9-_]+$` |
| `keyboardShortcut`, `unlicensedAccess` (`unlicensed`, `anonymous`) | Optional |

Extension context (`useProductContext` / `view.getContext()`): `content.id`, `content.type` (`page` or `blogpost`), `content.subtype`, `space.id`, `space.key`, `location`. Verified [BYL].
Custom UI iframes are sandboxed, so plain `<a href>` links do not work. Use `router.navigate` from `@forge/bridge`. Verified [BYL].

### `contentPropertyKey`: how it works
- **CLI version:** "Starting in Forge CLI version 12.6.1". Verified [BYL]. The current CLI is `@forge/cli@15.1.0`. Verified [PKG].
- **What Confluence reads:** "Confluence attempts to retrieve the dynamic properties from the value of that content property on the initial render." Confluence looks up the content property whose key equals `contentPropertyKey` on the current page. The page does not say whether that lookup goes through the v2 page properties API. Verified [BYL].
- **Avoids function invocation:** "When this key is provided, the byline module renders using the values from the content property instead of executing the `dynamicProperties` function." Verified [BYL].
- **Value shape:** a JSON object with the optional keys `title`, `icon` and `tooltip`. Verified [BYL], [UBP]. Example from [UBP]:
  ```json
  { "title": "Updated title", "icon": "updated-image.png", "tooltip": "Updated tooltip" }
  ```
  Whether Confluence ignores extra keys in this object (for example `state`) is **Unverified**. Keep app state in a separate property.
- **Icon value:** the docs examples use `"new-icon-path"` and `"updated-image.png"`, with no formal spec for the content-property path. **Unverified.** For `dynamicProperties`, the allowed icon sources are `resource:<resource key>;<relative path>`, `data:image` URIs, and URLs listed under external permissions. Verified [BYL]. The safest assumption is that the same rules apply. Test a `data:image/svg+xml` value and a `resource:` value in week 1. See the 2026-11-11 validation update below: the value is a plain string, and a `data:` URI is the preferred first try.
- **Uniqueness:** "We strongly recommend making this key unique, like a UUID." If more than one property on a page has the same key, the byline does not update. Verified [BYL].
- **Persisting vs refreshing:**
  - `updateBylineProperties({ propertyKey, valueUpdate })` from `@forge/confluence-bridge` 3.1.0 or later. Current version is 4.0.0, a major bump that only adds TS5 support; Verified [PKG]. It "does not persist the values to the content property". You must write the property separately, which "requires the `read:page:confluence` and `write:page:confluence` scopes". It "must be called in an app outside of `confluence:contentBylineItem`, but rendered on the same page", such as `confluence:backgroundScript`, `confluence:pageBanner` or `macro`. Verified [UBP]. The source only emits the bridge event `FORGE_CONTENT_PROPERTY_UPDATED`. Verified [PKG].
  - `useContentProperty(key, default)` from `@forge/react` 11.4.0 or later (current 12.5.0). Its setter writes through the frontend `requestConfluence` to `/wiki/api/v2/pages/{id}/properties` (as the current user) and then emits the same event. Verified [BYL], [PKG]. **Gotcha:** the hook stores the property under the key `forge-${localId}-${key}`. Verified [UCP], [PKG]. That stored key is not the raw `contentPropertyKey`, so a value written by the hook from another module may not be found on the next page load. **Unverified** which key the initial render reads. [UBP]'s example writes the raw key through REST, which suggests the raw key.
  - **Recommended pattern:** the backend writes the raw key `contentPropertyKey` through REST v2 (`asApp()`, see section 4). Pages pick up the new value on the next load. If live refresh is needed while a page is open, add a tiny `confluence:backgroundScript` that calls `updateBylineProperties`. The byline's own modal cannot refresh itself. Verified [UBP].
- `dynamicProperties` fallback: the function gets `payload` (`cloudId`, `localId`, `extension.{type, content.{id,type}, space.{id,key}}`) and `context` (`principal.accountId`, `installContext`). It is called on first render and again after the byline dialog closes. Verified [BYL].

Minimal manifest (copied from [BYL]):
```yaml
confluence:contentBylineItem:
  - key: byline-app
    resource: main
    render: native
    title: Byline App
    contentPropertyKey: byline-properties-unique-key
```

### `displayConditions` (Verified [DC], [DCC], [DCE])
- Operators: `and`, `or`, `not`. Conditions are evaluated client-side and are not a security boundary.
- Common conditions: `isAdmin`, `isLoggedIn`, `isSiteAdmin`.
- Global conditions: `hasAppAccess`, `appIsLicensed`, `appEdition`.
- Confluence-specific conditions: `isSpaceAdmin`, `hasPagePermission` / `hasSpacePermission` (`VIEW`, `EDIT`, `SET_PERMISSIONS`, `REMOVE`, `EXPORT`, `ADMINISTER`), `userIsExternalCollaborator`, and `entityPropertyExists`, `entityPropertyEqualTo`, `entityPropertyContainsAny`, `entityPropertyContainsAll`, `entityPropertyContainsAnyUserGroup` with `entity: app | user | content | space`.
  ```yaml
  displayConditions:
    entityPropertyEqualTo: { entity: content, propertyKey: myPropertyKey, objectName: state, value: stale }
  ```
- Community bug report: displayConditions on a Forge byline "has no effect" (https://jira.atlassian.com/browse/CONFCLOUD-84518). **Unverified** whether it is fixed. Do not depend on it for the byline.

---

## 2. Other Confluence modules

None of these module pages carries a Preview or EAP badge, and the module index lists them all without status markers ([MOD] `index-confluence/`). Every UI module below supports UI Kit through `render: native` plus `resource`. Verified [MOD], [SCHEMA].

| Module | Key properties (required in **bold**) | Notes |
|---|---|---|
| `confluence:pageBanner` | **`key`**, **`resource`**, `render`, `resolver`, `displayConditions`, `unlicensedAccess`. No `title`, no viewport | Shown on pages, live docs and spaces. Not shown on whiteboards, databases, smart links or embedded pages. Guidance: at most one banner at a time, make it dismissable with `view.close()`, reopen with `view.open()`, and never use it for upsell. Verified [MOD] `confluence-page-banner/` (updated Aug 13, 2026). **Height:** in July 2025 Atlassian announced a 48px maximum height and a move "back to preview", then put the change on hold and removed the changelog entry. Community source: https://community.developer.atlassian.com/t/feedback-on-height-restriction-in-confluence-page-banner-module-48px-limit/93479. The current docs state no height limit and no Preview label. **Design for 48px or less (one line).** |
| `confluence:spacePage` | **`key`**, **`title`**, **`route`** (`^[a-z0-9-]+$`, unique per app), `resource`, `render`, `resolver`, `icon`, `displayConditions`, `keyboardShortcut` | A link in the space navigation. URL is `/spaces/:spaceKey/apps/:appId/:forgeEnvId/:route`. Context provides `space.id`, `space.key`, `location`. Verified [MOD], [SCHEMA] |
| `confluence:globalPage` | **`key`**, **`title`**, **`route`**, `icon`, `resource`, `render`, `resolver`, `displayConditions` | A link in Apps in the main navigation. URL is `/apps/:appId/:forgeEnvId/:route`. Verified [MOD] |
| `confluence:globalSettings` | **`key`**, **`title`**, `resource`, `render`, `resolver`, `displayConditions`, `useAsConfig`, `useAsGetStarted` | `useAsConfig: true` turns it into the app's Configure page on Manage Apps, and the module then gets no navigation link. Only one module per app can do this. Verified [MOD] |
| `confluence:spaceSettings` | **`key`**, **`title`**, **`route`**, `resource`, `render`, `resolver`, `displayConditions` | A tab in the space integration settings. URL is `/spaces/:spaceKey/settings/apps/:appId/:envId/:route`. Verified [MOD] |
| `confluence:contextMenu` | **`key`**, **`title`**, `resource`, `render`, `resolver`, `viewportSize` (`small`, `medium` or `large` only), `description`, `displayConditions` | Appears when text is selected on a page or blog post. Renders in an **inline dialog**. Context includes `selectedText`, `content.id`, `content.type`. Supports dynamic modules. Verified [MOD], [SCHEMA] |
| `confluence:contentAction` | **`key`**, **`title`**, `resource`, `render`, `resolver`, `viewportSize` (`small` to `max`, `resizable`, `{width,height}`), `displayConditions` | An item in the page or blog post "•••" menu. Renders a **modal**. Supports dynamic modules. Verified [MOD], [SCHEMA] |
| `confluence:backgroundScript` | **`key`**, `resource`, `render`, `resolver`, `displayConditions` | Invisible container on Confluence views. Use it for `updateBylineProperties` and `events.emit/on`. Verified [MOD] |
| `confluence:contentProperty` | **`key`**, **`propertyKey`** (alphanumeric and `_` only, globally unique), **`values[]`**: **`path`**, **`type`** (`number`, `text`, `string`, `user`, `date`), **`searchAlias`** (alphanumeric and `_`, globally unique), `uiSupport{name,valueType,defaultOperator,tooltip}` | **Non-UI.** It makes fields of a JSON content property indexed and queryable with CQL, for example `myapp_status=stale` or `content.property[myapp_metadata].status=pending`. Arrays cannot be indexed. Verified [MOD] `confluence-content-property/`. Community report that these modules take a long time to install: https://jira.atlassian.com/browse/CONFCLOUD-83926 (Unverified) |

Copied example ([MOD] `confluence-content-property/`):
```yaml
modules:
  confluence:contentProperty:
    - key: "myApp-extraMetaData"
      propertyKey: myapp_metadata
      values:
        - path: status
          type: string
          searchAlias: myapp_status
```

Note: `confluence:fullPage` was removed on Sep 30, 2026 in favour of `global:fullPage`. Verified, https://developer.atlassian.com/platform/forge/changelog/ (Oct 21, 2026 entry).

---

## 3. UI Kit
- **Versions:** `@forge/react@12.5.0` (published 2026-11-09), `@forge/bridge@7.3.0`, `@forge/resolver@2.0.2`, `@forge/api@8.5.0`. `@forge/react` pins `react ^18.2.0` and has a peer dependency on `typescript >=5`. Verified [PKG]. Install with `npm i react@18 @forge/react@latest`. Verified https://developer.atlassian.com/platform/forge/ui-kit/overview/
- **CLI and Node:** the Forge CLI now requires Node 22.23.4, 24.22.1 or 26.12.1 or newer. Verified, changelog Oct 26, 2026.
- **Components exported in 12.5.0** (Verified [PKG], https://developer.atlassian.com/platform/forge/ui-kit/components/):
  - Review modal: `Modal`, `ModalHeader`, `ModalTitle`, `ModalBody`, `ModalFooter`, `ModalTransition`, `Tabs`/`TabList`/`Tab`/`TabPanel`, `SectionMessage`(+`SectionMessageAction`), `CodeBlock`, `Code`, `AdfRenderer`, `Comment`, `InlineEdit` (Preview), `Popup` (Preview), `Tooltip`, `User`, `UserGroup`, `Spinner`, `EmptyState`, `Button`, `ButtonGroup`, `LoadingButton`, `LinkButton`, `Link`.
  - Dashboards: `DynamicTable` (pagination, sorting, re-ordering), `Pagination` (Preview), `BarChart`, `StackBarChart`, `HorizontalBarChart`, `HorizontalStackBarChart`, `DonutChart`, `PieChart`, `LineChart`, `ProgressBar`, `Heading`, `Text`, `List`.
  - Status: `Lozenge` (status states), `Badge` (numbers), `Tag`, `TagGroup`, `Icon`, `Tile` (Preview).
  - Forms: `Form`, `FormHeader`, `FormSection`, `FormFooter`, `Label`, `RequiredAsterisk`, `HelperMessage`, `ErrorMessage`, `ValidMessage`, `Textfield`, `TextArea`, `Select`, `Checkbox`, `CheckboxGroup`, `Radio`, `RadioGroup`, `Toggle`, `Range`, `DatePicker`, `UserPicker`, plus the `useForm` hook (wraps `react-hook-form@7.65.0`).
  - Layout: `Box`, `Inline`, `Stack`, `Bleed` (Preview), `Pressable`, `xcss`.
  - Hooks: `useProductContext`, `useContentProperty`, `useSpaceProperty`, `useConfig`, `useTheme`, `usePermissions`, `useTranslation`, `useObjectStore`.
- **Design tokens:** "Design tokens enabled features are automatically enabled in Forge UI kit apps." Custom UI must call `view.theme.enable()`. Verified https://developer.atlassian.com/platform/forge/design-tokens-and-theming/. `xcss` takes ADS tokens, for example `backgroundColor: 'color.background.accent.yellow.subtle'`, `padding: 'space.150'` [MOD] page banner example. Since 12.4.0, `Box` and `Pressable` `backgroundColor` also accept non-token colours. Verified [PKG] CHANGELOG.
- **Limits vs Custom UI:** UI Kit "does not directly rely on React DOM", so custom HTML, portals and forwarded refs "may not work". Resources may only contain images. Custom UI has no such restriction. Verified, ui-kit/overview. The `Frame` component can embed a static HTML/JS bundle inside UI Kit. Verified, components page. Styling is limited to `xcss` (no arbitrary CSS or class names). **Unverified** (inferred from the component API).
- **Modal nesting:** with `viewportContainer: modal`, the byline already renders inside a modal. A UI Kit `Modal` opened inside it would stack a second modal. **Unverified** UX. Prefer laying out the review UI directly in the byline modal.

---

## 4. Confluence REST (v2 first, v1 only where v2 lacks the call)

Base: `/wiki/api/v2` (v2) and `/wiki/rest/api` (v1). Verified [V2], [V1].

| Call | Method and path | Scope (granular) | Classic alternative |
|---|---|---|---|
| Get page | `GET /wiki/api/v2/pages/{id}?body-format=storage` or `atlas_doc_format` (also `view`, `export_view`, `styled_view`, `editor`). Flags: `include-labels`, `include-properties`, `include-versions`, `include-version` (default true), `version=<n>`, `get-draft` | `read:page:confluence` | (n/a in spec) |
| List or find pages | `GET /wiki/api/v2/pages?title=...&space-id=...&id=1,2&limit<=250&cursor=` or `GET /wiki/api/v2/spaces/{id}/pages` | `read:page:confluence` | |
| Page versions | `GET /wiki/api/v2/pages/{id}/versions` (`limit` 1-250, `cursor`, `sort`, `body-format`) and `GET /wiki/api/v2/pages/{page-id}/versions/{version-number}` | `read:page:confluence` | |
| Update page | `PUT /wiki/api/v2/pages/{id}` | `write:page:confluence` | |
| Page properties | `GET/POST /wiki/api/v2/pages/{page-id}/properties` (`?key=`), `GET/PUT/DELETE /wiki/api/v2/pages/{page-id}/properties/{property-id}` | GET: `read:page:confluence`. POST/PUT/DELETE: `read:page:confluence` **and** `write:page:confluence` | — |
| Footer comments | `POST /wiki/api/v2/footer-comments`, `GET /wiki/api/v2/pages/{id}/footer-comments`, `GET/PUT/DELETE /wiki/api/v2/footer-comments/{comment-id}` | `write:comment:confluence` / `read:comment:confluence` (delete: `delete:comment:confluence`) | |
| Inline comments | `POST /wiki/api/v2/inline-comments`, `GET /wiki/api/v2/pages/{id}/inline-comments` | `write:comment:confluence` / `read:comment:confluence` | |
| Read labels | `GET /wiki/api/v2/pages/{id}/labels`, `GET /wiki/api/v2/labels/{id}/pages` | `read:page:confluence` (`GET /labels`: `read:label:confluence`) | |
| **Add or remove labels** (v2 has no write) | `POST /wiki/rest/api/content/{id}/label` body `[{"prefix":"global","name":"doc-drift-stale"}]`; `DELETE /wiki/rest/api/content/{id}/label/{label}` | `read:label:confluence` + `write:label:confluence` (marked "Beta" in the spec) | `write:confluence-content` |
| **CQL search** (v2 has no CQL) | `GET /wiki/rest/api/search?cql=...` or `GET /wiki/rest/api/content/search?cql=...` | `read:content-details:confluence` ("Beta") | `search:confluence` |

All rows Verified [V2]/[V1] (operation ids `getPageById`, `updatePage`, `createPageProperty`, `createFooterComment`, `createInlineComment`, `getPageVersions`, and so on). The v1 content-property endpoints are no longer in the v1 spec. Verified [V1].

**Update page rules** (Verified [V2], `updatePage`):
- Required body fields: `id`, `status` (`current` or `draft`), `title`, `body`, `version`.
- `version.number` = current version + 1 (or `1` when switching to `draft`).
- `version.message` is optional ("An optional message to be stored with the version").
- `body` = `{ representation: storage | atlas_doc_format | wiki, value: string }`. For ADF, `value` is the **stringified** JSON.
- Permissions needed: view the page and update pages in the space. A stale version number gets a 409 conflict. **Unverified** (standard behaviour, not in the spec text).
- Updating `current` also tries to merge the change into any open draft. Verified.

**Page property rules:** `POST` body `{key, value}`. `PUT` body `{key, value, version:{number: current+1, message}}`. Creating a property needs "Permission to update the page", and so do edits. So **`asUser()` writes fail for view-only users.** Verified [V2].

**Page owner:** the v2 page object has `ownerId` ("account ID of the user who owns this page", nullable), `lastOwnerId`, `authorId` (original creator), and `version.{number,message,createdAt,authorId,minorEdit}`. `PUT` accepts `ownerId` to transfer ownership. Verified [V2].

**Inline comment anchor:** `inlineCommentProperties: { textSelection, textSelectionMatchCount, textSelectionMatchIndex }` (zero-based index). Required for top-level inline comments. Verified [V2].

Examples (route usage Verified [RC]):
```ts
import api, { route } from '@forge/api';
const page = await api.asUser().requestConfluence(
  route`/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format&include-version=true`);
await api.asApp().requestConfluence(route`/wiki/api/v2/footer-comments`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ pageId, body: { representation: 'storage', value: '<p>Doc Drift: PR #482 ...</p>' } }) });
await api.asUser().requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: pageId, status: 'current', title, version: { number: v + 1, message: 'Doc Drift: accepted proposal for PR #482' },
    body: { representation: 'atlas_doc_format', value: JSON.stringify(adf) } }) });
const cql = `type=page and space="${spaceKey}" and title~"${q}"`;
await api.asUser().requestConfluence(route`/wiki/rest/api/search?cql=${cql}&limit=25`);
```

**`asApp()` vs `asUser()`** (Verified [RC]):
- `asApp()` acts as the app user.
- `asUser()` acts as the invoking user. It is "only available in modules that support the UI kit", so it works in resolvers but **not** in triggers, consumers, scheduled triggers or web triggers.
- `asUser(accountId)` gives offline impersonation and needs impersonation-enabled scopes. [SCHEMA] 13.9.0 still marks per-scope `allowImpersonation` as "not yet supported". **Unverified** how that is enabled today.
- `route` encodes interpolated values. Never build paths by hand.

**App user and restricted pages:** the app user cannot see pages with view restrictions unless it is explicitly granted access, and events for those pages do not arrive. Not in the official docs, but confirmed by two open Atlassian suggestion tickets (ECO-822, ECO-961, see the validation update below). Community source: https://community.developer.atlassian.com/t/allow-forge-app-access-to-restricted-pages/93662. "Confluence permissions … aren't overridden by scopes." Verified [SCOPES].

---

## 5. Scopes summary

[SCOPES] (updated Nov 11, 2026) recommends classic scopes where available and fewer than 50 scopes in total. `forge lint --fix` adds missing scopes but does not remove unneeded ones. Verified.

| Need | Scope(s) |
|---|---|
| Read page, body, versions, labels, properties | `read:page:confluence` |
| Write page body **or any page content property** (byline state) | `write:page:confluence` (+ `read:page:confluence`) |
| Footer and inline comments | `read:comment:confluence`, `write:comment:confluence` |
| Add or remove labels (v1) | `read:label:confluence` + `write:label:confluence`, or classic `write:confluence-content` |
| CQL search (v1) | `search:confluence` (classic) or `read:content-details:confluence` |
| Spaces | `read:space:confluence` |
| Page, comment and label **events** | `read:confluence-content.summary` (label events also need `read:confluence-space.summary`; trashed and deleted events also need `write:confluence-content`) [EVT] |
| `read:confluence-props` / `write:confluence-props` | Classic scopes. The current specs use them only on a v1 attachment endpoint. **They are not needed for v2 page properties.** Verified [V1], [V2] |

---

## 6. Confluence product events (Verified [EVT], updated Apr 1, 2026)
- **Pages:** `avi:confluence:created:page`, `avi:confluence:updated:page`, `avi:confluence:moved:page`, `avi:confluence:copied:page`, `avi:confluence:archived:page`, `avi:confluence:unarchived:page`, `avi:confluence:trashed:page`, `avi:confluence:restored:page`, `avi:confluence:deleted:page`, `avi:confluence:permissions_updated:page`, `avi:confluence:viewed:page`, `avi:confluence:liked:page`, `avi:confluence:children_reordered:page`.
- **Live docs:** `avi:confluence:initialized:page`, `avi:confluence:started:page`, `avi:confluence:snapshotted:page`, `avi:confluence:published:page`.
- **Blog posts:** `avi:confluence:created|updated|trashed|deleted…:blogpost`.
- **Comments:** `avi:confluence:created:comment`, `avi:confluence:updated:comment`, `avi:confluence:deleted:comment`, `avi:confluence:liked:comment`.
- **Labels:** `avi:confluence:created:label`, `avi:confluence:added:label`, `avi:confluence:removed:label`, `avi:confluence:deleted:label`.
- **Payload fields:** `eventType`, `atlassianId`, `eventCreatedDate`, `suppressNotifications`, **`selfGenerated`** (true when the receiving app caused the event, so you can filter out your own page and comment writes), `updateTrigger` (on `updated:page`, `started`, `snapshotted`, `published`, `updated:blogpost`), and `content{ id, type, subType?, status, title, space{id,key,...}, history{createdBy, ownedBy, createdDate}, version{by, when, number} }`. PII fields in `User` are replaced with the accountId.
- Cascading deletes emit no events. Verified.
- **Useful for Doc Drift:**
  - `updated:page`: when a human edits an anchored page, mark the drift as possibly addressed or re-baseline. Filter out `selfGenerated`.
  - `trashed:page` / `deleted:page`: clean up bindings.
  - `moved:page`, `copied:page`: copy or keep bindings.
  - `added:label`: lets a user opt a page in by labelling it.
  - Whether content-property writes fire `updated:page` is **Unverified**. Guard with `selfGenerated` anyway.

---

## Differences from plan.md

1. **Scopes (section 14):**
   - `write:page:confluence` is **Must**, not "Should". Every byline state write (v2 page properties) needs it.
   - `read:confluence-props` / `write:confluence-props` are not used by v2 page properties. Remove them.
   - Add `search:confluence` (CQL, for title search and dashboard queries).
   - Add `read:confluence-content.summary` if the plan subscribes to any Confluence event.
   - Add `read:label:confluence` + `write:label:confluence` (or `write:confluence-content`) if labels are written.
2. **`confluence:spacePage` is missing the required `route`.** Lint and deploy will fail. Add `route: drift-dashboard`.
3. **`confluence:globalSettings`:** consider `useAsConfig: true` so the settings show as the app's Configure page under Manage Apps. Only one module per app may set it, and that module loses its navigation link.
4. **Byline `viewportSize`:** the plan says "`small` to `fullscreen`". The [SCHEMA] enum lacks `xlarge` and `max` for the byline. `large`, as in the skeleton, is fine.
5. **`contentPropertyKey` details missing from the plan:**
   - The backend must write the property under the exact raw key, with the value shape `{title, icon, tooltip}`.
   - `useContentProperty` namespaces its key as `forge-${localId}-${key}`, so it is not a reliable writer for the byline key.
   - `updateBylineProperties` only refreshes the UI, never persists, and must run from another module on the page (backgroundScript, pageBanner or macro). The plan has no such module. Add `confluence:backgroundScript` if live refresh matters.
   - The icon format inside the property is undocumented. Add this to Open Question 2.
6. **Who writes state:** creating or updating a page property requires *edit* permission on the page. "Mark verified" by a view-only user fails `asUser()`. Write state `asApp()` from the resolver after checking the user's permission with an `asUser()` call (see the validation update below: an `asApp()` check of another user's permission is unreliable), or limit the action to editors (for example `hasPagePermission: EDIT`).
7. **`asUser()` is unavailable in triggers, consumers, scheduled triggers and web triggers.** Notifications and comments from the backend are posted `asApp()` and are authored by the app user. The app user cannot see restricted pages unless explicitly granted access (community source). Document this as a known limit.
8. **Labels and CQL are v1 only.** v2 cannot add labels or run CQL. The plan's "v2 … labels" needs `/wiki/rest/api/content/{id}/label`, and title or CQL search needs `/wiki/rest/api/search`.
9. **Missing opportunity: `confluence:contentProperty`.** Indexing a state property (key must be `[A-Za-z0-9_]` only, for example `dds_state`) makes `dds_state = "stale"` CQL-queryable. That serves the dashboard, Rovo actions and the Page Properties Report. It also allows `entityPropertyEqualTo` display conditions (for example a stale-only page banner). The plan's byline key `dds-byline-7f3c2a` contains hyphens, so it cannot double as an indexed key. Keep two properties.
10. **`confluence:pageBanner`:** if it is used for "Stale" warnings, design for **48px or less**. A 48px cap and a return to Preview were announced and then put on hold. Limit it to one banner and make it dismissable.
11. **`confluence:contextMenu`** renders in an inline dialog (`viewportSize` limited to `small`/`medium`/`large`). Reusing the `byline` resource there works only if the entry point branches on `context.extension.type`. Use a separate resource or an `entry`.
12. **Missing event triggers:** the plan never listens to Confluence events. Add `avi:confluence:updated:page` (re-baseline after human edits, filtering `selfGenerated`) and `avi:confluence:trashed:page` / `deleted:page` (clean up bindings).
13. **Tooling:** the Forge CLI needs Node 22.23.4, 24.22.1 or 26.12.1 or newer. Current packages are `@forge/react@12.5.0` and `@forge/confluence-bridge@4.0.0`, which is a major version above the 3.1.0 the plan cites. `nodejs24.x` is a valid runtime.

---

## Update (2026-11-11, validation pass)

### Q1. Byline `contentPropertyKey`: value shape and icon
- **Shape:** a flat JSON object `{ "title": string, "icon": string, "tooltip": string }`, all optional. Verified [BYL], [UBP], and the `BylineProperties.valueUpdate` type in `@forge/confluence-bridge@4.0.0` (`out/content/types.d.ts`: `title?`, `icon?`, `tooltip?`, all strings). This is **not** the old Connect shape (`{ "name": {"value"}, "icon": {"width","height","url"}, "tooltip": {"value"} }`), which is still in the `connect-confluence:contentBylineItems` schema of `@forge/manifest@13.9.0`. Do not copy Connect examples.
- **Icon format:** a single string. No doc defines the accepted forms for the content-property path. **Unverified.** What is known:
  - `dynamicProperties` icons pass a source-URL permission check. Allowed by default: `resource:<resource key>;<relative path>` and `data:image` URIs. Other URLs need `permissions.external.images`. Verified [BYL].
  - Atlassian's own byline example app returns an absolute URL (`https://jira.atlassian.com/images/icons/priorities/high.svg`) and declares `external.images: ['*.atlassian.com']`. It puts state in the title as an emoji (`👍 Approved`). Verified, https://bitbucket.org/atlassian/forge-ui-kit-2-page-approver/src/main/src/server/index.js and `manifest.yml`.
  - Community report (Sep 2024): a `resource:resource1;icon-1.png` icon did not render, while title and tooltip did. Suggested workaround: a base64 `data:image/svg+xml;base64,...` URI. No staff reply, fix not confirmed. https://community.developer.atlassian.com/t/issue-with-confluence-content-byline-item-icon/83328
  - **Design call:** store a small base64 `data:image/svg+xml` URI. The manifest's 255-character `icon` limit is not known to apply to property values, but keep the SVG tiny. Also put the state in `title` text so the byline still reads right if the icon falls back to the generic app icon. Spike S2 confirms.
- **Key lookup and namespacing:** **still open.** Facts:
  - The byline doc example writes from another module with `useContentProperty('byline-properties-unique-key', ...)`. Verified [BYL].
  - That hook stores the property as `forge-${context.localId}-${key}` (`@forge/react@12.5.0` `out/hooks/utils/apiRequestUtils.js`), but emits `FORGE_CONTENT_PROPERTY_UPDATED` with the raw key. Verified [PKG].
  - [UBP] writes the raw key through REST v2 `POST /wiki/api/v2/pages/{id}/properties`. Verified.
  - [BYL] warns that "multiple content properties with the same key could exist on the same page". Raw keys are unique per page, so this hints that Confluence may match prefixed (`forge-<localId>-<key>`) keys too. **Unverified** inference.
  - Spike: write the raw key `asApp()` from the backend, reload the page, and check the byline. If it does not pick it up, try the `forge-<localId>-<key>` form with the byline's own `localId`.
- No public GitHub Forge app using `contentPropertyKey` was found (GitHub code search needs auth here; web search found none). The feature shipped with Forge CLI 12.6.1 (changelog, Oct 2025).

### Q2. `asApp()` and pages with view restrictions
- **The app user is blocked by page view restrictions.** Scopes and space permissions do not override them. "There is no existing workaround for this use case… This is an intended behavior" (forum reply, Jul 2025). https://community.developer.atlassian.com/t/allow-forge-app-access-to-restricted-pages/93662
- Atlassian's tracker confirms the limit: ECO-822 "Allow Forge Apps to Access Restricted Confluence Pages When Granted Admin-Level Scopes" (Gathering Interest, 41 votes, updated Aug 2026). https://jira.atlassian.com/browse/ECO-822 . ECO-961: no page-viewed or page-updated **events** for restricted pages unless the app user is granted view access (Gathering Interest). https://jira.atlassian.com/browse/ECO-961 . Verified that both tickets exist and are open.
- The 2022 "Forge apps can now access restricted resources" fix (FRGE-212) is about scope-gated REST APIs, not page restrictions. https://community.developer.atlassian.com/t/forge-apps-can-now-access-restricted-resources/54999 . Verified.
- "Restricted Confluence Space Access (Preview)" lifts page restrictions only during an active app **migration**. Not usable here. https://community.developer.atlassian.com/t/restricted-confluence-space-access-preview-does-it-cover-page-restrictions-or-only-space-permissions/102808 . Verified (staff reply, Sep 24, 2026).
- **Workarounds:**
  1. Use `asUser()` in resolvers when a user who can see the page is present. Verified [RC]. Not possible in triggers or consumers.
  2. Add the app user to the page restriction. REST v2 now has `GET/POST/PUT/DELETE /wiki/api/v2/pages/{id}/permissions` (scope `read:page:confluence` / `write:page:confluence`; POST needs "permission to edit the page or administer the space"; body `{ permissions: [{ operation: "read"|"update", principals: [{ principalType: "user", principalId: <accountId> }] }] }`; POST preserves other principals). Verified [V2] `addPagePermissions`. An editor could do this `asUser()` from the byline when binding a page. **Caution, Unverified:** adding a `read` entry to a page with no direct read restriction may create one and lock everyone else out. Only add when `GET .../permissions?operation=read` already returns entries. Whether the app user's accountId (from `GET /wiki/rest/api/user/current` called `asApp()`) is accepted as a principal is **Unverified**.
  3. Otherwise document it: restricted pages are skipped, and the dashboard says so.

### Q4. Checking a user's view or edit permission from `asApp()`
- **v1 `POST /wiki/rest/api/content/{id}/permission/check`.** Body `{ "subject": { "type": "user", "identifier": "<accountId>" }, "operation": "read" | "update" | "delete" }`. Response `200 { "hasPermission": boolean, "errors": [ {translation, args} ], "_links": {} }`. It checks site permission, space permission and content restrictions. Scopes: classic `read:confluence-content.permission`, granular `read:content.permission:confluence` (Beta). Verified [V1] `checkContentPermission`, https://developer.atlassian.com/cloud/confluence/rest/v1/api-group-content-permissions/
- **Catch:** checking anyone other than the caller requires the **"Confluence Administrator" global permission**. Checking yourself needs only "Can use". Verified [V1]. The app user is not known to hold Confluence Administrator. Community reports from `asApp()`: `401 FAILURE_CLIENT_SCOPE_CHECK` with both scopes declared (Oct 2025, https://community.developer.atlassian.com/t/forge-macros-how-to-check-if-user-can-edit-page/51070), and `hasPermission: false` for all 1402 pages the user owned (Jul 2026, https://community.developer.atlassian.com/t/confluence-content-id-permission-check-from-always-returns-no-permission-for-user-but-im-the-owner-of-the-pages/101710). Neither has a fix. Also, the app user cannot see restricted pages, so the check probably fails on them (Unverified). **Treat `asApp()` checks of another user as unreliable.**
- **v2 has no "check another user" endpoint.** Verified [V2] (no such path). The v2 equivalents work for the caller only:
  - `GET /wiki/api/v2/pages/{id}/operations` returns `{ operations: [{ operation, targetType }] }` for the calling principal. Scope `read:page:confluence`. Verified [V2] `getPageOperations`. Exact operation strings (`read`, `update`, `delete`) are **Unverified**.
  - `GET /wiki/api/v2/pages/{id}/permissions?principal-type=user&principal-id=<accountId>` lists **direct** restriction entries only. It is not an effective-permission check. Verified [V2].
- **Recommended pattern:** in a resolver, call `asUser()` `GET /wiki/api/v2/pages/{id}/operations` (or v1 `permission/check` with the user's own accountId), then write state `asApp()` if `update` is present. For Rovo actions or MCP tools with no `asUser()`, the plan's "asApp() plus explicit permission check" is **not supported by any reliable endpoint**. Spike it; if it fails, those tools stay read-only or limit themselves to unrestricted pages.

## Update (2026-11-11, Forge MCP server check)

Source: the Forge MCP server (`search-forge-docs`, `get-api-required-scopes`), which reads the current developer.atlassian.com docs and REST specs.

- **Byline `icon` format.** The module reference says `icon` "accepts a relative path from a declared resource. Alternatively, you can also use an absolute URL to a self-hosted icon." If the icon is missing or fails to load, a generic app icon shows. The content-property example sets `icon: "new-icon-path"`, the same kind of resource-relative path. So ship the 4 state icons as SVG files in the byline resource and write their relative paths into the property. The base64 `data:` URI guess above is now only a fallback. Verified: https://developer.atlassian.com/platform/forge/manifest-reference/modules/confluence-content-byline-item/ . Whether a path stored in a content property resolves against the resource the same way as one in the manifest is still for spike S2 to confirm.
- **Unique key.** The docs warn that if several content properties with the same key exist on a page, the byline will not update. Keep `contentPropertyKey` UUID-like (the planned `dds-byline-7f3c2a` is fine). Verified: same page.
- **Live refresh.** The docs name `confluence:backgroundScript` as the place to refresh byline properties. Verified: same page.
- **Scope for `GET /wiki/api/v2/pages/{id}/operations`:** `read:page:confluence` (granular only). Verified: Confluence REST v2 OpenAPI spec, via `get-api-required-scopes`.
- The old Connect format (`name.value`, `icon.url`, `tooltip.value`) appears in the Connect tutorial "Changing a byline dynamically". It does not apply to Forge, which uses the flat `{title, icon, tooltip}`.

## Update (2026-11-12, phase 2 backend)

- **Tiny links decode to page IDs.** `/wiki/x/<code>` is URL-safe base64 (`-` for `/`, `_` for `+`, padded with `A`) of the page ID's little-endian bytes. Verified live: the decoder matched `_links.tinyui` for 5 DDSTEST/PLAT pages (`2wAq` = 2752731, `HIAu` = 3047452, `WAAv` = 3080280, `gYEp` = 2720129, `EoIt` = 2982418). Page responses carry `_links.tinyui`. Used by `parsePageRef` (BUG-04).
- **Moved and restored page events** (`avi:confluence:moved:page`, `avi:confluence:restored:page`) need only `read:confluence-content.summary`; trashed and deleted also need `write:confluence-content`. `moved:page` carries `prevContent`. Verified: https://developer.atlassian.com/platform/forge/events-reference/confluence/ (via the Forge MCP). Live: a page moved to ENGS had its bindings follow in 8 s; adding the two events did not trigger a major version (core 4.18.0).
- **The byline content property can be written on a trashed page** (live: the Unanchored value was in place 8 s after the trash, before the restore).
- **Draft pages.** `GET /wiki/api/v2/pages/{id}` takes `status` as an array (`current`, `draft`, ...) and `get-draft`; a never-published page needs `status=draft`. The app user gets 404 on drafts, which the byline previously read as "restricted" (UX-2). The resolver now asks `?status=current&status=draft` asUser. Spec Verified (OpenAPI via the Forge MCP); the asUser draft read is **Unverified** live (needs a browser).
