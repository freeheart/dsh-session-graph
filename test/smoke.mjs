// Headless smoke test for the session-graph Client module.
//
// Loads the wire Client module with a minimal fake `window.__ModuleLoader__`
// and a stub `react`, then exercises the exported pure internals against a real
// session event log plus the slot registration path.
//
// Usage: node smoke.mjs [path-to-client.js] [path-to-session-events.json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const clientPath = process.argv[2] ?? path.join(here, '..', 'client.js')
const eventsPath = process.argv[3] ?? path.join(here, 'sample-session.parsed.json')

/** A small but complete session-event sequence used when no log fixture exists. */
function syntheticEntries() {
  const events = [
    { type: 'turn/start', seq: 1, time: 1000, data: { turn: 1 } },
    { type: 'step/start', seq: 2, time: 1000, data: { turn: 1, step: 1 } },
    { type: 'user/message', seq: 3, time: 1000, data: { content: [{ type: 'text', text: 'build the thing' }] } },
    {
      type: 'assistant/message',
      seq: 4,
      time: 1010,
      data: {
        turn: 1,
        step: 1,
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'working' },
            { type: 'tool-call', id: 'call_a', name: 'grep', arguments: '{"pattern":"x"}' },
          ],
          source: { kind: 'model', provider: 'test', model: 'test-model' },
        },
        usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
      },
    },
    { type: 'tool/call', seq: 5, time: 1011, data: { turn: 1, step: 1, callId: 'call_a', name: 'grep', arguments: '{"pattern":"x"}' } },
    {
      type: 'tool/result',
      seq: 6,
      time: 1050,
      data: {
        turn: 1,
        step: 1,
        message: { role: 'tool', content: [{ type: 'text', text: 'found 3' }], toolCallId: 'call_a', isError: false },
      },
    },
    { type: 'step/end', seq: 7, time: 1060, data: { turn: 1, step: 1 } },
    { type: 'step/start', seq: 8, time: 1060, data: { turn: 1, step: 2 } },
    {
      type: 'assistant/message',
      seq: 9,
      time: 1070,
      data: { turn: 1, step: 2, message: { role: 'assistant', content: [{ type: 'text', text: 'done' }] } },
    },
    { type: 'step/end', seq: 10, time: 1080, data: { turn: 1, step: 2 } },
    { type: 'turn/end', seq: 11, time: 1090, data: { turn: 1, reason: { kind: 'completed' } } },
    { type: 'turn/start', seq: 12, time: 2000, data: { turn: 2 } },
    { type: 'user/message', seq: 13, time: 2000, data: { content: [{ type: 'text', text: 'follow up' }] } },
    { type: 'step/start', seq: 14, time: 2000, data: { turn: 2, step: 1 } },
    {
      type: 'assistant/message',
      seq: 15,
      time: 2010,
      data: {
        turn: 2,
        step: 1,
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'ok' },
            { type: 'tool-call', id: 'call_b', name: 'read', arguments: '{"path":"x.ts"}' },
          ],
        },
      },
    },
    { type: 'tool/call', seq: 16, time: 2011, data: { turn: 2, step: 1, callId: 'call_b', name: 'read', arguments: '{"path":"x.ts"}' } },
    {
      type: 'tool/result',
      seq: 17,
      time: 2030,
      data: {
        turn: 2,
        step: 1,
        message: { role: 'tool', content: [{ type: 'text', text: 'ENOENT' }], toolCallId: 'call_b', isError: true },
        error: { name: 'ToolError', code: 'ENOENT' },
      },
    },
    { type: 'turn/end', seq: 18, time: 2100, data: { turn: 2, reason: { kind: 'error', error: { message: 'failed', code: 'x' } } } },
  ]
  return events.map((event) => ({ type: 'event', event }))
}

let failures = 0
function check(condition, message) {
  if (condition) {
    console.log('  ok  ' + message)
  } else {
    failures += 1
    console.error('  FAIL ' + message)
  }
}

// ---------------------------------------------------------------------------
// 1. Load the module the way the web page's module loader does.
// ---------------------------------------------------------------------------
const modules = new Map()
globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      modules.set(definition.id, definition)
    },
  },
}
const reactStub = {
  createElement: () => null,
  memo: (component) => component,
  useRef: () => ({ current: null }),
  useState: (initial) => [initial, () => {}],
  useCallback: (callback) => callback,
  useMemo: (factory) => factory(),
  useEffect: () => {},
  useSyncExternalStore: () => null,
}
globalThis.require = (id) => {
  if (id === 'react') return reactStub
  throw new Error('unexpected require: ' + id)
}

