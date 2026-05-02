# Context Window Card For Chat Plan

Date: 2026-05-02

## Purpose

This document defines a follow-up plan for the inference metrics context window card so it better reflects the current product reality:

1. The app now has a functional multi-tab chat system.
2. For sessions launched outside the app, we often cannot display true live context usage from the model runtime.
3. The current dashboard card still assumes a llama-server-centric interpretation of context and over-emphasizes metrics like "Peak observed" that are no longer useful.

The goal of this work is to redesign the context card so it can surface chat-relevant context information in a premium, modern, flexible way without pretending that unavailable runtime metrics are available.

This document is intended for a future AI agent implementing the next feature branch, alongside the broader architecture work in [`docs/20260502-window_architecture_cleanup_plan.md`](/Users/nick/SCRIPTS/CLAUDE/llama-monitor/docs/20260502-window_architecture_cleanup_plan.md:1).

## Product Problem

The current card is optimized for a narrow interpretation of context:

- it shows a live usage rail when `llama-server` exposes current context tokens
- otherwise it falls back to "peak observed only"
- it uses a second rail for "Peak observed"

Current implementation:

- HTML card shell in [`static/index.html`](/Users/nick/SCRIPTS/CLAUDE/llama-monitor/static/index.html:337)
- update logic in [`static/js/features/dashboard-ws.js`](/Users/nick/SCRIPTS/CLAUDE/llama-monitor/static/js/features/dashboard-ws.js:503)

Problems with the current design:

1. "Peak observed" is low-value and not actionable.
2. When live context is unavailable, the card becomes a weak fallback rather than a meaningful product surface.
3. The card does not leverage the app’s strongest internal source of context-related information: chat tabs, message token metadata, compaction state, and context pressure inside the chat experience.
4. The current card is designed around one runtime stream, not around `0..N` chats.

## Current Relevant Code Reality

### Runtime context data

The dashboard currently reads:

- `context_capacity_tokens`
- `context_live_tokens`
- `context_live_tokens_available`
- `context_high_water_tokens`

These come from llama metrics and slot polling in Rust:

- [`src/llama/poller.rs`](/Users/nick/SCRIPTS/CLAUDE/llama-monitor/src/llama/poller.rs:206)
- [`src/llama/metrics.rs`](/Users/nick/SCRIPTS/CLAUDE/llama-monitor/src/llama/metrics.rs:26)

### Chat-side context data

The chat system already tracks useful information per message/tab:

- `input_tokens`
- `output_tokens`
- per-message `ctx_pct`
- per-tab `lastCtxPct`
- compaction tombstones with `ctx_pct_before`
- auto-compact settings and thresholds

Relevant files:

- [`static/js/features/chat-transport.js`](/Users/nick/SCRIPTS/CLAUDE/llama-monitor/static/js/features/chat-transport.js:292)
- [`static/js/features/chat-render.js`](/Users/nick/SCRIPTS/CLAUDE/llama-monitor/static/js/features/chat-render.js:267)
- [`static/js/features/chat-params.js`](/Users/nick/SCRIPTS/CLAUDE/llama-monitor/static/js/features/chat-params.js:160)

### Chat tab count

There does not appear to be an explicit hard limit on chat tabs today.

New tabs are added by appending to `window.chatTabs`:

- [`static/js/features/chat-state.js`](/Users/nick/SCRIPTS/CLAUDE/llama-monitor/static/js/features/chat-state.js:84)

That means this card should be designed for `0..N` tabs and should not assume only one or two concurrent chats.

## Design Goals

The redesigned card should:

1. remain useful whether or not live runtime context is exposed
2. reflect chat context pressure as a first-class app concept
3. work with zero chats, one chat, or many chats
4. stay premium and visually rich, not become a plain diagnostic table
5. preserve at-a-glance scanning value on desktop
6. avoid lying about unavailable runtime information

## Non-Goals

This work is not:

- a chat-tab management overhaul
- a full dashboard redesign
- a rewrite of all context metric plumbing
- a requirement to compute exact token truth for externally launched sessions

## Core Product Decision

The context card should become a hybrid "Context Intelligence" card rather than a narrow "runtime context rail."

The card should prefer the best available source in this order:

1. true live runtime context from llama metrics when available
2. chat-derived context pressure from active/persisted chat tabs
3. capacity-only fallback when only model context size is known
4. empty/educational state when none of the above are available

This is more honest and more useful than the current "peak observed only" fallback.

## Proposed Naming

Recommended card title options:

- `CONTEXT INTELLIGENCE`
- `CONTEXT PRESSURE`
- `CONTEXT WINDOW`

Recommendation:

- Keep the user-facing label as `CONTEXT WINDOW` for continuity.
- Internally treat it as a richer context-intelligence card.

## Data Model Recommendation

