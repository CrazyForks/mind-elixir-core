import type { MindElixirInstance, Topic } from '.'
import { DirectionClass } from './types/index'
import { generateUUID, getOffsetLT, setAttributes } from './utils'
import { findEle } from './utils/dom'
import { editSvgText } from './utils/svg'

/**
 * @public
 */
export interface Summary {
  id: string
  text: string
  /**
   * parent node id of the summary
   */
  parent: string
  /**
   * start index of the summary
   */
  start: number
  /**
   * end index of the summary
   */
  end: number
}

export type SummarySvgGroup = SVGGElement & {
  children: [SVGPathElement, SVGTextElement]
  summaryObj: Summary
}

const calcRange = function (nodes: Topic[]) {
  if (nodes.length === 0) throw new Error('No selected node.')
  if (nodes.length === 1) {
    const obj = nodes[0].nodeObj
    const parent = nodes[0].nodeObj.parent
    if (!parent) throw new Error('Can not select root node.')
    const i = parent.children!.findIndex(child => obj === child)
    return {
      parent: parent.id,
      start: i,
      end: i,
    }
  }
  let maxLen = 0
  const parentChains = nodes.map(item => {
    let node = item.nodeObj
    const parentChain = []
    while (node.parent) {
      const parent = node.parent
      const siblings = parent.children
      const index = siblings?.indexOf(node)
      node = parent
      parentChain.unshift({ node, index })
    }
    if (parentChain.length > maxLen) maxLen = parentChain.length
    return parentChain
  })
  let index = 0
  // find minimum common parent
  findMcp: for (; index < maxLen; index++) {
    const base = parentChains[0][index]?.node
    for (let i = 1; i < parentChains.length; i++) {
      const parentChain = parentChains[i]
      if (parentChain[index]?.node !== base) {
        break findMcp
      }
    }
  }
  if (!index) throw new Error('Can not select root node.')
  const range = parentChains.map(chain => chain[index - 1].index).sort()
  const min = range[0] || 0
  const max = range[range.length - 1] || 0
  const parent = parentChains[0][index - 1].node
  if (!parent.parent) throw new Error('Please select nodes in the same main topic.')

  return {
    parent: parent.id,
    start: min,
    end: max,
  }
}

const creatGroup = function (id: string) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SummarySvgGroup
  group.setAttribute('id', id)
  return group
}

const createPath = function (d: string, color?: string) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  setAttributes(path, {
    d,
    stroke: color || '#666',
    fill: 'none',
    'stroke-linecap': 'round',
    'stroke-width': '2',
  })
  return path
}

const createText = function (string: string, x: number, y: number, anchor: 'start' | 'end', color?: string) {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  setAttributes(text, {
    'text-anchor': anchor,
    x: x + '',
    y: y + '',
    fill: color || '#666',
  })
  text.innerHTML = string
  return text
}

const getWrapper = (id: string) => findEle(id).parentElement.parentElement

const getDirection = function ({ parent, start }: Summary) {
  const parentEl = findEle(parent)
  const parentObj = parentEl.nodeObj
  let side: DirectionClass
  if (parentObj.parent) {
    side = parentEl.closest('me-main')!.className as DirectionClass
  } else {
    side = findEle(parentObj.children![start].id).closest('me-main')!.className as DirectionClass
  }
  return side
}