const source = fs.readFileSync(clientPath, 'utf8')
const loader = globalThis.window.__ModuleLoader__
// eslint-disable-next-line no-new-func
const run = new Function('window', 'require', 'globalThis', source + '\n//# sourceURL=session-graph-client.js')
run(globalThis.window, globalThis.require, globalThis)

const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(clientPath), 'package.json'), 'utf8'))
console.log('module id: ' + [...modules.keys()].join(', '))
check(modules.has(pkg.name), 'module id equals package name (' + pkg.name + ')')
const definition = modules.get(pkg.name)
check(typeof definition === 'object' && typeof definition.factory === 'function', 'wire definition has a factory')
const mod = definition.factory(globalThis.require)
check(Array.isArray(mod.inject), 'module exports inject list')
check(mod.inject.includes('slots') && mod.inject.includes('sessions') && mod.inject.includes('locale'), 'inject lists slots/sessions/locale')
check(typeof mod.apply === 'function', 'module exports apply')
const internals = mod.__internals
check(internals !== undefined && typeof internals.buildModel === 'function', 'module exposes test internals')

// ---------------------------------------------------------------------------
// 2. Fold a real session log into a graph.
// ---------------------------------------------------------------------------
let rawEntries
if (fs.existsSync(eventsPath)) {
  const rawEvents = JSON.parse(fs.readFileSync(eventsPath, 'utf8'))
  rawEntries = rawEvents
    .filter((event) => event && typeof event.seq === 'number' && typeof event.type === 'string')
    .map((event) => ({ type: 'event', event }))
  console.log('\nsession entries (fixture ' + path.basename(eventsPath) + '): ' + rawEntries.length)
} else {
  rawEntries = syntheticEntries()
  console.log('\nsession entries (synthetic): ' + rawEntries.length)
}
const entries = rawEntries
const model = internals.buildModel(entries)
console.log('stats: ' + JSON.stringify(model.stats))
check(model.nodes.length > 0, 'builds at least one node')
check(model.stats.calls > 0, 'counts tool calls')
check(model.stats.turns >= 1, 'counts turns')
check(model.nodes.length === model.stats.nodes, 'stats.nodes matches node count')
check(
  model.nodes.filter((node) => node.kind === 'tool').length === model.stats.calls + (model.stats.orphanResults ?? 0),
  'every counted tool call has a node',
)

const kinds = new Set(model.nodes.map((node) => node.kind))
check(kinds.has('user') && kinds.has('assistant') && kinds.has('tool'), 'graph contains user, assistant and tool nodes')

let indexOk = true
for (const edge of model.edges) {
  if (edge.from < 0 || edge.from >= model.nodes.length || edge.to < 0 || edge.to >= model.nodes.length) indexOk = false
  if (edge.from === edge.to) indexOk = false
}
check(indexOk, 'every edge references two distinct valid node indexes')

const degenerate = model.edges.filter(
  (edge) => model.nodes[edge.from].kind === 'tool' && edge.kind === 'call',
)
check(degenerate.length === 0, 'tool calls are targets, not sources, of call edges')

const duplicatePairs = new Set()
let duplicates = 0
for (const edge of model.edges) {
  const key = edge.from + '>' + edge.to
  if (duplicatePairs.has(key)) duplicates += 1
  duplicatePairs.add(key)
}
check(duplicates === 0, 'no duplicate (from,to) edge pair (got ' + duplicates + ')')

const toolByCall = new Map()
for (const node of model.nodes) if (node.kind === 'tool' && node.callId) toolByCall.set(node.callId, node)
const resultEvents = entries.filter((entry) => entry.event.type === 'tool/result')
let resolved = 0
for (const entry of resultEvents) {
  const callId = entry.event.data?.message?.toolCallId
  if (callId && toolByCall.has(callId)) resolved += 1
}
check(resolved === resultEvents.length, 'every tool result merged into its tool call (' + resolved + '/' + resultEvents.length + ')')
const finishedTools = model.nodes.filter((node) => node.kind === 'tool' && node.status !== 'running')
check(finishedTools.length === resultEvents.length, 'tool statuses settled for every result (' + finishedTools.length + ')')
check(
  model.nodes.filter((node) => node.kind === 'tool' && node.status === 'error').length <= model.stats.errors,
  'error statuses do not exceed counted errors',
)
const withDuration = model.nodes.filter((node) => node.kind === 'tool' && typeof node.duration === 'number')
check(withDuration.length > 0, 'tool durations are measured (' + withDuration.length + ')')