Introduce a small derived frontend view-model for the card, separate from raw llama metrics.

Suggested shape:

```js
{
  mode: 'live-runtime' | 'chat-derived' | 'capacity-only' | 'empty',
  capacityTokens: number,
  runtimeLiveTokens: number | null,
  runtimeLivePct: number | null,
  activeChatCount: number,
  pressuredChatCount: number,
  busiestChat: {
    id: string,
    name: string,
    ctxPct: number | null,
    inputTokens: number,
    outputTokens: number,
    autoCompact: boolean,
  } | null,
  chatSummaries: Array<{
    id: string,
    name: string,
    ctxPct: number | null,
    state: 'idle' | 'warm' | 'warning' | 'critical' | 'unknown',
  }>,
  aggregateChatPressure: {
    avgPct: number | null,
    maxPct: number | null,
  },
  note: string | null,
}
```

This model should be derived in JS from:

- current llama metrics
- `window.chatTabs`
- active tab metadata
- compaction configuration

## Two UI Options

## Option A: Hero Gauge + Chat Strip

### Summary

This option keeps one dominant "hero" readout for the single most important context number, with a secondary strip for chat distribution.

### Visual Structure

Top:

- oversized percentage or token figure
- compact state chip: `live`, `derived`, `capacity only`, `idle`
- subtle radial or arc gauge behind the number

Middle:

- one-line explanatory subtitle
- runtime line when available: `42K / 128K live`
- otherwise derived line: `3 chats tracked · 1 under pressure`

Bottom:

- horizontal mini-strip of chat pills or tiny bars
- each pill represents a tab
- color-coded by context pressure
- if too many tabs exist, show first N plus `+X more`

### Best Use Case

This option is best if:

- you want the card to stay dashboard-like
- you want maximum legibility at a glance
- you want a premium "single hero metric" look

### Motion / Animation

When live runtime context is available:

- slow breathing glow on the gauge ring
- animated gradient fill along the arc
- micro pulse when thresholds are crossed

When chat-derived:

- subtle wave shimmer across active chat pills
- warning tabs get a restrained ember-like inner glow

Idle state:

- low-energy glass card with faint ambient gradient
- no spinner-style motion

### Strengths

- strongest at-a-glance readability
- easiest transition from current card
- works well even with many chats via summarized strip

### Weaknesses

- less detail-rich for comparing many chats
- chat distribution is secondary rather than primary

## Option B: Context Fleet Board

### Summary

This option turns the card into a compact multi-chat control surface. Instead of one big rail, it shows chat-aware context cards inside the dashboard card itself.

### Visual Structure

Top:

- card title
- chip showing mode: `chat-derived` or `live-runtime`
- summary text such as `4 chats · 1 critical · 2 auto-compact`

Body:

- a compact stack or grid of mini rows, one per top-priority chat
- each row contains:
  - tab name
  - miniature pressure bar
  - context percentage or `unknown`
  - compaction badge if enabled

Footer:

- one aggregate line:
  - `active chat pressure avg 61%`
  - or `runtime live 42K / 128K`

If there are more chats than fit:

- show top 4 by pressure
- final row becomes `+7 more chats`

### Best Use Case

This option is best if:

- you want the card to reflect the chat system more explicitly
- you expect users to run multiple parallel conversations
- you want the dashboard to feel more like a coordination cockpit

### Motion / Animation

- each mini row can softly animate its pressure fill
- active chat rows can have a low-amplitude "signal scan" gradient
- warning/critical rows can use restrained edge glow rather than hard blinking

### Strengths

- best expression of multi-chat context pressure
- future-friendly if chat count becomes more important
- easier to grow into richer tab management later

### Weaknesses

- less clean as a single-metric hero card
- more complex visually
- higher implementation complexity

## Recommendation

Recommended primary direction: **Option A**

Reasoning:

1. It preserves strong dashboard scanability.
2. It can absorb both runtime context and chat-derived context gracefully.
3. It gives premium visual payoff without making the card too dense.
4. It leaves room to evolve toward Option B later if multi-chat usage becomes heavier.

Recommended fallback/alternate mode:

- Option B can be used later for a larger "expanded context details" panel or a future dashboard preference.

## Recommended Final Behavior

### Mode 1: Live Runtime Context Available

Display:

- hero number = live percentage
- subtitle = `NNK / CCCK live`
- bottom chat strip = optional chat context pills if chat tabs exist

Interpretation:

- runtime remains authoritative
- chat is supporting context, not the primary metric

### Mode 2: Runtime Context Unavailable, Chat Context Available

Display:

- hero number = busiest chat `ctx_pct` or aggregate derived percentage
- chip = `derived`
- subtitle = `Based on tracked chat conversations`
- bottom strip = per-chat pills/bars

Interpretation:

- the card is still useful without pretending to know server truth

