import type { Topic } from '../types/dom'
import type { NodeObj, MindElixirInstance, NodeObjExport } from '../types/index'

export function encodeHTML(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

export const isMobile = (): boolean => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

export const getObjById = function (id: string, data: NodeObj): NodeObj | null {
  if (data.id === id) {
    return data
  } else if (data.children && data.children.length) {
    for (let i = 0; i < data.children.length; i++) {
      const res = getObjById(id, data.children[i])
      if (res) return res
    }
    return null
  } else {
    return null
  }
}

/**
 * Add parent property to every node
 */
export const fillParent = (data: NodeObj, parent?: NodeObj) => {
  data.parent = parent
  if (data.children) {
    for (let i = 0; i < data.children.length; i++) {
      fillParent(data.children[i], data)
    }
  }
}

export const setExpand = (node: NodeObj, isExpand: boolean) => {
  // TODO: add level
  node.expanded = isExpand
  if (node.children) {
    node.children.forEach(child => {
      setExpand(child, isExpand)
    })
  }
}

export function refreshIds(data: NodeObj) {
  data.id = generateUUID()
  if (data.children) {
    for (let i = 0; i < data.children.length; i++) {
      refreshIds(data.children[i])
    }
  }
}

export const throttle = <T extends (...args: never[]) => void>(fn: T, wait: number) => {
  let pre = Date.now()
  return function (...args: Parameters<T>) {
    const now = Date.now()
    if (now - pre < wait) return
    fn(...args)
    pre = Date.now()
  }
}

export function getArrowPoints(p3x: number, p3y: number, p4x: number, p4y: number) {
  const deltay = p4y - p3y
  const deltax = p3x - p4x
  let angle = (Math.atan(Math.abs(deltay) / Math.abs(deltax)) / 3.14) * 180
  if (isNaN(angle)) return
  if (deltax < 0 && deltay > 0) {
    angle = 180 - angle
  }
  if (deltax < 0 && deltay < 0) {
    angle = 180 + angle
  }
  if (deltax > 0 && deltay < 0) {
    angle = 360 - angle
  }
  const arrowLength = 12
  const arrowAngle = 30
  const a1 = angle + arrowAngle
  const a2 = angle - arrowAngle
  return {
    x1: p4x + Math.cos((Math.PI * a1) / 180) * arrowLength,
    y1: p4y - Math.sin((Math.PI * a1) / 180) * arrowLength,
    x2: p4x + Math.cos((Math.PI * a2) / 180) * arrowLength,
    y2: p4y - Math.sin((Math.PI * a2) / 180) * arrowLength,
  }
}

export function generateUUID(): string {
  return (new Date().getTime().toString(16) + Math.random().toString(16).substr(2)).substr(2, 16)
}

export const generateNewObj = function (this: MindElixirInstance): NodeObjExport {
  const id = generateUUID()
  return {
    topic: this.newTopicName,
    id,
  }
}

export function checkMoveValid(from: NodeObj, to: NodeObj) {
  let valid = true
  while (to.parent) {
    if (to.parent === from) {
      valid = false
      break
    }
    to = to.parent
  }
  return valid
}

export function deepClone(obj: NodeObj) {
  const deepCloneObj = JSON.parse(
    JSON.stringify(obj, (k, v) => {
      if (k === 'parent') return undefined
      return v
    })
  )
  return deepCloneObj
}

export const getOffsetLT = (parent: HTMLElement, child: HTMLElement) => {
  let offsetLeft = 0
  let offsetTop = 0
  while (child && child !== parent) {
    offsetLeft += child.offsetLeft
    offsetTop += child.offsetTop
    child = child.offsetParent as HTMLElement
  }
  return { offsetLeft, offsetTop }
}

export const setAttributes = (el: HTMLElement | SVGElement, attrs: { [key: string]: string }) => {
  for (const key in attrs) {
    el.setAttribute(key, attrs[key])
  }
}

export const isTopic = (target?: HTMLElement): target is Topic => {
  return target ? target.tagName === 'ME-TPC' : false
}

export const unionTopics = (nodes: Topic[]) => {
  return nodes
    .filter(node => node.nodeObj.parent)
    .filter((node, _, nodes) => {
      for (let i = 0; i < nodes.length; i++) {
        if (node === nodes[i]) continue
        const { parent } = node.nodeObj
        if (parent === nodes[i].nodeObj) {
          return false
        }
      }
      return true
    })
}

export const getTranslate = (styleText: string) => {
  const regex = /translate\(([^,]+),\s*([^)]+)\)/
  const match = styleText.match(regex)
  return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : { x: 0, y: 0 }
}

export const on = function (
  list: {
    [K in keyof GlobalEventHandlersEventMap]: {
      dom: EventTarget
      evt: K
      func: (this: EventTarget, ev: GlobalEventHandlersEventMap[K]) => void
    }
  }[keyof GlobalEventHandlersEventMap][]
) {
  for (let i = 0; i < list.length; i++) {
    const { dom, evt, func } = list[i]
    dom.addEventListener(evt, func as EventListener)
  }
  return function off() {
    for (let i = 0; i < list.length; i++) {
      const { dom, evt, func } = list[i]
      dom.removeEventListener(evt, func as EventListener)
    }
  }
}