const drawSummary = function (mei: MindElixirInstance, summary: Summary) {
  const { id, text: summaryText, parent, start, end } = summary
  const container = mei.nodes
  const parentEl = findEle(parent)
  const parentObj = parentEl.nodeObj
  const side = getDirection(summary)
  let left = Infinity
  let right = 0
  let startTop = 0
  let endBottom = 0
  for (let i = start; i <= end; i++) {
    const child = parentObj.children?.[i]
    if (!child) {
      console.warn('Child not found')
      mei.removeSummary(id)
      return null
    }
    const wrapper = getWrapper(child.id)
    const { offsetLeft, offsetTop } = getOffsetLT(container, wrapper)
    const offset = start === end ? 10 : 20
    if (i === start) startTop = offsetTop + offset
    if (i === end) endBottom = offsetTop + wrapper.offsetHeight - offset
    if (offsetLeft < left) left = offsetLeft
    if (wrapper.offsetWidth + offsetLeft > right) right = wrapper.offsetWidth + offsetLeft
  }
  let path
  let text
  const top = startTop + 10
  const bottom = endBottom + 10
  const md = (top + bottom) / 2
  const color = mei.theme.cssVar['--color']
  if (side === DirectionClass.LHS) {
    path = createPath(`M ${left + 10} ${top} c -5 0 -10 5 -10 10 L ${left} ${bottom - 10} c 0 5 5 10 10 10 M ${left} ${md} h -10`, color)
    text = createText(summaryText, left - 20, md + 6, 'end', color)
  } else {
    path = createPath(`M ${right - 10} ${top} c 5 0 10 5 10 10 L ${right} ${bottom - 10} c 0 5 -5 10 -10 10 M ${right} ${md} h 10`, color)
    text = createText(summaryText, right + 20, md + 6, 'start', color)
  }
  const group = creatGroup('s-' + id)
  group.appendChild(path)
  group.appendChild(text)
  group.summaryObj = summary
  mei.summarySvg.appendChild(group)
  return group
}

export const createSummary = function (this: MindElixirInstance) {
  let nodes: Topic[] = []
  if (this.currentNode) {
    nodes = [this.currentNode]
  } else if (this.currentNodes) {
    nodes = this.currentNodes
  }
  const { parent, start, end } = calcRange(nodes)
  const summary = { id: generateUUID(), parent, start, end, text: 'summary' }
  const g = drawSummary(this, summary) as SummarySvgGroup
  this.summaries.push(summary)
  this.editSummary(g)
  this.bus.fire('operation', {
    name: 'createSummary',
    obj: summary,
  })
}

export const createSummaryFrom = function (this: MindElixirInstance, summary: Omit<Summary, 'id'>) {
  // now I know the goodness of overloading
  const id = generateUUID()
  const newSummary = { ...summary, id }
  drawSummary(this, newSummary)
  this.summaries.push(newSummary)
  this.bus.fire('operation', {
    name: 'createSummary',
    obj: newSummary,
  })
}

export const removeSummary = function (this: MindElixirInstance, id: string) {
  const index = this.summaries.findIndex(summary => summary.id === id)
  if (index > -1) {
    this.summaries.splice(index, 1)
    document.querySelector('#s-' + id)?.remove()
  }
  this.bus.fire('operation', {
    name: 'removeSummary',
    obj: { id },
  })
}

export const selectSummary = function (this: MindElixirInstance, el: SummarySvgGroup) {
  const box = el.children[1].getBBox()
  const padding = 6
  const radius = 3
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  setAttributes(rect, {
    x: box.x - padding + '',
    y: box.y - padding + '',
    width: box.width + padding * 2 + '',
    height: box.height + padding * 2 + '',
    rx: radius + '',
    stroke: this.theme.cssVar['--selected'] || '#4dc4ff',
    'stroke-width': '2',
    fill: 'none',
  })
  el.appendChild(rect)
  this.currentSummary = el
}

export const unselectSummary = function (this: MindElixirInstance) {
  this.currentSummary?.querySelector('rect')?.remove()
  this.currentSummary = null
}

export const renderSummary = function (this: MindElixirInstance) {
  this.summarySvg.innerHTML = ''
  this.summaries.forEach(summary => {
    try {
      drawSummary(this, summary)
    } catch (e) {
      console.warn('Node may not be expanded')
    }
  })
  this.nodes.insertAdjacentElement('beforeend', this.summarySvg)
}

export const editSummary = function (this: MindElixirInstance, el: SummarySvgGroup) {
  console.time('editSummary')
  if (!el) return
  const textEl = el.childNodes[1] as SVGTextElement
  editSvgText(this, textEl, div => {
    const node = el.summaryObj
    const text = div.textContent?.trim() || ''
    if (text === '') node.text = origin
    else node.text = text
    div.remove()
    if (text === origin) return
    textEl.innerHTML = node.text
    this.linkDiv()
    this.bus.fire('operation', {
      name: 'finishEditSummary',
      obj: node,
    })
  })
  console.timeEnd('editSummary')
}