const userNodes = model.nodes.filter((node) => node.kind === 'user')
check(
  userNodes.every((node) => typeof node.title === 'string' && node.title.length > 0),
  'user nodes carry a text title',
)
const assistantNodes = model.nodes.filter((node) => node.kind === 'assistant')
check(
  assistantNodes.some((node) => node.usage && typeof node.usage.totalTokens === 'number'),
  'assistant nodes carry token usage when recorded',
)
check(
  model.nodes.some((node) => node.kind === 'tool' && node.argsSummary !== ''),
  'tool nodes summarize their arguments',
)

// Insert a synthetic new turn to prove turn boundaries and compaction/retry.
const synthetic = entries.concat([
  { type: 'event', event: { type: 'turn/start', seq: 9001, time: 9001, data: { turn: 99 } } },
  { type: 'event', event: { type: 'user/message', seq: 9002, time: 9002, data: { content: [{ type: 'text', text: 'hello again' }] } } },
  { type: 'event', event: { type: 'llm/retry', seq: 9003, time: 9003, data: { error: { message: 'rate limited', code: '429' } } } },
  { type: 'event', event: { type: 'assistant/message', seq: 9004, time: 9004, data: { turn: 99, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: 'done' }] } } } },
  { type: 'event', event: { type: 'compaction/start', seq: 9005, time: 9005, data: {} } },
  { type: 'event', event: { type: 'compaction/end', seq: 9006, time: 9010, data: {} } },
])
const extended = internals.buildModel(synthetic)
check(extended.stats.turns === model.stats.turns + 1, 'a new turn increments the turn count')
check(extended.nodes.some((node) => node.kind === 'retry'), 'llm/retry becomes a retry node')
check(extended.nodes.some((node) => node.kind === 'compaction' && node.status === 'complete'), 'compaction start/end merge into one completed node')
const baseTurnEdges = model.edges.filter((edge) => edge.kind === 'turn').length
const turnEdges = extended.edges.filter((edge) => edge.kind === 'turn')
check(
  turnEdges.length === baseTurnEdges + 1,
  'the new turn adds exactly one turn boundary edge (' + baseTurnEdges + ' -> ' + turnEdges.length + ')',
)
const newTurnEdge = turnEdges[turnEdges.length - 1]
const newTurnFrom = extended.nodes[newTurnEdge.from]
const newTurnTo = extended.nodes[newTurnEdge.to]
check(newTurnFrom.turn !== newTurnTo.turn, 'the boundary edge crosses turn numbers (' + newTurnFrom.turn + ' -> ' + newTurnTo.turn + ')')
check(newTurnTo.kind === 'user' && newTurnTo.title === 'hello again', 'the boundary edge lands on the new user message')

// ---------------------------------------------------------------------------
// 3. Filters contract edges instead of orphaning nodes.
// ---------------------------------------------------------------------------
const onlyTools = internals.contractModel(extended, { user: false, assistant: false, tool: true, system: true })
check(onlyTools.nodes.every((node) => node.kind === 'tool' || node.kind === 'compaction' || node.kind === 'retry'), 'filters remove hidden node kinds')
check(onlyTools.nodes.length > 0, 'filtering to tools keeps nodes')
let contractOk = true
for (const edge of onlyTools.edges) {
  if (edge.from < 0 || edge.from >= onlyTools.nodes.length || edge.to < 0 || edge.to >= onlyTools.nodes.length) contractOk = false
}
check(contractOk, 'contracted edges stay inside the filtered node set')
const toolIds = new Set(onlyTools.nodes.map((node) => node.id))
check(onlyTools.nodes.every((node) => extended.nodes.some((original) => original.id === node.id)), 'filtered nodes are the original node objects')
const connected = new Set()
for (const edge of onlyTools.edges) {
  connected.add(edge.from)
  connected.add(edge.to)
}
check(connected.size > 0, 'filtered graph keeps causal links (' + onlyTools.edges.length + ' edges)')

