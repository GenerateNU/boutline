# Boutline design

How Boutline looks and how its screens are put together: the visual language,
layout, navigation, motion and component conventions every screen follows. What
the product does, screen by screen, is in `BOUTLINE.md`.

This document changes when a design practice does: a new token, a new primitive, a
new pattern meant for reuse. Building a screen out of the existing practices doesn't
need an entry here.

The hi-fi pass is underway: a navy brand, a palette of tokens, and status colors,
light mode only. Screens move over to the hi-fi Figma one at a time, and the rest
still look like the earlier outlined set. Components use tokens, never raw colors.

## Layout

- Mobile-first, since most people use Boutline from the venue floor. One column:
  `mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10` (`max-w-mobile` is
  440px).
- Spacing: `gap-1`/`gap-2` inside a control, `gap-3`/`gap-4` between items in a list
  or section, `gap-10` between page sections.
- Group content with `Section`, whose title is a small uppercase muted label.
- The page scrollbar is hidden everywhere (`scrollbar-width: none` on `html`); pages
  still scroll. Scrollable areas inside a page keep their scrollbars.
- A row of controls too wide for the screen scrolls sideways with its scrollbar
  hidden, and fades out at the edge with more past it as the scroll hint.

## Navigation

- **Global nav** (every page): an obsidian bar with the slanted blue plate and the
  BOUTLINE wordmark. Its menu slides a light sidebar in from the left with the
  current route's item highlighted, closed by an X at its top left.
- **Tabs:** a full-width obsidian row directly under the global nav. From `lg` the
  row moves up into the global nav, right of the plate, with each tab as wide as its
  label, and the active tab's green underline spans the whole tab. The underline
  slides to a newly chosen tab.
- **Nested pages** keep their level's tab bar with their tab active, but not the
  level's header. Each draws one back button, labelled with where it goes, in its
  place. `TabPageOnly` hides the level's header by URL depth, so a loading screen
  above the layout agrees.
- The hi-fi navigation set is `logo`, `navbar`, `navigation-bar` and
  `navigation-item`. `global-nav` renders `navbar` as its header. `navigation-bar`
  is the obsidian row of `navigation-item` tabs, and `tab-nav` renders it with the
  active tab taken from the URL path (so a loading screen above the layout marks the
  same tab). The logo takes its tone from the text colour (`text-white` or
  `text-blue`).

## Color

Tokens live in `src/app/globals.css`.

