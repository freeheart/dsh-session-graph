---
name: dsh-session-graph
description: Install, use, and troubleshoot the Session graph plugin that renders a DSH session trajectory as an interactive directed force graph (force and timeline layouts, tool-call DAG, kind filters, node inspector). Use when a user asks to visualize a session trajectory, install this plugin, repair its Graph view, or extend it.
---

# DSH Session graph

This skill bundle is also the plugin bundle: the directory containing this
`SKILL.md` is a DSH Web UI plugin package (`@local/session-graph`) that adds one
**Graph** entry to the Conversation view tabs. Installing this directory as a
profile bundle is enough; installing it as a skill only makes an agent able to
perform that installation on request.

## What the view renders

The Client module reads the loaded `SessionBinding.eventSource` event window and
folds durable session events into a directed graph:

| Node | Color token | Meaning |
|---|---|---|
| `user` | `--dsw-alias-brand-primary` | A user message |
| `assistant` | `--dsw-alias-state-success-primary` | One assistant step |
| `tool` | `--dsw-alias-state-warn-primary` (error: `state-error-primary`) | A tool call merged with its result |
| `compaction` | `--dsw-alias-label-secondary` | A context compaction |
| `retry` | `--dsw-alias-state-error-primary` | A model retry |

Edges: `assistant → tool` (call), `tool → next assistant` (result feeds the next
step), `previous turn → next turn` (dashed boundary), plus compaction/retry
links. Two layouts: **force** (default, Fruchterman-Reingold style 2D canvas) and
**timeline** (one lane per turn).

## Install the plugin

1. Resolve the absolute path of the directory that contains this `SKILL.md`
   (the plugin bundle root). It must contain `package.json`, `client.js`,
   `cordis.patch.yml`, `locale/`, and `icon.svg`.
2. Call the `plugin_manager` tool with `action: "install_bundle"` and
   `target: "<absolute path>"`. Expect `application: "applied"` and
   `warnings: []`. If the tool is unavailable, tell the user to install it
   through the GUI's Plugins settings and fall back to the manual steps in
   `INSTALL.md` shipped beside the package.
3. Verify without the GUI: call `cordis_inspect_query` with
   `platform: "client"`, `provider: "Slots"`, `method: "listSubTree"`,
   `input: { "root": "conversation.view" }`. The `selected.occupants` array must
   contain one entry with `id: "graph"`, `active: true`, and `order: 20`
   (after `chat` and `trajectory`).
4. Tell the user to refresh the page (or open a new session), then switch the
   conversation tab row to **Graph / 轨迹图**.

## How a user works with the view

- Toolbar: `Force` / `Timeline` layout, kind filters (user / assistant / tools /
  system), `Fit`, `Re-run`, zoom −/+ with a live percentage, and `Load older`
  while the event window is truncated.
- Canvas: drag a node to pin it, drag the background to pan, wheel to zoom,
  double-click the background to fit.
- Hover shows a canvas card; click opens the right-side details panel. A tool
  node exposes `Open tool inspector` when the host provides `inspectCall`
  (the shipped Trajectory view does).
- The graph is capped at 1600 display nodes and drops the oldest ones; the
  toolbar then shows the truncated-history badge.

## Troubleshooting

- **No Graph tab**: inspect `conversation.view` occupants. Missing `graph` means
  the Client module did not register — check that `package.json` name equals the
  `id` inside `client.js`'s `window.__ModuleLoader__.load({...})`, and that the
  bundle patch row points at the package name.
- **Tab appears but stays empty**: the session may be blank (`conversation.view`
  is not rendered for blank sessions), the event window may still be loading, or
  every kind filter is off. Ask the user to check the toolbar filters.
- **Changed source files do not show up**: installed profile bundles are stat-
  polled by `client-hmr` (~500 ms) and reload in place, so an edit to
  `client.js` applies without a restart. Replacing the *package* (rename or
  version change) is different — DSH then needs an app restart for a fresh
  JavaScript module generation.
- **Rename for public sharing**: change `package.json` `name` (e.g.
  `dsh-session-graph`), update the module `id` in `client.js` and the `name` in
  `cordis.patch.yml`, then reinstall; a restart is expected.

## Source map

| File | Role |
|---|---|
| `client.js` | Entire Client half: event fold, filters/edge contraction, layouts, simulation, canvas renderer, interactions, `conversation.view` registration |
| `index.js` | Empty Host half (the bundle row's activation) |
| `package.json` / `cordis.patch.yml` | Bundle manifest and Loader patch row |
| `locale/en.json`, `locale/zh.json` | Plugin Manager title/description |
| `icon.svg` | Original plugin artwork |
| `README.md` | User-facing documentation and verification status |
| `INSTALL.md` (in the share folder) | Manual install steps for someone who only received the archive |

## Attribution

Author: Jinzhu.Zhang <freeheart1977@139.com> · License: MIT.
