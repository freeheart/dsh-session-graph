/**
 * Session graph · 会话轨迹图 — DSH Web UI Conversation view.
 *
 * Copyright (c) 2026 Jinzhu.Zhang <freeheart1977@139.com>
 * SPDX-License-Identifier: MIT
 */
window.__ModuleLoader__.load({
  id: '@local/session-graph',
  factory(require) {
    'use strict'

    const React = require('react')
    const h = React.createElement

    /** Locale namespace registered through the Client locale service. */
    const NS = 'session-graph'
    /** Slot entry id: one extra Conversation view beside `chat` and `trajectory`. */
    const VIEW_ID = 'graph'
    /** Display-node cap; older leading nodes are dropped once exceeded. */
    const MAX_MODEL_NODES = 1600
    const EMPTY_ENTRIES = []
    const TAU = Math.PI * 2
    const GOLDEN_ANGLE = 2.399963229728653

    const DICT = {
      zh: {
        'view.graph': '轨迹图',
        'title': '会话轨迹图',
        'layout.force': '力导向',
        'layout.timeline': '时间线',
        'fit': '适配',
        'rerun': '重排',
        'zoomIn': '放大',
        'zoomOut': '缩小',
        'filter.user': '用户',
        'filter.assistant': '助手',
        'filter.tool': '工具',
        'filter.system': '系统',
        'loadOlder': '加载更早',
        'loadingOlder': '加载中…',
        'historyTruncated': '仅显示已加载的历史',
        'empty': '暂无轨迹',
        'emptyHint': '发送消息后，会话轨迹会绘制成有向图。',
        'filteredEmpty': '当前筛选没有可显示的节点',
        'live': '进行中',
        'stats': '轮次 {turns} · 节点 {nodes} · 工具 {calls} · 失败 {errors}',
        'hint': '拖动节点可固定 · 拖动背景平移 · 滚轮缩放 · 双击适配',
        'legend.user': '用户',
        'legend.assistant': '助手',
        'legend.tool': '工具',
        'legend.error': '失败',
        'legend.system': '压缩/重试',
        'details.title': '节点详情',
        'details.close': '关闭详情',
        'details.turn': '轮次',
        'details.step': '步骤',
        'details.time': '时间',
        'details.status': '状态',
        'details.duration': '耗时',
        'details.model': '模型',
        'details.tokens': 'Tokens',
        'details.tool': '工具',
        'details.call': '调用',
        'details.args': '参数',
        'details.result': '结果',
        'details.content': '内容',
        'details.inspect': '打开工具检查器',
        'status.running': '运行中',
        'status.ok': '完成',
        'status.error': '失败',
        'status.complete': '完成',
        'kind.user': '用户消息',
        'kind.assistant': '助手消息',
        'kind.tool': '工具调用',
        'kind.compaction': '上下文压缩',
        'kind.retry': '模型重试',
        'unavailable': '无法读取该会话的事件流。',
        'a11y': '会话轨迹有向图：{nodes} 个节点，{edges} 条边，{turns} 个轮次。',
      },
      en: {
        'view.graph': 'Graph',
        'title': 'Session graph',
        'layout.force': 'Force',
        'layout.timeline': 'Timeline',
        'fit': 'Fit',
        'rerun': 'Re-run',
        'zoomIn': 'Zoom in',
        'zoomOut': 'Zoom out',
        'filter.user': 'User',
        'filter.assistant': 'Assistant',
        'filter.tool': 'Tools',
        'filter.system': 'System',
        'loadOlder': 'Load older',
        'loadingOlder': 'Loading…',
        'historyTruncated': 'Showing the loaded history only',
        'empty': 'No trajectory yet',
        'emptyHint': 'Send a message and the session trajectory is drawn as a directed graph.',
        'filteredEmpty': 'No nodes match the current filters',
        'live': 'Running',
        'stats': 'Turns {turns} · Nodes {nodes} · Tools {calls} · Errors {errors}',
        'hint': 'Drag a node to pin it · drag the background to pan · wheel to zoom · double-click to fit',
        'legend.user': 'User',
        'legend.assistant': 'Assistant',
        'legend.tool': 'Tool',
        'legend.error': 'Failed',
        'legend.system': 'Compaction/retry',
        'details.title': 'Node details',
        'details.close': 'Close details',
        'details.turn': 'Turn',
        'details.step': 'Step',
        'details.time': 'Time',
        'details.status': 'Status',
        'details.duration': 'Duration',
        'details.model': 'Model',
        'details.tokens': 'Tokens',
        'details.tool': 'Tool',
        'details.call': 'Call',
        'details.args': 'Arguments',
        'details.result': 'Result',
        'details.content': 'Content',
        'details.inspect': 'Open tool inspector',
        'status.running': 'Running',
        'status.ok': 'Done',
        'status.error': 'Failed',
        'status.complete': 'Done',
        'kind.user': 'User message',
        'kind.assistant': 'Assistant message',
        'kind.tool': 'Tool call',
        'kind.compaction': 'Compaction',
        'kind.retry': 'Model retry',
        'unavailable': 'The session event stream is unavailable.',
        'a11y': 'Session trajectory directed graph: {nodes} nodes, {edges} edges, {turns} turns.',
      },
    }

    // ---------------------------------------------------------------------
    // Tokens and small formatting helpers
    // ---------------------------------------------------------------------

    const TOKEN_NAMES = [
      'bg-base',
      'bg-layer-1',
      'bg-layer-2',
      'bg-overlay',
      'border-l1',
      'border-l2',
      'brand-primary',
      'label-primary',
      'label-secondary',
      'state-error-primary',
      'state-idle-primary',
      'state-success-primary',
      'state-warn-primary',
    ]

    const FALLBACK_TOKENS = {
      '--dsw-alias-bg-base': '#ffffff',
      '--dsw-alias-bg-layer-1': '#ffffff',
      '--dsw-alias-bg-layer-2': '#f4f5f7',
      '--dsw-alias-bg-overlay': '#ffffff',
      '--dsw-alias-border-l1': '#e3e4e8',
      '--dsw-alias-border-l2': '#cfd1d7',
      '--dsw-alias-brand-primary': '#247bbf',
      '--dsw-alias-label-primary': '#1b1d21',
      '--dsw-alias-label-secondary': '#6b7078',
      '--dsw-alias-state-error-primary': '#d2453f',
      '--dsw-alias-state-idle-primary': '#9aa0a8',
      '--dsw-alias-state-success-primary': '#2f9e6b',
      '--dsw-alias-state-warn-primary': '#c8861b',
    }

    /**
     * Read the host theme tokens from one element's computed style.
     * @param element - element inheriting the host theme variables.
     * @returns current token values, with neutral fallbacks for absent tokens.
     */
    function readTokens(element) {
      const out = {}
      let style = null
      try {
        style = element ? window.getComputedStyle(element) : null
      } catch (error) {
        style = null
      }
      for (const name of TOKEN_NAMES) {
        const cssName = '--dsw-alias-' + name
        let value = ''
        if (style && typeof style.getPropertyValue === 'function') value = style.getPropertyValue(cssName).trim()
        out[cssName] = value || FALLBACK_TOKENS[cssName]
      }
      return out
    }

    /** Collapse whitespace and cut one string to a maximum length. */
    function clipText(value, max) {
      const text = String(value === null || value === undefined ? '' : value).replace(/\s+/g, ' ').trim()
      if (text.length <= max) return text
      return text.slice(0, Math.max(1, max - 1)) + '…'
    }

    /** Extract the visible text of one content-block list. */
    function textFromContent(content) {
      if (!Array.isArray(content)) return ''
      const parts = []
      for (const block of content) {
        if (!block || typeof block !== 'object') continue
        if (block.type === 'text' && typeof block.text === 'string' && block.text !== '') parts.push(block.text)
      }
      return parts.join('\n').trim()
    }

    /** Whether an assistant content list carries a non-empty reasoning block. */
    function hasReasoning(content) {
      if (!Array.isArray(content)) return false
      for (const block of content) {
        if (block && block.type === 'reasoning' && typeof block.text === 'string' && block.text.trim() !== '') return true
      }
      return false
    }

    const ARG_KEYS = ['description', 'command', 'path', 'file_path', 'pattern', 'query', 'name', 'url', 'id', 'model', 'provider']

    /** One-line summary of a tool-call argument JSON string. */
    function summarizeArgs(raw) {
      if (typeof raw !== 'string' || raw.trim() === '') return ''
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch (error) {
        return clipText(raw, 120)
      }
      if (parsed === null || typeof parsed !== 'object') return clipText(String(parsed), 120)
      if (Array.isArray(parsed)) return clipText(parsed.slice(0, 4).map((item) => String(item)).join(', '), 120)
      const bits = []
      for (const key of ARG_KEYS) {
        const value = parsed[key]
        if (typeof value === 'string' && value.trim() !== '') bits.push(value.trim())
        else if (typeof value === 'number') bits.push(String(value))
        if (bits.length >= 2) break
      }
      if (bits.length === 0) {
        const keys = Object.keys(parsed).slice(0, 4)
        bits.push(keys.map((key) => key + ': ' + clipText(stringifyShort(parsed[key]), 32)).join(', '))
      }
      return clipText(bits.join(' · '), 120)
    }

    /** JSON-ish short rendering for an arbitrary nested value. */
    function stringifyShort(value) {
      if (value === null || value === undefined) return ''
      if (typeof value === 'string') return value
      if (typeof value === 'number' || typeof value === 'boolean') return String(value)
      try {
        return JSON.stringify(value)
      } catch (error) {
        return String(value)
      }
    }

    /** Human duration for one millisecond span. */
    function formatDuration(ms) {
      if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return ''
      if (ms < 950) return Math.max(1, Math.round(ms)) + ' ms'
      if (ms < 60000) return (ms / 1000).toFixed(ms < 10000 ? 2 : 1) + ' s'
      const minutes = Math.floor(ms / 60000)
      const seconds = Math.round((ms % 60000) / 1000)
      return minutes + 'm ' + seconds + 's'
    }

    /** Local clock string for one epoch-millisecond timestamp. */
    function formatClock(time) {
      if (typeof time !== 'number' || !Number.isFinite(time)) return ''
      try {
        const date = new Date(time)
        const pad = (value) => (value < 10 ? '0' + value : String(value))
        return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
      } catch (error) {
        return ''
      }
    }

    // ---------------------------------------------------------------------
    // Graph model: fold the session event window into nodes and directed edges
    // ---------------------------------------------------------------------

    const EDGE_PRIORITY = { flow: 0, feed: 1, call: 2, retry: 3, turn: 4 }
    const EDGE_WEIGHT = { flow: 1, feed: 1.15, call: 1.2, retry: 1, turn: 0.3 }

    /**
     * Fold the durable Session events of one loaded window into a graph.
     *
     * Node kinds: `user`, `assistant`, `tool` (a tool call merged with its
     * result), `compaction`, `retry`.
     *
     * Edge kinds: `call` (assistant step -> tool call it issued), `feed`
     * (tool result -> next assistant step), `flow` (sequential fallback),
     * `turn` (previous turn -> next turn), `retry`.
     *
     * @param entries - `SessionEventLikeEntry[]` from the Session event window.
     * @returns `{ nodes, edges, stats, truncated }`.
     */
    function buildModel(entries) {
      const nodes = []
      const edges = []
      const stats = { turns: 0, nodes: 0, calls: 0, errors: 0, events: 0, unknown: 0 }
      const turnSet = new Set()
      const byCallId = new Map()
      let currentTurn = 0
      let currentStep = 0
      let lastFlow = null
      let lastAssistant = null
      let lastTools = []
      let pendingTurnLink = null
      let compactionOpen = null

      const addNode = (node) => {
        node.index = nodes.length
        nodes.push(node)
        stats.nodes = nodes.length
        return node
      }
      const link = (from, to, kind) => {
        if (!from || !to || from === to) return
        if (from.index === to.index) return
        edges.push({ from: from.index, to: to.index, kind: kind || 'flow' })
      }
      const enterTurn = (turn) => {
        currentTurn = turn
        currentStep = 0
        currentTurnStepDone = false
        lastAssistant = null
        lastTools = []
        pendingTurnLink = lastFlow
        compactionOpen = null
        if (!turnSet.has(turn)) {
          turnSet.add(turn)
          stats.turns = turnSet.size
        }
      }
      let currentTurnStepDone = false
      const firstOfTurn = (node) => {
        if (currentTurnStepDone) return false
        currentTurnStepDone = true
        if (pendingTurnLink && pendingTurnLink.turn !== node.turn) {
          link(pendingTurnLink, node, 'turn')
        }
        pendingTurnLink = null
        return true
      }

      for (const entry of entries) {
        if (!entry || entry.type !== 'event') continue
        const event = entry.event
        if (!event || typeof event.type !== 'string') continue
        const data = event.data && typeof event.data === 'object' ? event.data : {}
        stats.events += 1

        switch (event.type) {
          case 'turn/start': {
            const turn = Number(data.turn)
            enterTurn(Number.isFinite(turn) ? turn : currentTurn + 1)
            break
          }
          case 'step/start': {
            const step = Number(data.step)
            if (Number.isFinite(step)) currentStep = step
            break
          }
          case 'user/message': {
            const text = textFromContent(data.content)
            const node = addNode({
              id: 'u:' + event.seq,
              kind: 'user',
              turn: currentTurn,
              step: currentStep,
              seq: event.seq,
              time: event.time,
              title: text ? clipText(text, 160) : 'User message',
              label: 'User',
              preview: text,
            })
            const startedTurn = firstOfTurn(node)
            if (!startedTurn) link(lastFlow, node, 'flow')
            lastFlow = node
            lastAssistant = null
            break
          }
          case 'assistant/message': {
            const message = data.message && typeof data.message === 'object' ? data.message : {}
            const text = textFromContent(message.content)
            const turn = Number(data.turn)
            const step = Number(data.step)
            const node = addNode({
              id: 'a:' + event.seq,
              kind: 'assistant',
              turn: Number.isFinite(turn) ? turn : currentTurn,
              step: Number.isFinite(step) ? step : currentStep,
              seq: event.seq,
              time: event.time,
              title: text ? clipText(text, 160) : 'Assistant step (tool calls only)',
              label: 'A' + (Number.isFinite(step) ? step : ''),
              preview: text,
              usage: data.usage && typeof data.usage === 'object' ? data.usage : null,
              model: message.source && typeof message.source.model === 'string' ? message.source.model : '',
              reasoning: hasReasoning(message.content),
              interrupted: data.interrupted === true,
            })
            const startedTurn = firstOfTurn(node)
            if (lastTools.length > 0) {
              for (const toolNode of lastTools) link(toolNode, node, 'feed')
            } else if (!startedTurn) {
              link(lastFlow, node, 'flow')
            }
            lastAssistant = node
            lastTools = []
            lastFlow = node
            break
          }
          case 'tool/call': {
            const name = typeof data.name === 'string' && data.name !== '' ? data.name : 'tool'
            const callId = typeof data.callId === 'string' ? data.callId : ''
            const node = addNode({
              id: 't:' + (callId || event.seq),
              kind: 'tool',
              turn: Number.isFinite(Number(data.turn)) ? Number(data.turn) : currentTurn,
              step: Number.isFinite(Number(data.step)) ? Number(data.step) : currentStep,
              seq: event.seq,
              time: event.time,
              name: name,
              label: clipText(name, 20),
              callId: callId,
              argsSummary: summarizeArgs(data.arguments),
              status: 'running',
              duration: null,
              resultPreview: '',
              preview: typeof data.arguments === 'string' ? clipText(data.arguments, 4000) : '',
            })
            const startedTurn = firstOfTurn(node)
            if (callId !== '') byCallId.set(callId, node)
            if (lastAssistant && lastAssistant.turn === node.turn) link(lastAssistant, node, 'call')
            else if (!startedTurn) link(lastFlow, node, 'flow')
            stats.calls += 1
            lastFlow = node
            break
          }
          case 'tool/result': {
            const message = data.message && typeof data.message === 'object' ? data.message : {}
            const callId =
              typeof message.toolCallId === 'string'
                ? message.toolCallId
                : message.source && typeof message.source.callId === 'string'
                  ? message.source.callId
                  : ''
            const target = callId === '' ? undefined : byCallId.get(callId)
            const text = textFromContent(message.content)
            const failed = message.isError === true || data.error !== undefined
            if (target !== undefined) {
              target.status = failed ? 'error' : 'ok'
              target.resultPreview = clipText(text, 4000)
              target.duration = typeof event.time === 'number' && typeof target.time === 'number' ? event.time - target.time : null
              if (failed) {
                target.error = data.error && typeof data.error === 'object' ? data.error.name || data.error.code || '' : ''
                stats.errors += 1
              }
              if (lastTools.indexOf(target) === -1) lastTools.push(target)
            } else {
              const node = addNode({
                id: 'r:' + event.seq,
                kind: 'tool',
                turn: currentTurn,
                step: currentStep,
                seq: event.seq,
                time: event.time,
                name: 'tool result',
                label: 'result',
                callId: callId,
                argsSummary: '',
                status: failed ? 'error' : 'ok',
                duration: null,
                resultPreview: clipText(text, 4000),
                preview: '',
                orphan: true,
              })
              link(lastFlow, node, 'flow')
              if (lastTools.indexOf(node) === -1) lastTools.push(node)
              if (failed) stats.errors += 1
              lastFlow = node
            }
            break
          }
          case 'compaction/start': {
            const node = addNode({
              id: 'c:' + event.seq,
              kind: 'compaction',
              turn: currentTurn,
              step: currentStep,
              seq: event.seq,
              time: event.time,
              title: 'Compaction',
              label: 'Compact',
              preview: '',
              status: 'running',
              duration: null,
            })
            link(lastFlow, node, 'flow')
            lastFlow = node
            compactionOpen = node
            break
          }
          case 'compaction/summary': {
            if (compactionOpen !== null) {
              compactionOpen.preview = textFromContent(data.summary ? data.summary.content : []) || ''
            }
            break
          }
          case 'compaction/end': {
            if (compactionOpen !== null) {
              compactionOpen.status = data.error === undefined ? 'complete' : 'error'
              compactionOpen.duration =
                typeof event.time === 'number' && typeof compactionOpen.time === 'number'
                  ? event.time - compactionOpen.time
                  : null
              if (data.error !== undefined) stats.errors += 1
              lastFlow = compactionOpen
              compactionOpen = null
            }
            break
          }
          case 'llm/retry': {
            const node = addNode({
              id: 'm:' + event.seq,
              kind: 'retry',
              turn: currentTurn,
              step: currentStep,
              seq: event.seq,
              time: event.time,
              title: 'Model retry',
              label: 'Retry',
              preview: data.error && typeof data.error === 'object' ? clipText(data.error.message || data.error.code || '', 400) : '',
              status: 'retry',
              duration: null,
            })
            link(lastFlow, node, 'retry')
            lastFlow = node
            break
          }
          default: {
            stats.unknown += 1
          }
        }
      }

      const trimmed = trimModel(nodes, edges)
      stats.nodes = trimmed.nodes.length
      return { nodes: trimmed.nodes, edges: trimmed.edges, stats: stats, truncated: trimmed.truncated }
    }

    /** Keep only the newest display nodes of an oversized graph. */
    function trimModel(nodes, edges) {
      if (nodes.length <= MAX_MODEL_NODES) return { nodes: nodes, edges: edges, truncated: false }
      const keepFrom = nodes.length - MAX_MODEL_NODES
      const kept = nodes.slice(keepFrom)
      const remap = new Map()
      for (let i = 0; i < kept.length; i += 1) {
        remap.set(kept[i].index, i)
        kept[i].index = i
      }
      const keptEdges = []
      for (const edge of edges) {
        const from = remap.get(edge.from)
        const to = remap.get(edge.to)
        if (from === undefined || to === undefined || from === to) continue
        keptEdges.push({ from: from, to: to, kind: edge.kind })
      }
      return { nodes: kept, edges: keptEdges, truncated: true }
    }

    // ---------------------------------------------------------------------
    // Filters: hide node kinds and contract edges through hidden nodes
    // ---------------------------------------------------------------------

    const DEFAULT_FILTERS = { user: true, assistant: true, tool: true, system: true }

    /** Whether one node survives the active kind filters. */
    function nodeVisible(node, filters) {
      switch (node.kind) {
        case 'user':
          return filters.user !== false
        case 'assistant':
          return filters.assistant !== false
        case 'tool':
          return filters.tool !== false
        case 'compaction':
        case 'retry':
          return filters.system !== false
        default:
          return true
      }
    }

    /**
     * Apply kind filters, rewiring edges so the remaining DAG stays connected:
     * an edge whose endpoint was hidden is contracted to the nearest visible
     * ancestor / descendant.
     * @param model - full graph model.
     * @param filters - kind visibility flags.
     * @returns a graph whose `from`/`to` index into `nodes`.
     */
    function contractModel(model, filters) {
      const nodes = []
      const remap = new Map()
      for (const node of model.nodes) {
        if (!nodeVisible(node, filters)) continue
        remap.set(node.index, nodes.length)
        nodes.push(node)
      }
      if (nodes.length === 0) return { nodes: nodes, edges: [] }
      const outBy = new Map()
      const inBy = new Map()
      for (const edge of model.edges) {
        if (!outBy.has(edge.from)) outBy.set(edge.from, [])
        outBy.get(edge.from).push(edge)
        if (!inBy.has(edge.to)) inBy.set(edge.to, [])
        inBy.get(edge.to).push(edge)
      }
      const ancestor = (index, seen) => {
        const direct = remap.get(index)
        if (direct !== undefined) return direct
        const list = inBy.get(index)
        if (list === undefined) return -1
        for (const edge of list) {
          if (seen.has(edge.from)) continue
          seen.add(edge.from)
          const resolved = ancestor(edge.from, seen)
          if (resolved >= 0) return resolved
        }
        return -1
      }
      const descendant = (index, seen) => {
        const direct = remap.get(index)
        if (direct !== undefined) return direct
        const list = outBy.get(index)
        if (list === undefined) return -1
        for (const edge of list) {
          if (seen.has(edge.to)) continue
          seen.add(edge.to)
          const resolved = descendant(edge.to, seen)
          if (resolved >= 0) return resolved
        }
        return -1
      }
      const edges = []
      const byKey = new Map()
      for (const edge of model.edges) {
        const from = ancestor(edge.from, new Set([edge.from]))
        const to = descendant(edge.to, new Set([edge.to]))
        if (from < 0 || to < 0 || from === to) continue
        const key = from + '>' + to
        const previous = byKey.get(key)
        if (previous === undefined) {
          const kept = { from: from, to: to, kind: edge.kind }
          byKey.set(key, kept)
          edges.push(kept)
        } else if ((EDGE_PRIORITY[edge.kind] || 0) > (EDGE_PRIORITY[previous.kind] || 0)) {
          previous.kind = edge.kind
        }
      }
      return { nodes: nodes, edges: edges }
    }

    // ---------------------------------------------------------------------
    // Layout: deterministic timeline positions, canvas radii, colors
    // ---------------------------------------------------------------------

    /** Lane positions for the timeline layout (one lane per turn). */
    function timelinePositions(model) {
      const ranks = new Map()
      const turns = []
      for (const node of model.nodes) {
        if (!ranks.has(node.turn)) {
          ranks.set(node.turn, turns.length)
          turns.push(node.turn)
        }
      }
      const stepX = 58
      const laneH = 104
      const padX = 150
      const padY = 84
      const positions = model.nodes.map((node, index) => ({
        x: padX + index * stepX,
        y: padY + (ranks.get(node.turn) || 0) * laneH,
      }))
      return { positions: positions, turns: turns, laneH: laneH, stepX: stepX, padX: padX, padY: padY }
    }

    /** Canvas radius per node kind. */
    function nodeRadius(node) {
      switch (node.kind) {
        case 'user':
          return 9
        case 'assistant':
          return 7.5
        case 'tool':
          return node.status === 'error' ? 7 : 5.5
        case 'compaction':
          return 6.5
        case 'retry':
          return 6.5
        default:
          return 6
      }
    }

    /** Canvas fill per node kind, from host theme tokens. */
    function nodeColor(node, tokens) {
      if (node.kind === 'tool' && node.status === 'error') return tokens['--dsw-alias-state-error-primary']
      switch (node.kind) {
        case 'user':
          return tokens['--dsw-alias-brand-primary']
        case 'assistant':
          return tokens['--dsw-alias-state-success-primary']
        case 'tool':
          return tokens['--dsw-alias-state-warn-primary']
        case 'compaction':
          return tokens['--dsw-alias-label-secondary']
        case 'retry':
          return tokens['--dsw-alias-state-error-primary']
        default:
          return tokens['--dsw-alias-state-idle-primary']
      }
    }

    /** Canvas stroke per edge kind. */
    function edgeColor(kind, tokens) {
      switch (kind) {
        case 'call':
          return tokens['--dsw-alias-state-warn-primary']
        case 'turn':
          return tokens['--dsw-alias-brand-primary']
        case 'retry':
          return tokens['--dsw-alias-state-error-primary']
        default:
          return tokens['--dsw-alias-border-l2']
      }
    }

    // ---------------------------------------------------------------------
    // Force simulation
    // ---------------------------------------------------------------------

    /** Build the simulation state for one model, carrying over old positions. */
    function prepareSim(sim, model, layout, size) {
      const previous = new Map()
      for (const node of sim.nodes) previous.set(node.id, node)
      const layoutChanged = sim.layout !== layout
      sim.layout = layout
      const nodes = model.nodes.map((node, index) => {
        const old = previous.get(node.id)
        return {
          id: node.id,
          index: index,
          ref: node,
          x: old ? old.x : NaN,
          y: old ? old.y : NaN,
          vx: 0,
          vy: 0,
          fixed: old ? Boolean(old.fixed) && !layoutChanged : false,
          fresh: old === undefined,
        }
      })
      const indexById = new Map()
      nodes.forEach((node, index) => indexById.set(node.id, index))
      const edges = []
      for (const edge of model.edges) {
        const fromNode = model.nodes[edge.from]
        const toNode = model.nodes[edge.to]
        if (!fromNode || !toNode) continue
        const si = indexById.get(fromNode.id)
        const ti = indexById.get(toNode.id)
        if (si === undefined || ti === undefined || si === ti) continue
        edges.push({ si: si, ti: ti, kind: edge.kind, weight: EDGE_WEIGHT[edge.kind] || 1 })
      }
      sim.nodes = nodes
      sim.edges = edges
      sim.lanes = null
      sim.worldW = Math.max(640, size.w || 0)
      sim.worldH = Math.max(420, size.h || 0)

      if (layout === 'timeline') {
        const placed = timelinePositions(model)
        for (let i = 0; i < nodes.length; i += 1) {
          const position = placed.positions[i]
          nodes[i].x = position.x
          nodes[i].y = position.y
          nodes[i].fixed = true
        }
        sim.lanes = placed
        sim.alpha = 0
        sim.dirty = true
        return
      }

      const hadFresh = nodes.some((node) => node.fresh)
      const wasEmpty = previous.size === 0
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i]
        if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
          node.fresh = false
          continue
        }
        let anchor = null
        for (const edge of edges) {
          if (edge.si === i) {
            const other = nodes[edge.ti]
            if (other && Number.isFinite(other.x) && Number.isFinite(other.y)) {
              anchor = other
              break
            }
          }
          if (edge.ti === i) {
            const other = nodes[edge.si]
            if (other && Number.isFinite(other.x) && Number.isFinite(other.y)) {
              anchor = other
              break
            }
          }
        }
        const angle = i * GOLDEN_ANGLE
        const radius = 26 + 30 * Math.sqrt((i % 13) + 1)
        if (anchor !== null) {
          node.x = anchor.x + Math.cos(angle) * radius
          node.y = anchor.y + Math.sin(angle) * radius
        } else {
          const spread = Math.min(sim.worldW, sim.worldH) * 0.3
          const fraction = Math.sqrt((i + 1) / Math.max(1, nodes.length))
          node.x = sim.worldW / 2 + Math.cos(angle) * spread * fraction
          node.y = sim.worldH / 2 + Math.sin(angle) * spread * fraction
        }
        node.fresh = false
      }
      sim.alpha = Math.max(sim.alpha, wasEmpty ? 0.95 : hadFresh ? 0.55 : 0.3)
      sim.dirty = true
    }

    /** Integrate one force-simulation tick. */
    function stepSimulation(sim) {
      const nodes = sim.nodes
      const edges = sim.edges
      const count = nodes.length
      if (count === 0) {
        sim.alpha = 0
        return
      }
      const alpha = sim.alpha
      const area = Math.max(360000, sim.worldW * sim.worldH)
      const spacing = Math.max(62, Math.min(150, Math.sqrt(area / count) * 0.85))
      const repulsion = spacing * spacing * 0.1

      if (count <= 260) {
        for (let i = 0; i < count; i += 1) {
          const a = nodes[i]
          for (let j = i + 1; j < count; j += 1) {
            const b = nodes[j]
            let dx = b.x - a.x
            let dy = b.y - a.y
            let distanceSq = dx * dx + dy * dy
            if (distanceSq < 0.01) {
              dx = i % 2 === 0 ? 0.6 : -0.6
              dy = j % 2 === 0 ? 0.6 : -0.6
              distanceSq = 0.72
            }
            const distance = Math.sqrt(distanceSq)
            const force = Math.min(repulsion / Math.max(distance, spacing * 0.35), repulsion * 2.2)
            const fx = (dx / distance) * force
            const fy = (dy / distance) * force
            a.vx -= fx
            a.vy -= fy
            b.vx += fx
            b.vy += fy
          }
        }
      } else {
        const cell = Math.max(56, spacing * 1.5)
        const grid = new Map()
        for (let i = 0; i < count; i += 1) {
          const node = nodes[i]
          const key = Math.floor(node.x / cell) + ':' + Math.floor(node.y / cell)
          let bucket = grid.get(key)
          if (bucket === undefined) {
            bucket = []
            grid.set(key, bucket)
          }
          bucket.push(i)
        }
        for (let i = 0; i < count; i += 1) {
          const a = nodes[i]
          const gx = Math.floor(a.x / cell)
          const gy = Math.floor(a.y / cell)
          for (let ox = -1; ox <= 1; ox += 1) {
            for (let oy = -1; oy <= 1; oy += 1) {
              const bucket = grid.get(gx + ox + ':' + (gy + oy))
              if (bucket === undefined) continue
              for (const j of bucket) {
                if (j <= i) continue
                const b = nodes[j]
                let dx = b.x - a.x
                let dy = b.y - a.y
                let distanceSq = dx * dx + dy * dy
                if (distanceSq < 0.01) {
                  dx = 0.6
                  dy = -0.6
                  distanceSq = 0.72
                }
                const distance = Math.sqrt(distanceSq)
                const force = Math.min(repulsion / Math.max(distance, spacing * 0.35), repulsion * 2.2)
                const fx = (dx / distance) * force
                const fy = (dy / distance) * force
                a.vx -= fx
                a.vy -= fy
                b.vx += fx
                b.vy += fy
              }
            }
          }
        }
      }

      for (const edge of edges) {
        const a = nodes[edge.si]
        const b = nodes[edge.ti]
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.max(0.01, Math.sqrt(dx * dx + dy * dy))
        const force = (distance - spacing * 0.95) * 0.12 * edge.weight
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }

      const centerX = sim.worldW / 2
      const centerY = sim.worldH / 2
      for (const node of nodes) {
        if (node.fixed) {
          node.vx = 0
          node.vy = 0
          continue
        }
        node.vx += (centerX - node.x) * 0.0016
        node.vy += (centerY - node.y) * 0.0016
        node.vx *= 0.6
        node.vy *= 0.6
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
        if (speed > 42) {
          node.vx = (node.vx / speed) * 42
          node.vy = (node.vy / speed) * 42
        }
        node.x += node.vx * alpha
        node.y += node.vy * alpha
      }
      sim.alpha = alpha * 0.984
      if (sim.alpha < 0.02) sim.alpha = 0
      sim.dirty = true
    }

    // ---------------------------------------------------------------------
    // Canvas drawing
    // ---------------------------------------------------------------------

    function screenToWorld(view, sx, sy) {
      return { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale }
    }

    /** Nearest node to one world-space point, or null. */
    function hitTest(sim, wx, wy, scale) {
      const tolerance = 7 / Math.max(scale, 0.05)
      let hit = null
      let best = Infinity
      for (const node of sim.nodes) {
        const radius = nodeRadius(node.ref) + tolerance
        const dx = node.x - wx
        const dy = node.y - wy
        const distanceSq = dx * dx + dy * dy
        if (distanceSq <= radius * radius && distanceSq < best) {
          best = distanceSq
          hit = node
        }
      }
      return hit
    }

    /** Fit the world into the stage, centered, with padding. */
    function fitView(view, sim, size) {
      const nodes = sim.nodes
      if (nodes.length === 0 || size.w <= 0 || size.h <= 0) {
        view.scale = 1
        return
      }
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const node of nodes) {
        const radius = nodeRadius(node.ref) + 14
        if (node.x - radius < minX) minX = node.x - radius
        if (node.y - radius < minY) minY = node.y - radius
        if (node.x + radius > maxX) maxX = node.x + radius
        if (node.y + radius > maxY) maxY = node.y + radius
      }
      const width = Math.max(1, maxX - minX)
      const height = Math.max(1, maxY - minY)
      const padding = 46
      const scale = Math.max(
        0.02,
        Math.min(3, Math.min((size.w - padding * 2) / width, (size.h - padding * 2) / height, 1.5)),
      )
      view.scale = scale
      view.x = size.w / 2 - ((minX + maxX) / 2) * scale
      view.y = size.h / 2 - ((minY + maxY) / 2) * scale
      view.fitted = true
    }

    /** Faint adaptive dot grid, so panning and zooming read as movement. */
    function drawGrid(context, view, size, tokens) {
      let spacing = 48
      while (spacing * view.scale < 26) spacing *= 2
      while (spacing * view.scale > 120) spacing /= 2
      const left = -view.x / view.scale
      const top = -view.y / view.scale
      const right = (size.w - view.x) / view.scale
      const bottom = (size.h - view.y) / view.scale
      const startX = Math.floor(left / spacing) * spacing
      const startY = Math.floor(top / spacing) * spacing
      const radius = Math.max(0.8, Math.min(1.6, 1.1 / view.scale))
      context.fillStyle = tokens['--dsw-alias-border-l1']
      context.globalAlpha = 0.55
      context.beginPath()
      let columns = 0
      for (let x = startX; x <= right; x += spacing) {
        columns += 1
        if (columns > 400) break
        for (let y = startY; y <= bottom; y += spacing) {
          context.moveTo(x + radius, y)
          context.arc(x, y, radius, 0, TAU)
        }
      }
      context.fill()
      context.globalAlpha = 1
    }

    /** Horizontal turn lanes for the timeline layout. */
    function drawLanes(context, sim, view, size, tokens) {
      const lanes = sim.lanes
      if (!lanes) return
      const worldLeft = -view.x / view.scale
      const worldRight = (size.w - view.x) / view.scale
      const width = Math.max(1, worldRight - worldLeft)
      context.font = '11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
      context.textAlign = 'left'
      context.textBaseline = 'top'
      for (let rank = 0; rank < lanes.turns.length; rank += 1) {
        const top = lanes.padY + rank * lanes.laneH - 38
        if (rank % 2 === 0) {
          context.fillStyle = tokens['--dsw-alias-bg-layer-2']
          context.globalAlpha = 0.55
          context.fillRect(worldLeft, top, width, lanes.laneH)
          context.globalAlpha = 1
        }
        context.fillStyle = tokens['--dsw-alias-label-secondary']
        context.fillText('#' + lanes.turns[rank], worldLeft + 10 / view.scale, top + 8 / view.scale)
      }
    }

    /** One directed edge with a mid-arrow head. */
    function drawEdge(context, from, to, edge, tokens, alpha) {
      const dx = to.x - from.x
      const dy = to.y - from.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const startRadius = nodeRadius(from.ref) + 2
      const endRadius = nodeRadius(to.ref) + 3
      if (distance <= startRadius + endRadius + 2) return
      const ux = dx / distance
      const uy = dy / distance
      const x1 = from.x + ux * startRadius
      const y1 = from.y + uy * startRadius
      const x2 = to.x - ux * endRadius
      const y2 = to.y - uy * endRadius
      context.save()
      context.globalAlpha = alpha
      context.strokeStyle = edgeColor(edge.kind, tokens)
      context.fillStyle = context.strokeStyle
      context.lineWidth = edge.kind === 'turn' || edge.kind === 'call' ? 1.5 : 1
      if (edge.kind === 'turn') context.setLineDash([5, 5])
      context.beginPath()
      context.moveTo(x1, y1)
      context.lineTo(x2, y2)
      context.stroke()
      context.setLineDash([])
      const spanX = x2 - x1
      const spanY = y2 - y1
      const headX = x1 + spanX * 0.56
      const headY = y1 + spanY * 0.56
      const size = edge.kind === 'turn' ? 4.5 : 5.5
      context.beginPath()
      context.moveTo(headX + ux * size, headY + uy * size)
      context.lineTo(headX - ux * size * 0.7 + uy * size * 0.62, headY - uy * size * 0.7 - ux * size * 0.62)
      context.lineTo(headX - ux * size * 0.7 - uy * size * 0.62, headY - uy * size * 0.7 + ux * size * 0.62)
      context.closePath()
      context.fill()
      context.restore()
    }

    /** One node circle, with selection / hover / running rings. */
    function drawNode(context, node, tokens, options) {
      const radius = nodeRadius(node.ref)
      const color = nodeColor(node.ref, tokens)
      context.save()
      context.globalAlpha = options.alpha
      if (node.ref.kind === 'tool' && node.ref.status === 'running') {
        context.beginPath()
        context.arc(node.x, node.y, radius + 3.5, 0, TAU)
        context.strokeStyle = tokens['--dsw-alias-state-warn-primary']
        context.globalAlpha = options.alpha * 0.7
        context.lineWidth = 1.4
        context.setLineDash([3, 3])
        context.stroke()
        context.setLineDash([])
        context.globalAlpha = options.alpha
      }
      if (node.ref.status === 'error' || node.ref.kind === 'retry') {
        context.beginPath()
        context.arc(node.x, node.y, radius + 2.6, 0, TAU)
        context.strokeStyle = tokens['--dsw-alias-state-error-primary']
        context.globalAlpha = options.alpha * 0.55
        context.lineWidth = 1.2
        context.stroke()
        context.globalAlpha = options.alpha
      }
      context.beginPath()
      context.arc(node.x, node.y, radius, 0, TAU)
      context.fillStyle = color
      context.fill()
      context.lineWidth = 2
      context.strokeStyle = tokens['--dsw-alias-bg-layer-1']
      context.stroke()
      if (options.hovered) {
        context.beginPath()
        context.arc(node.x, node.y, radius + 4, 0, TAU)
        context.strokeStyle = tokens['--dsw-alias-label-primary']
        context.lineWidth = 1.5
        context.stroke()
      }
      if (options.selected) {
        context.beginPath()
        context.arc(node.x, node.y, radius + 5.5, 0, TAU)
        context.strokeStyle = tokens['--dsw-alias-brand-primary']
        context.lineWidth = 2
        context.stroke()
      }
      context.restore()
    }

    /** Small text label under one node, with a background-colored halo. */
    function drawNodeLabel(context, node, tokens, scale) {
      const text = clipText(node.ref.label || node.ref.kind, 18)
      if (text === '') return
      const radius = nodeRadius(node.ref)
      context.save()
      context.font = '11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'top'
      context.lineWidth = 3
      context.strokeStyle = tokens['--dsw-alias-bg-base']
      context.fillStyle = tokens['--dsw-alias-label-secondary']
      const x = node.x
      const y = node.y + radius + 3
      context.strokeText(text, x, y)
      context.fillText(text, x, y)
      if (node.ref.kind === 'user' && node.ref.turn > 0) {
        const turnText = '#' + node.ref.turn
        context.font = '10px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
        context.fillStyle = tokens['--dsw-alias-label-secondary']
        context.strokeText(turnText, x, y + 13)
        context.fillText(turnText, x, y + 13)
      }
      context.restore()
    }

    /** Hover card with the pointed node's summary, drawn in screen space. */
    function drawHoverCard(context, size, sim, tokens, hovered, pointer) {
      if (!hovered) return
      const node = hovered.ref
      const kindKey = 'kind.' + node.kind
      const lines = []
      lines.push({ text: clipText(node.title, 52), strong: true })
      const meta = []
      if (node.turn >= 0) meta.push('Turn ' + node.turn)
      if (typeof node.step === 'number' && node.step > 0) meta.push('Step ' + node.step)
      if (node.kind === 'tool' && node.status !== undefined) {
        meta.push(node.status === 'error' ? 'Failed' : node.status === 'running' ? 'Running' : 'Done')
      }
      if (node.duration !== null && node.duration !== undefined) meta.push(formatDuration(node.duration))
      if (meta.length > 0) lines.push({ text: meta.join(' · '), strong: false })
      if (node.kind === 'tool' && node.argsSummary) lines.push({ text: clipText(node.argsSummary, 56), strong: false })
      if (node.kind !== 'tool' && node.preview) lines.push({ text: clipText(node.preview, 56), strong: false })
      if (node.usage && typeof node.usage.totalTokens === 'number') lines.push({ text: node.usage.totalTokens + ' tokens', strong: false })
      const padding = 9
      const lineHeight = 15
      context.save()
      context.font = '11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
      let width = 0
      for (const line of lines) {
        const measured = context.measureText(line.text).width
        if (measured > width) width = measured
      }
      width = Math.min(320, width + padding * 2)
      const height = padding * 2 + lines.length * lineHeight
      let x = pointer.x + 16
      let y = pointer.y + 16
      if (x + width > size.w - 8) x = Math.max(8, pointer.x - width - 16)
      if (y + height > size.h - 8) y = Math.max(8, pointer.y - height - 16)
      const radius = 6
      context.beginPath()
      context.moveTo(x + radius, y)
      context.lineTo(x + width - radius, y)
      context.quadraticCurveTo(x + width, y, x + width, y + radius)
      context.lineTo(x + width, y + height - radius)
      context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      context.lineTo(x + radius, y + height)
      context.quadraticCurveTo(x, y + height, x, y + height - radius)
      context.lineTo(x, y + radius)
      context.quadraticCurveTo(x, y, x + radius, y)
      context.closePath()
      context.fillStyle = tokens['--dsw-alias-bg-overlay']
      context.globalAlpha = 0.98
      context.fill()
      context.globalAlpha = 1
      context.strokeStyle = tokens['--dsw-alias-border-l2']
      context.lineWidth = 1
      context.stroke()
      let cursorY = y + padding
      for (const line of lines) {
        context.fillStyle = line.strong ? tokens['--dsw-alias-label-primary'] : tokens['--dsw-alias-label-secondary']
        context.font =
          (line.strong ? '600 ' : '') + '11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
        context.textAlign = 'left'
        context.textBaseline = 'top'
        context.fillText(line.text, x + padding, cursorY)
        cursorY += lineHeight
      }
      context.restore()
    }

    /** Paint one complete frame. */
    function drawScene(context, size, view, sim, tokens, options) {
      if (size.w <= 0 || size.h <= 0) return
      context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
      context.clearRect(0, 0, size.w, size.h)
      context.fillStyle = tokens['--dsw-alias-bg-base']
      context.fillRect(0, 0, size.w, size.h)
      context.save()
      context.translate(view.x, view.y)
      context.scale(view.scale, view.scale)

      drawGrid(context, view, size, tokens)
      if (options.layout === 'timeline') drawLanes(context, sim, view, size, tokens)

      let focusIndex = -1
      if (options.hoverId !== null) {
        for (let i = 0; i < sim.nodes.length; i += 1) {
          if (sim.nodes[i].id === options.hoverId) {
            focusIndex = i
            break
          }
        }
      }
      if (focusIndex < 0 && options.selectedId !== null) {
        for (let i = 0; i < sim.nodes.length; i += 1) {
          if (sim.nodes[i].id === options.selectedId) {
            focusIndex = i
            break
          }
        }
      }
      let neighbors = null
      if (focusIndex >= 0) {
        neighbors = new Set([focusIndex])
        for (const edge of sim.edges) {
          if (edge.si === focusIndex) neighbors.add(edge.ti)
          else if (edge.ti === focusIndex) neighbors.add(edge.si)
        }
      }

      for (const edge of sim.edges) {
        let alpha = 1
        if (neighbors !== null) alpha = neighbors.has(edge.si) && neighbors.has(edge.ti) ? 1 : 0.1
        drawEdge(context, sim.nodes[edge.si], sim.nodes[edge.ti], edge, tokens, alpha)
      }

      const showLabels = sim.nodes.length <= 150 || view.scale >= 0.9
      for (let i = 0; i < sim.nodes.length; i += 1) {
        const node = sim.nodes[i]
        const inFocus = neighbors === null || neighbors.has(i)
        drawNode(context, node, tokens, {
          alpha: inFocus ? 1 : 0.24,
          hovered: i === focusIndex && options.hoverId !== null,
          selected: node.id === options.selectedId,
        })
        if (showLabels && inFocus) drawNodeLabel(context, node, tokens, view.scale)
      }

      let hovered = null
      if (options.hoverId !== null) {
        for (const node of sim.nodes) {
          if (node.id === options.hoverId) {
            hovered = node
            break
          }
        }
      }
      context.restore()
      if (hovered !== null) drawHoverCard(context, size, sim, tokens, hovered, options.pointer)
    }

    // ---------------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------------

    const CSS = `
.sg-root{display:flex;flex-direction:column;width:100%;height:100%;min-height:0;overflow:hidden;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);font-family:inherit;font-size:12px;line-height:18px}
.sg-toolbar{flex:none;display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:6px 10px;border-bottom:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.sg-brand{display:flex;align-items:baseline;gap:8px;min-width:0}
.sg-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap}
.sg-stats{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;font-variant-numeric:tabular-nums}
.sg-live{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--dsw-alias-state-success-primary);white-space:nowrap}
.sg-liveDot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary);animation:sg-pulse 1.4s ease-in-out infinite}
.sg-spacer{flex:1 1 auto}
.sg-group{display:inline-flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-2)}
.sg-btn{appearance:none;-webkit-appearance:none;border:0;margin:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:16px;padding:3px 7px;border-radius:5px;cursor:pointer;white-space:nowrap}
.sg-btn:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-primary)}
.sg-btn:focus-visible{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.sg-btn:disabled{opacity:.5;cursor:default}
.sg-btn[data-active="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent);color:var(--dsw-alias-brand-primary)}
.sg-zoom{min-width:42px;text-align:center;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);cursor:default;padding:3px 4px}
.sg-truncated{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:5px;font-size:11px;color:var(--dsw-alias-label-secondary);border:.5px solid var(--dsw-alias-border-l1)}
.sg-main{position:relative;flex:1 1 auto;display:flex;min-height:0;min-width:0}
.sg-stage{position:relative;flex:1 1 auto;min-width:0;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base)}
.sg-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
.sg-canvas[data-panning="true"]{cursor:grabbing}
.sg-canvas[data-hovering="true"]{cursor:pointer}
.sg-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:24px;text-align:center;pointer-events:none;color:var(--dsw-alias-label-secondary)}
.sg-emptyTitle{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.sg-emptyHint{font-size:11px;color:var(--dsw-alias-label-secondary);max-width:360px}
.sg-legend{position:absolute;right:10px;bottom:10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;max-width:64%;padding:5px 9px;border-radius:7px;border:.5px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-overlay) 90%,transparent);color:var(--dsw-alias-label-secondary);font-size:11px;pointer-events:none}
.sg-legendItem{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.sg-dot{width:8px;height:8px;border-radius:50%;display:inline-block;box-shadow:0 0 0 1.5px var(--dsw-alias-bg-overlay)}
.sg-hint{position:absolute;left:10px;bottom:10px;max-width:52%;color:var(--dsw-alias-label-secondary);font-size:11px;pointer-events:none}
.sg-details{flex:none;display:flex;flex-direction:column;min-height:0;width:300px;max-width:46%;border-left:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.sg-detailsHead{flex:none;display:flex;align-items:center;gap:8px;padding:8px 8px 8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l1)}
.sg-detailsKind{flex:none;font-size:10px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);padding:1px 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-2)}
.sg-detailsTitle{flex:1 1 auto;min-width:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sg-close{appearance:none;-webkit-appearance:none;flex:none;width:24px;height:24px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:16px;cursor:pointer}
.sg-close:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-primary)}
.sg-close:focus-visible{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.sg-detailsBody{flex:1 1 auto;min-height:0;overflow:auto;padding:10px 12px 16px}
.sg-kv{display:grid;grid-template-columns:64px minmax(0,1fr);gap:4px 8px;margin:0 0 10px}
.sg-kv dt{color:var(--dsw-alias-label-secondary);font-size:11px}
.sg-kv dd{margin:0;font-size:11px;color:var(--dsw-alias-label-primary);word-break:break-word;font-variant-numeric:tabular-nums}
.sg-sectionTitle{margin:10px 0 4px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.sg-pre{margin:0;padding:6px 8px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;font-size:10.5px;line-height:16px;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto}
.sg-action{appearance:none;-webkit-appearance:none;margin-top:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;padding:4px 9px;cursor:pointer}
.sg-action:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-2))}
.sg-action:focus-visible{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.sg-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@keyframes sg-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.8)}}
@media (max-width:720px){.sg-stats{display:none}.sg-hint{display:none}.sg-details{width:46%}}
`

    // ---------------------------------------------------------------------
    // Canvas stage
    // ---------------------------------------------------------------------

    function createSimState() {
      return { nodes: [], edges: [], lanes: null, alpha: 0, dirty: true, worldW: 960, worldH: 600 }
    }

    const GraphStage = React.memo(function GraphStage(props) {
      const { model, layout, selectedId, apiRef, onSelect, onZoomChange, running, t } = props
      const stageRef = React.useRef(null)
      const canvasRef = React.useRef(null)
      const sizeRef = React.useRef({ w: 0, h: 0, dpr: 1 })
      const tokensRef = React.useRef(FALLBACK_TOKENS)
      const simRef = React.useRef(createSimState())
      const viewRef = React.useRef({ x: 0, y: 0, scale: 1, fitted: false })
      const hoverRef = React.useRef(null)
      const pointerRef = React.useRef({ x: 0, y: 0 })
      const dragRef = React.useRef(null)
      const selectedRef = React.useRef(selectedId)
      const layoutRef = React.useRef(layout)
      const modelRef = React.useRef(model)
      const runningRef = React.useRef(running)
      const tRef = React.useRef(t)
      const rafRef = React.useRef(0)
      const zoomCbRef = React.useRef(onZoomChange)
      const selectRef = React.useRef(onSelect)
      const [panning, setPanning] = React.useState(false)
      const [hovering, setHovering] = React.useState(false)

      layoutRef.current = layout
      modelRef.current = model
      runningRef.current = running
      tRef.current = t
      zoomCbRef.current = onZoomChange
      selectRef.current = onSelect
      selectedRef.current = selectedId

      const reportZoom = () => {
        const callback = zoomCbRef.current
        if (typeof callback === 'function') callback(Math.round(viewRef.current.scale * 100))
      }

      const fit = React.useCallback(() => {
        const sim = simRef.current
        const size = sizeRef.current
        fitView(viewRef.current, sim, size)
        sim.dirty = true
        reportZoom()
      }, [])

      const rerun = React.useCallback(() => {
        const sim = simRef.current
        const size = sizeRef.current
        const nodes = sim.nodes
        for (let i = 0; i < nodes.length; i += 1) {
          const node = nodes[i]
          const angle = i * GOLDEN_ANGLE
          const spread = Math.min(sim.worldW, sim.worldH) * 0.28
          const fraction = Math.sqrt((i + 1) / Math.max(1, nodes.length))
          node.x = sim.worldW / 2 + Math.cos(angle) * spread * fraction
          node.y = sim.worldH / 2 + Math.sin(angle) * spread * fraction
          node.vx = 0
          node.vy = 0
          node.fixed = false
        }
        if (nodes.length > 0) sim.alpha = 0.95
        sim.dirty = true
        fitView(viewRef.current, sim, size)
        reportZoom()
      }, [])

      const zoomBy = React.useCallback((factor) => {
        const view = viewRef.current
        const size = sizeRef.current
        const next = Math.max(0.02, Math.min(4, view.scale * factor))
        const cx = size.w / 2
        const cy = size.h / 2
        view.x = cx - ((cx - view.x) / view.scale) * next
        view.y = cy - ((cy - view.y) / view.scale) * next
        view.scale = next
        simRef.current.dirty = true
        reportZoom()
      }, [])

      React.useEffect(() => {
        if (apiRef !== null && typeof apiRef === 'object') {
          apiRef.current = { fit: fit, rerun: rerun, zoomBy: zoomBy }
        }
        return () => {
          if (apiRef !== null && typeof apiRef === 'object') apiRef.current = null
        }
      }, [apiRef, fit, rerun, zoomBy])

      const lastLayoutRef = React.useRef(layout)

      React.useEffect(() => {
        const sim = simRef.current
        const layoutChanged = lastLayoutRef.current !== layout
        lastLayoutRef.current = layout
        prepareSim(sim, model, layout, sizeRef.current)
        if (layoutChanged || viewRef.current.fitted === false) {
          fitView(viewRef.current, sim, sizeRef.current)
          reportZoom()
        }
        sim.dirty = true
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [model, layout])

      React.useEffect(() => {
        const stage = stageRef.current
        const canvas = canvasRef.current
        if (!stage || !canvas) return undefined
        const context = canvas.getContext('2d')
        if (!context) return undefined

        const readSize = () => {
          const rect = stage.getBoundingClientRect()
          const dpr = window.devicePixelRatio || 1
          const width = Math.max(0, Math.round(rect.width))
          const height = Math.max(0, Math.round(rect.height))
          if (
            width === sizeRef.current.w &&
            height === sizeRef.current.h &&
            dpr === sizeRef.current.dpr
          ) {
            return
          }
          sizeRef.current = { w: width, h: height, dpr: dpr }
          canvas.width = Math.max(1, Math.round(width * dpr))
          canvas.height = Math.max(1, Math.round(height * dpr))
          const sim = simRef.current
          sim.worldW = Math.max(640, width)
          sim.worldH = Math.max(420, height)
          if (sim.nodes.length > 0 && viewRef.current.fitted === false) {
            fitView(viewRef.current, sim, sizeRef.current)
            reportZoom()
          }
          sim.dirty = true
        }

        const refreshTokens = () => {
          tokensRef.current = readTokens(canvas)
          simRef.current.dirty = true
        }

        readSize()
        refreshTokens()
        const observer = new ResizeObserver(readSize)
        observer.observe(stage)
        const mutation = new MutationObserver(refreshTokens)
        mutation.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme'],
        })
        let media = null
        if (typeof window.matchMedia === 'function') {
          media = window.matchMedia('(prefers-color-scheme: dark)')
          if (media && typeof media.addEventListener === 'function') media.addEventListener('change', refreshTokens)
        }

        const draw = () => {
          drawScene(context, sizeRef.current, viewRef.current, simRef.current, tokensRef.current, {
            selectedId: selectedRef.current,
            hoverId: hoverRef.current,
            pointer: pointerRef.current,
            layout: layoutRef.current,
            running: runningRef.current,
            t: tRef.current,
          })
        }

        const loop = () => {
          rafRef.current = requestAnimationFrame(loop)
          const sim = simRef.current
          const active = sim.alpha > 0.005 && layoutRef.current !== 'timeline'
          if (active) stepSimulation(sim)
          if (active || sim.dirty) {
            draw()
            sim.dirty = false
          }
        }
        rafRef.current = requestAnimationFrame(loop)

        const onWheel = (event) => {
          event.preventDefault()
          const view = viewRef.current
          const rect = stage.getBoundingClientRect()
          const mx = event.clientX - rect.left
          const my = event.clientY - rect.top
          const factor = Math.exp(-event.deltaY * 0.0016)
          const next = Math.max(0.06, Math.min(4, view.scale * factor))
          if (next === view.scale) return
          view.x = mx - ((mx - view.x) / view.scale) * next
          view.y = my - ((my - view.y) / view.scale) * next
          view.scale = next
          simRef.current.dirty = true
          reportZoom()
        }
        canvas.addEventListener('wheel', onWheel, { passive: false })

        return () => {
          cancelAnimationFrame(rafRef.current)
          observer.disconnect()
          mutation.disconnect()
          if (media && typeof media.removeEventListener === 'function') media.removeEventListener('change', refreshTokens)
          canvas.removeEventListener('wheel', onWheel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      const localPoint = (event) => {
        const stage = stageRef.current
        if (!stage) return null
        const rect = stage.getBoundingClientRect()
        return { x: event.clientX - rect.left, y: event.clientY - rect.top }
      }

      const onPointerDown = (event) => {
        const point = localPoint(event)
        if (point === null) return
        const sim = simRef.current
        const view = viewRef.current
        pointerRef.current = point
        const world = screenToWorld(view, point.x, point.y)
        const hit = hitTest(sim, world.x, world.y, view.scale)
        const canvas = canvasRef.current
        if (canvas && typeof canvas.setPointerCapture === 'function') {
          try {
            canvas.setPointerCapture(event.pointerId)
          } catch (error) {
            /* capture is best-effort */
          }
        }
        dragRef.current = {
          kind: hit === null ? 'pan' : 'node',
          id: hit === null ? '' : hit.id,
          pointerId: event.pointerId,
          startX: point.x,
          startY: point.y,
          moved: false,
          viewX: view.x,
          viewY: view.y,
        }
        if (hit !== null) {
          setHovering(true)
        } else {
          setPanning(true)
        }
      }

      const onPointerMove = (event) => {
        const point = localPoint(event)
        if (point === null) return
        pointerRef.current = point
        const sim = simRef.current
        const view = viewRef.current
        const drag = dragRef.current
        if (drag !== null && drag.pointerId === event.pointerId) {
          const dx = point.x - drag.startX
          const dy = point.y - drag.startY
          if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
          if (drag.kind === 'node') {
            for (const node of sim.nodes) {
              if (node.id !== drag.id) continue
              const world = screenToWorld(view, point.x, point.y)
              node.fixed = true
              node.x = world.x
              node.y = world.y
              node.vx = 0
              node.vy = 0
              break
            }
            sim.alpha = Math.max(sim.alpha, 0.3)
          } else {
            view.x = drag.viewX + dx
            view.y = drag.viewY + dy
          }
          sim.dirty = true
          return
        }
        const world = screenToWorld(view, point.x, point.y)
        const hit = hitTest(sim, world.x, world.y, view.scale)
        const nextHover = hit === null ? null : hit.id
        if (nextHover !== hoverRef.current) {
          hoverRef.current = nextHover
          sim.dirty = true
          setHovering(nextHover !== null)
        }
      }

      const finishDrag = (event, allowSelect) => {
        const drag = dragRef.current
        dragRef.current = null
        setPanning(false)
        if (drag === null || drag.pointerId !== event.pointerId) return
        if (drag.kind === 'node') {
          if (!drag.moved && allowSelect && typeof selectRef.current === 'function') selectRef.current(drag.id)
        } else if (!drag.moved && allowSelect && typeof selectRef.current === 'function') {
          selectRef.current(null)
        }
      }

      const onPointerUp = (event) => {
        finishDrag(event, true)
      }

      const onPointerLeave = () => {
        hoverRef.current = null
        simRef.current.dirty = true
        setHovering(false)
      }

      const onDoubleClick = () => {
        fitRef.current()
      }

      const fitRef = React.useRef(fit)
      fitRef.current = fit

      return h(
        'div',
        {
          className: 'sg-stage',
          ref: stageRef,
          onDoubleClick: onDoubleClick,
        },
        h('canvas', {
          className: 'sg-canvas',
          ref: canvasRef,
          'data-panning': panning ? 'true' : 'false',
          'data-hovering': hovering ? 'true' : 'false',
          role: 'img',
          'aria-label':
            typeof t === 'function'
              ? t('a11y', { nodes: model.nodes.length, edges: model.edges.length })
              : 'Session trajectory graph',
          onPointerDown: onPointerDown,
          onPointerMove: onPointerMove,
          onPointerUp: onPointerUp,
          onPointerCancel: onPointerUp,
          onPointerLeave: onPointerLeave,
        }),
      )
    })

    // ---------------------------------------------------------------------
    // Details panel
    // ---------------------------------------------------------------------

    const KIND_TEXT_KEY = {
      user: 'kind.user',
      assistant: 'kind.assistant',
      tool: 'kind.tool',
      compaction: 'kind.compaction',
      retry: 'kind.retry',
    }

    const STATUS_TEXT_KEY = {
      running: 'status.running',
      ok: 'status.ok',
      error: 'status.error',
      complete: 'status.complete',
      retry: 'status.running',
    }

    function renderSection(title, body) {
      if (!body) return null
      return h(
        'div',
        null,
        h('div', { className: 'sg-sectionTitle' }, title),
        h('pre', { className: 'sg-pre' }, body),
      )
    }

    function NodeDetails(props) {
      const { node, t, onClose, inspectCall } = props
      if (!node) return null
      const rows = []
      rows.push([t('details.turn'), String(node.turn)])
      if (typeof node.step === 'number' && node.step > 0) rows.push([t('details.step'), String(node.step)])
      if (node.time) rows.push([t('details.time'), formatClock(node.time)])
      if (node.kind === 'tool' && node.name) rows.push([t('details.tool'), node.name])
      if (node.status && STATUS_TEXT_KEY[node.status]) rows.push([t('details.status'), t(STATUS_TEXT_KEY[node.status])])
      if (node.duration !== null && node.duration !== undefined) rows.push([t('details.duration'), formatDuration(node.duration)])
      if (node.model) rows.push([t('details.model'), node.model])
      if (node.usage && typeof node.usage.totalTokens === 'number') {
        const parts = ['total ' + node.usage.totalTokens]
        if (typeof node.usage.inputTokens === 'number') parts.push('in ' + node.usage.inputTokens)
        if (typeof node.usage.outputTokens === 'number') parts.push('out ' + node.usage.outputTokens)
        rows.push([t('details.tokens'), parts.join(' · ')])
      }
      if (node.callId) rows.push([t('details.call'), node.callId])
      const canInspect = node.kind === 'tool' && node.callId && typeof inspectCall === 'function'
      return h(
        'aside',
        { className: 'sg-details', 'aria-label': t('details.title') },
        h(
          'div',
          { className: 'sg-detailsHead' },
          h('span', { className: 'sg-detailsKind' }, KIND_TEXT_KEY[node.kind] ? t(KIND_TEXT_KEY[node.kind]) : node.kind),
          h('span', { className: 'sg-detailsTitle', title: node.title }, node.title),
          h(
            'button',
            {
              type: 'button',
              className: 'sg-close',
              onClick: onClose,
              'aria-label': t('details.close'),
              title: t('details.close'),
            },
            '×',
          ),
        ),
        h(
          'div',
          { className: 'sg-detailsBody' },
          h(
            'dl',
            { className: 'sg-kv' },
            rows.flatMap((row) => [h('dt', { key: 'k:' + row[0] }, row[0]), h('dd', { key: 'v:' + row[0] }, row[1])]),
          ),
          renderSection(t('details.args'), node.argsSummary || (node.kind === 'tool' ? node.preview : '')),
          renderSection(t('details.result'), node.resultPreview),
          renderSection(t('details.content'), node.kind === 'tool' ? '' : node.preview),
          canInspect
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'sg-action',
                  onClick: () => {
                    try {
                      inspectCall(node.callId)
                    } catch (error) {
                      /* the host inspector is optional */
                    }
                  },
                },
                t('details.inspect'),
              )
            : null,
        ),
      )
    }

    // ---------------------------------------------------------------------
    // View root
    // ---------------------------------------------------------------------

    function interpolate(text, params) {
      if (!params || typeof text !== 'string') return text
      return text.replace(/\{(\w+)\}/g, (match, key) =>
        Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
      )
    }

    function GraphView(props) {
      const rawT = props.t
      const t = React.useCallback(
        (key, params) => {
          let text = key
          if (typeof rawT === 'function') {
            try {
              text = rawT(key, params)
            } catch (error) {
              text = key
            }
          }
          if (typeof text !== 'string') text = key
          return interpolate(text, params)
        },
        [rawT],
      )
      const eventSource = props.eventSource
      const loadOlder = props.loadOlder
      const inspectCall = typeof props.inspectCall === 'function' ? props.inspectCall : null
      const useSession = typeof props.useSession === 'function' ? props.useSession : null

      const subscribe = React.useCallback(
        (listener) => {
          if (!eventSource || typeof eventSource.subscribe !== 'function') return () => {}
          return eventSource.subscribe(listener)
        },
        [eventSource],
      )
      const getSnapshot = React.useCallback(() => {
        if (!eventSource || typeof eventSource.getSnapshot !== 'function') return null
        return eventSource.getSnapshot()
      }, [eventSource])
      const windowSnapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

      const runningHook = useSession !== null ? useSession : null
      const running = runningHook !== null ? runningHook((snapshot) => Boolean(snapshot && snapshot.running)) : false

      const [filters, setFilters] = React.useState(DEFAULT_FILTERS)
      const [layout, setLayout] = React.useState('force')
      const [selectedId, setSelectedId] = React.useState(null)
      const [zoomPercent, setZoomPercent] = React.useState(100)
      const [loadingOlder, setLoadingOlder] = React.useState(false)
      const [loadError, setLoadError] = React.useState('')
      const apiRef = React.useRef(null)

      const entries =
        windowSnapshot && Array.isArray(windowSnapshot.entries) ? windowSnapshot.entries : EMPTY_ENTRIES
      const entriesRef = React.useRef(entries)
      entriesRef.current = entries
      // Streaming appends transient entries many times per second; only the
      // durable prefix changes the graph, so fold on that signature alone.
      const modelSignature = React.useMemo(() => {
        let count = 0
        let first = -1
        let last = -1
        for (const entry of entries) {
          if (!entry || entry.type !== 'event') continue
          const seq = entry.event && typeof entry.event.seq === 'number' ? entry.event.seq : -1
          count += 1
          if (first < 0) first = seq
          last = seq
        }
        return count + ':' + first + ':' + last
      }, [entries])
      const model = React.useMemo(() => buildModel(entriesRef.current), [modelSignature])
      const viewModel = React.useMemo(() => contractModel(model, filters), [model, filters])
      const selected = React.useMemo(() => {
        if (selectedId === null) return null
        for (const node of model.nodes) if (node.id === selectedId) return node
        return null
      }, [model, selectedId])
      const hasMore = Boolean(windowSnapshot && windowSnapshot.hasMore)
      const truncated = Boolean(model.truncated) || hasMore

      const onSelect = React.useCallback((id) => setSelectedId(id), [])
      const onZoomChange = React.useCallback((percent) => setZoomPercent(percent), [])
      const onCloseDetails = React.useCallback(() => setSelectedId(null), [])

      const toggleFilter = (key) => {
        setFilters((current) => {
          const next = {
            user: current.user,
            assistant: current.assistant,
            tool: current.tool,
            system: current.system,
          }
          next[key] = !current[key]
          return next
        })
      }

      const onLoadOlder = React.useCallback(() => {
        if (typeof loadOlder !== 'function' || loadingOlder) return
        setLoadingOlder(true)
        setLoadError('')
        Promise.resolve()
          .then(() => loadOlder())
          .catch((error) => {
            setLoadError(error && error.message ? String(error.message) : String(error))
          })
          .then(() => {
            setLoadingOlder(false)
          })
      }, [loadOlder, loadingOlder])

      const stats = model.stats
      const statsText = t('stats', {
        turns: stats.turns,
        nodes: stats.nodes,
        calls: stats.calls,
        errors: stats.errors,
      })

      const filterButtons = [
        ['user', 'filter.user'],
        ['assistant', 'filter.assistant'],
        ['tool', 'filter.tool'],
        ['system', 'filter.system'],
      ].map((entry) =>
        h(
          'button',
          {
            key: 'filter:' + entry[0],
            type: 'button',
            className: 'sg-btn',
            'data-active': filters[entry[0]] ? 'true' : 'false',
            'aria-pressed': filters[entry[0]] ? 'true' : 'false',
            onClick: () => toggleFilter(entry[0]),
          },
          t(entry[1]),
        ),
      )

      const layoutButtons = [
        ['force', 'layout.force'],
        ['timeline', 'layout.timeline'],
      ].map((entry) =>
        h(
          'button',
          {
            key: 'layout:' + entry[0],
            type: 'button',
            className: 'sg-btn',
            'data-active': layout === entry[0] ? 'true' : 'false',
            'aria-pressed': layout === entry[0] ? 'true' : 'false',
            onClick: () => setLayout(entry[0]),
          },
          t(entry[1]),
        ),
      )

      const callApi = (method, ...args) => {
        const api = apiRef.current
        if (api && typeof api[method] === 'function') api[method](...args)
      }

      let emptyTitle = null
      let emptyHint = null
      if (!eventSource) {
        emptyTitle = t('unavailable')
      } else if (model.nodes.length === 0) {
        emptyTitle = t('empty')
        emptyHint = t('emptyHint')
      } else if (viewModel.nodes.length === 0) {
        emptyTitle = t('filteredEmpty')
        emptyHint = t('hint')
      }

      return h(
        'div',
        { className: 'sg-root' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'sg-toolbar' },
          h(
            'div',
            { className: 'sg-brand' },
            h('span', { className: 'sg-title' }, t('title')),
            h('span', { className: 'sg-stats' }, statsText),
            running
              ? h('span', { className: 'sg-live' }, h('span', { className: 'sg-liveDot' }), t('live'))
              : null,
            truncated ? h('span', { className: 'sg-truncated', title: t('historyTruncated') }, t('historyTruncated')) : null,
          ),
          h('span', { className: 'sg-spacer' }),
          h('div', { className: 'sg-group', role: 'group', 'aria-label': t('layout.force') }, layoutButtons),
          h('div', { className: 'sg-group', role: 'group', 'aria-label': t('filter.user') }, filterButtons),
          h(
            'div',
            { className: 'sg-group' },
            h(
              'button',
              { type: 'button', className: 'sg-btn', onClick: () => callApi('fit'), title: t('fit') },
              t('fit'),
            ),
            h(
              'button',
              { type: 'button', className: 'sg-btn', onClick: () => callApi('rerun'), title: t('rerun') },
              t('rerun'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'sg-btn',
                onClick: () => callApi('zoomBy', 1 / 1.25),
                title: t('zoomOut'),
                'aria-label': t('zoomOut'),
              },
              '−',
            ),
            h('span', { className: 'sg-btn sg-zoom', 'aria-hidden': 'true' }, zoomPercent + '%'),
            h(
              'button',
              {
                type: 'button',
                className: 'sg-btn',
                onClick: () => callApi('zoomBy', 1.25),
                title: t('zoomIn'),
                'aria-label': t('zoomIn'),
              },
              '+',
            ),
          ),
          hasMore
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'sg-btn',
                  onClick: onLoadOlder,
                  disabled: loadingOlder,
                  title: loadError !== '' ? loadError : t('loadOlder'),
                },
                loadingOlder ? t('loadingOlder') : t('loadOlder'),
              )
            : null,
        ),
        h(
          'div',
          { className: 'sg-main' },
          h(GraphStage, {
            model: viewModel,
            layout: layout,
            selectedId: selectedId,
            apiRef: apiRef,
            onSelect: onSelect,
            onZoomChange: onZoomChange,
            running: running,
            t: t,
          }),
          emptyTitle !== null
            ? h(
                'div',
                { className: 'sg-empty' },
                h('div', { className: 'sg-emptyTitle' }, emptyTitle),
                emptyHint !== null ? h('div', { className: 'sg-emptyHint' }, emptyHint) : null,
              )
            : null,
          h(
            'div',
            { className: 'sg-legend', 'aria-hidden': 'true' },
            h(
              'span',
              { className: 'sg-legendItem' },
              h('span', { className: 'sg-dot', style: { background: 'var(--dsw-alias-brand-primary)' } }),
              t('legend.user'),
            ),
            h(
              'span',
              { className: 'sg-legendItem' },
              h('span', { className: 'sg-dot', style: { background: 'var(--dsw-alias-state-success-primary)' } }),
              t('legend.assistant'),
            ),
            h(
              'span',
              { className: 'sg-legendItem' },
              h('span', { className: 'sg-dot', style: { background: 'var(--dsw-alias-state-warn-primary)' } }),
              t('legend.tool'),
            ),
            h(
              'span',
              { className: 'sg-legendItem' },
              h('span', { className: 'sg-dot', style: { background: 'var(--dsw-alias-state-error-primary)' } }),
              t('legend.error'),
            ),
            h(
              'span',
              { className: 'sg-legendItem' },
              h('span', { className: 'sg-dot', style: { background: 'var(--dsw-alias-label-secondary)' } }),
              t('legend.system'),
            ),
          ),
          h('div', { className: 'sg-hint' }, t('hint')),
          selected !== null
            ? h(NodeDetails, {
                node: selected,
                t: t,
                onClose: onCloseDetails,
                inspectCall: inspectCall,
              })
            : null,
        ),
      )
    }

    // ---------------------------------------------------------------------
    // Plugin body
    // ---------------------------------------------------------------------

    /** Required Client services: the slot registry, Session bindings, locale. */
    const inject = ['slots', 'sessions', 'locale']

    /**
     * Register the Graph Conversation view. The view reads the loaded Session
     * event window from its registration `inject` face, so no Host state and no
     * second event subscription are needed.
     * @param ctx - Client root context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, DICT), 'session-graph: dictionaries')
      const translate = ctx.locale.bind(NS)
      ctx.slots.inject('conversation.view', () =>
        ctx.slots.register(
          {
            name: 'conversation.view',
            id: VIEW_ID,
            order: 20,
            locale: NS,
            label: () => translate('view.graph'),
            inject: (sessionId) => {
              const binding = ctx.sessions.binding(sessionId)
              if (binding === undefined) {
                throw new Error('session-graph: session "' + sessionId + '" is unavailable')
              }
              return {
                eventSource: binding.eventSource,
                loadOlder: async () => {
                  await binding.session.loadOlder()
                },
              }
            },
          },
          GraphView,
        ),
      )
    }

    return {
      inject: inject,
      apply: apply,
      __internals: {
        DICT: DICT,
        buildModel: buildModel,
        contractModel: contractModel,
        timelinePositions: timelinePositions,
        summarizeArgs: summarizeArgs,
        textFromContent: textFromContent,
        prepareSim: prepareSim,
        stepSimulation: stepSimulation,
        fitView: fitView,
        nodeRadius: nodeRadius,
        createSimState: createSimState,
      },
    }
  },
})