### Mode 3: Capacity Only

Display:

- hero number = capacity tokens only, or a softer `—`
- subtitle = `Context size known, live usage unavailable`
- show one understated capacity bar
- do not show "peak observed"

### Mode 4: No Active Chats, No Runtime Context

Display:

- educational empty state
- example copy:
  - `Start a chat or attach to a server to track context pressure`

## What To Remove

Remove from the current card:

1. the `Peak observed` rail
2. the phrase `peak observed only`
3. the notion that the fallback state is still primarily about runtime historical peaks

The card should become clearer and more intentional.

## Visual Language Guidance

This work should feel premium and modern, not utilitarian.

### Styling Direction

- layered glass surface
- richer gradient depth than the current plain rails
- restrained neon accents only at warning thresholds
- clean typography hierarchy
- animated fills that feel ambient, not arcade-like

### Color Semantics

- `idle`: cool slate / muted cyan
- `warm`: blue-green
- `warning`: amber-gold
- `critical`: ember red
- `derived`: use a distinct but calm tint, such as electric teal

### Animation Guidance

Avoid:

- hard blinking
- loading-spinner energy
- overly noisy particle effects

Prefer:

- breathing glows
- slow gradient drift
- lightweight pressure-fill shimmer
- threshold crossing pulses

## Handling Many Chats

The card should plan for large tab counts even if the rest of the chat UI does not yet fully optimize for them.

Recommended rules:

1. Sort chats by pressure descending.
2. Surface only the top N chats in-card.
3. Summarize the overflow as `+X more`.
4. Never let the card height explode because of tab count.

Suggested N:

- desktop: 4 to 6 summary items
- narrow layouts: 3 to 4 summary items

## Architecture Guidance

This feature should be implemented with the architecture cleanup work in mind, not against it.

Recommended ownership:

1. Derive context-card data in a dedicated context module, not directly inside `dashboard-ws.js`.
2. Keep raw runtime metric reading separate from chat-derived context aggregation.
3. Keep rendering in the dashboard render layer or a context-card-specific render helper.
4. Avoid adding more `window.*` coupling to ship this feature.

Suggested future modules:

- `context-card-state.js`
- `context-card-derive.js`
- `context-card-render.js`

These names are examples, not requirements.

## Implementation Plan

## Phase 1: Inventory Current Inputs

Tasks:

1. List current runtime fields used by the card.
2. List current chat-tab and message fields that can support derived context.
3. Confirm whether `ctx_pct` is present consistently enough across chat flows to support card rendering.

Exit Criteria:

- the derived data sources are documented

## Phase 2: Define Derived Context Model

Tasks:

1. Create a derived JS model for the context card.
2. Define mode-selection logic:
   - live-runtime
   - chat-derived
   - capacity-only
   - empty
3. Decide what aggregate chat number to surface:
   - busiest chat
   - average across chats
   - weighted active-chat signal

Recommendation:

- surface busiest-chat `ctx_pct` as the hero when runtime is unavailable
- use aggregate counts and secondary pills for the rest

## Phase 3: Redesign Card Markup

Tasks:

1. Replace the current dual-rail markup.
2. Add structure for the chosen option.
3. Keep IDs and render hooks coherent and explicit.

Important:

- do not grow the dashboard row height excessively
- preserve responsive behavior

## Phase 4: Build New Rendering Logic

Tasks:

1. Move context-card-specific rendering out of the current inlined `updateContextMetrics()` shape if practical.
2. Render states cleanly for all four modes.
3. Add premium animation classes based on severity and data mode.

## Phase 5: Manual And E2E Validation

Scenarios:

1. Local spawned session with live context available
2. Attached session with capacity but no live context
3. No chats, no live runtime context
4. One chat with low pressure
5. One chat near compaction threshold
6. Many chats with mixed pressure

## Open Product Questions

These do not block writing the feature branch, but they should be consciously answered during implementation:

1. Should the hero derived number represent:
   - active tab only
   - busiest tab
   - aggregate across tabs
2. Should chats with unknown `ctx_pct` still appear in the summary strip as `unknown`?
3. Should the card count only tabs with non-system messages, or all tabs?
4. Should auto-compact-enabled chats get a reassuring badge to signal they are self-managing?

Recommendation:

1. Hero = busiest tab when runtime unavailable
2. Unknown tabs can appear, but sorted last
3. Count only chats with actual conversational content
4. Yes, show an understated auto-compact badge

## Success Criteria

This work is successful if:

1. the context card is still valuable when runtime live context is unavailable
2. the card reflects the existence of multiple chat conversations
3. the card looks premium and intentional
4. the fallback state is honest and not confusing
5. the implementation does not deepen the existing `window.*` architecture debt

The target is a context card that feels like a modern product feature, not a degraded metric placeholder.