| Token | Use |
| --- | --- |
| `background` / `foreground` | page and text; `foreground` is also the outline color |
| `muted` / `muted-foreground` | hover fills, secondary text, empty states |
| `selected` (blue) | only a chosen state: filled button, toggle on, active tab. Hi-fi chip rows (`ChipGroup`) are the exception: an on chip keeps its blue outline and blue text over a `blue-lighter` fill |
| `destructive` | errors and destructive actions; hi-fi destructive actions (Button `destructive` variant) use `red-dark` |
| `border`, `input`, `ring` | hairlines, field borders, focus rings |
| `brand` | alias of the hi-fi navy `blue` (#21358b), kept for existing uses |
| `charcoal` (#1e1e1e) | the `Text` `heading` variant |
| `green` (#32944b) | the V tile on the pool bout card |
| `amber` (#f5a623) | the Eliminated dot on pool results, beside `accent-green` for Advanced |

No Tailwind palette colors. Status pills (tournament, pool and event status) go
through the `StatusBadge` primitive, which maps a status to one of the status pairs.
A pinned item turns light blue, with its pin and rating badge in navy.

## Type

Geist Sans; Geist Mono for aligned numbers. Hi-fi screens use Manrope
(`font-manrope`), and the BOUTLINE wordmark uses Special Gothic Expanded One
(`font-wordmark`). Body and controls `text-sm`, metadata
`text-xs text-muted-foreground`, at most `font-medium`. Sizes from `text-2xl` up are
reserved for scores, bout banners and the event page heading. Referee scores go up
to `text-9xl`.

Page text uses the `Text` primitive (`textVariants` inside other primitives' slots):

| Variant | Style | Use |
| --- | --- | --- |
| `heading` | `text-2xl font-semibold text-charcoal` | Title/H3, the event name on its tabs |
| `title` | `text-xl font-semibold` | titles and time headings; uppercase where the design is |
| `subtitle` | `text-sm font-semibold` | row names |
| `body` | `text-sm` | |
| `caption` | `text-xs font-medium text-neutral-secondary` | times and metadata |
| `muted` | `text-sm text-neutral-secondary` | empty states |

## Shape and interaction

- `--radius` 0.625rem, with `rounded-sm`…`rounded-xl` derived from it. List cards
  use `rounded-md`; pills (tab nav, icon buttons, avatars) use `rounded-full`. 1px
  `border-foreground`, no shadows, except floating surfaces (select menu, dropdown,
  date field popover, upload dialog, modal, filter sheet, toast) which use
  `shadow-md`.
- Hi-fi pool cards are white with a `border-outline` border, `rounded-[12px]` and
  `shadow-sm`; pool grid cells and their header pills use a 4px radius.
- Focus `focus-visible:ring-2 ring-ring`; hover `bg-muted`; disabled `opacity-50`.
- Icons are Material's Outlined set from `@mui/icons-material`, imported by path
  (`@mui/icons-material/SearchOutlined`), at `size-4`, `aria-hidden` when
  decorative. A filled glyph marks only a set state, like a pinned item.
  `globals.css` puts MUI's `mui` layer before `utilities` so Tailwind sizes and
  colors win.
- Referee touch targets are large (`h-32`), because they are pressed under time
  pressure.

## Motion

- Transitions and keyframes ease in-out.
- Every animation is off under reduced motion (`motion-safe:` or a
  `prefers-reduced-motion` override), and the screen still makes sense without it.
- Collapsibles animate height and opacity (`animate-collapsible-down`/`-up`).
- `Background` patterns fade in from their top-left corner once the image has
  loaded.

## Components

- Primitives live in `src/components/primitives/`: shadcn-generated, restyled, with
  `cva` variants, `cn`, `data-slot`, and behavior from `radix-ui`.
- The set includes the global nav, tab nav, section, list, card, chip (the filter
  tag: `rounded-md border-blue-light bg-blue-lightest text-blue` with a close X when
  it is removable), chip group, text, label, button, segmented button, search bar,
  dropdown, text field, select, date field, time field, checkbox, radio, toggle,
  slider, calendar, dropzone and upload dialog, modal, filter sheet, pagination,
  toast, tooltip, progress indicators, a loading spinner, and a shimmering skeleton
  block.
- **Form fields** (text field, select, date field, time field) share one hi-fi
  frame: a `text-xs` label above a `rounded-md border-outline` box that turns
  `border-blue` with a `ring-blue-lighter` halo on focus or open, a 2px
  `border-red-dark` when `aria-invalid` or `:user-invalid` (a required field left
  empty once edited or submitted), and `bg-disabled` when disabled. A required
  field's label ends in a `text-red-dark` asterisk, hidden from screen readers since
  `required` is already announced.
  - Select is Radix Select, its menu capped at `max-h-80` and scrolling past that.
  - The date field opens the calendar in a Radix Popover on the picked day (or
    today) and shows `MMM d, yyyy`.
  - The time field is a Select of 15-minute slots shown as `h:mm a` behind a clock
    icon, holding the `HH:mm` a native time input would; an off-grid value is added
    to the list.
  - A birth date stays a typed native date input, since paging a calendar back
    years is slower than typing it.
- **Modal:** a `rounded-3xl p-5` card with an `text-xl` title and close (X) header,
  a muted description, and a two-column `ModalFooter` (outline Cancel plus a filled
  or `destructive` action).
- **Filter sheet:** a `rounded-t-3xl` bottom sheet. Its search sections are a label
  above a `FilterSearchField`, whose suggestions show in a `Dropdown` of
  `DropdownOption` rows while typing, floating over the sections below rather than
  pushing them down. Picked values show as removable `Chip` tags at the top until
  submitted. Other sections are a slider, a Select, and rows of outline chips
  (`ChipGroup` / `ChipGroupItem`), then a full-width Clear All and a filled submit.
  `triggerActive` gives the trigger its pressed look while filters are applied.
- **Applied filters** show as `Name: Value` removable `Chip` tags (e.g. "Status: In
  Progress") under the page's search bar.
- **Toast:** a single obsidian row with white `text-sm`, a leading icon, an
  `accent-green` action, and no close button.
- A component used by one route stays in that route's `_components/` until a second
  route needs it.

## Loading states

Fetched content shows a skeleton of its page until it arrives. Only what depends on
the response shimmers as `Skeleton` blocks; fixed headings, labels, tabs, static
cards and controls that need no fetched data render for real, so nothing but the
data changes when it lands. Controls that would act on unloaded data are disabled.

- Each fetching route segment has its own `loading.tsx`, under its tab bar. A layout
  that fetches gets its boundary one level up, which draws its tabs too (the
  dashboard's `(dashboard)` group, the tournament's `(tournament)` group, the event
  shell in `events/loading.tsx`).
- Route groups and in-page `Suspense` keep a fallback off pages it doesn't fit:
  `/tournaments` and `/admin/tournaments` use `Suspense`, and an event's fencer list
  sits in `fencers/(list)`. Client fetches render their skeleton in place.
- No `loading.tsx` sits beside a tabbed layout, where it would wrap every tab: a tab
  switch shows the nearest fallback the browser already has until the new tab's own
  arrives, so the tournament Overview's lives in `(tournament)/(sections)/(overview)`.
- A skeleton's first child is a screen-reader-only `role="status"` "Loading …"
  label; the blocks are `aria-hidden`. `Skeleton` shimmers with `motion-safe:` and
  stays flat when reduced motion is on.
- The `Loading` spinner is left for inline waits, such as `FilterSearchField`
  suggestions.

## Open questions

- Dark mode, and whether `selected` stays blue.
- Desktop layouts for the organizer console, which may outgrow 440px.