const noneVisible = internals.contractModel(extended, { user: false, assistant: false, tool: false, system: false })
check(noneVisible.nodes.length === 0 && noneVisible.edges.length === 0, 'hiding every kind yields an empty graph')

// ---------------------------------------------------------------------------
// 4. Layout + simulation stay finite.
// ---------------------------------------------------------------------------
const timeline = internals.timelinePositions(onlyTools)
check(timeline.positions.length === onlyTools.nodes.length, 'timeline positions cover every node')
check(
  timeline.positions.every((position) => Number.isFinite(position.x) && Number.isFinite(position.y)),
  'timeline positions are finite',
)

const sim = internals.createSimState()
internals.prepareSim(sim, onlyTools, 'force', { w: 1200, h: 800, dpr: 1 })
check(sim.nodes.length === onlyTools.nodes.length, 'simulation holds every node')
check(
  sim.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)),
  'every node receives a finite starting position',
)
const startAlpha = sim.alpha
for (let tick = 0; tick < 160; tick += 1) internals.stepSimulation(sim)
check(sim.alpha < startAlpha, 'simulation cools down (alpha ' + startAlpha + ' -> ' + sim.alpha.toFixed(4) + ')')
check(
  sim.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)),
  'simulation keeps every position finite',
)
const view = { x: 0, y: 0, scale: 1, fitted: false }
internals.fitView(view, sim, { w: 1200, h: 800, dpr: 1 })
check(view.fitted === true && Number.isFinite(view.scale) && view.scale > 0, 'fit derives a positive scale (' + view.scale.toFixed(3) + ')')

const timelineSim = internals.createSimState()
internals.prepareSim(timelineSim, onlyTools, 'timeline', { w: 1200, h: 800, dpr: 1 })
check(timelineSim.nodes.every((node) => node.fixed), 'timeline layout pins every node')
check(timelineSim.lanes !== null && timelineSim.lanes.turns.length > 0, 'timeline lanes list the turns')

// ---------------------------------------------------------------------------
// 5. Registration path.
// ---------------------------------------------------------------------------
const registered = []
let localeRegistrations = 0
const loadOlderCalls = []
const fakeEventSource = { getSnapshot: () => ({ entries: [], hasMore: false, revision: 0 }), subscribe: () => () => {} }
const fakeBinding = {
  sessionId: 'session-1',
  eventSource: fakeEventSource,
  session: {
    loadOlder: async () => {
      loadOlderCalls.push(Date.now())
    },
  },
}
const fakeCtx = {
  effect: (callback) => {
    const disposer = callback()
    return () => {
      if (typeof disposer === 'function') disposer()
    }
  },
  locale: {
    register: () => {
      localeRegistrations += 1
      return () => {}
    },
    bind: () => (key) => 't:' + key,
  },
  slots: {
    inject: (key, callback) => {
      callback()
      return () => {}
    },
    register: (options, component) => {
      registered.push({ options, component })
      return () => {}
    },
  },
  sessions: {
    binding: (id) => (id === 'session-1' ? fakeBinding : undefined),
  },
}
mod.apply(fakeCtx)
check(localeRegistrations === 1, 'apply registers one locale namespace')
check(registered.length === 1, 'apply registers exactly one conversation view')
const registration = registered[0]
check(registration.options.name === 'conversation.view', 'view registers on conversation.view')
check(typeof registration.options.id === 'string' && registration.options.id.length > 0, 'view has an id (' + registration.options.id + ')')
check(typeof registration.options.label === 'function' && registration.options.label() === 't:view.graph', 'label thunk routes through the locale namespace')
check(registration.options.order > 0, 'view order positions it after the shipped views')
check(typeof registration.component === 'function', 'view registration supplies a component')
const injected = registration.options.inject('session-1')
check(injected.eventSource === fakeEventSource, 'inject exposes the session event source')
check(typeof injected.loadOlder === 'function', 'inject exposes loadOlder')
await injected.loadOlder()
check(loadOlderCalls.length === 1, 'loadOlder delegates to the session pager')
let threw = false
try {
  registration.options.inject('missing-session')
} catch (error) {
  threw = true
}
check(threw, 'inject rejects an unavailable session')

// ---------------------------------------------------------------------------
console.log('')
if (failures === 0) {
  console.log('SMOKE PASS')
  process.exit(0)
}
console.error('SMOKE FAIL: ' + failures + ' failing check(s)')
process.exit(1)
