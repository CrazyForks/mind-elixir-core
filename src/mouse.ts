import type { SummarySvgGroup } from './summary'
import type { Topic, Expander, CustomSvg } from './types/dom'
import type { MindElixirInstance } from './types/index'
import dragMoveHelper from './utils/dragMoveHelper'

const isTopic = (target: HTMLElement) => {
  return target.tagName === 'ME-TPC'
}

export default function (mind: MindElixirInstance) {
  mind.map.addEventListener('click', e => {
    if (dragMoveHelper.moved) {
      dragMoveHelper.clear()
      return
    }
    mind.unselectNode()
    mind.unselectNodes()
    mind.unselectSummary()
    // e.preventDefault() // can cause <a /> tags don't work
    const target = e.target as any
    if (target.tagName === 'ME-EPD') {
      mind.expandNode((target as Expander).previousSibling)
    } else if (!mind.editable) {
      return
    } else if (isTopic(target)) {
      mind.selectNode(target as Topic, false, e)
    } else if (target.tagName === 'text') {
      if (target.dataset.type === 'custom-link') {
        mind.selectLink(target.parentElement as CustomSvg)
      } else {
        mind.selectSummary(target.parentElement as unknown as SummarySvgGroup)
      }
    } else if (target.className === 'circle') {
      // skip circle
    } else {
      // lite version doesn't have hideLinkController
      mind.hideLinkController && mind.hideLinkController()
      // BUG: selection doesn't work after this operation
    }
  })

  mind.map.addEventListener('dblclick', e => {
    e.preventDefault()
    if (!mind.editable) return
    const target = e.target as HTMLElement
    if (isTopic(target)) {
      mind.beginEdit(target as Topic)
    } else if (target.tagName === 'text') {
      mind.editSummary(target.parentElement as unknown as SummarySvgGroup)
    }
  })

  /**
   * drag and move the map
   */
  mind.map.addEventListener('mousemove', e => {
    // click trigger mousemove in windows chrome
    if ((e.target as HTMLElement).contentEditable !== 'true') {
      dragMoveHelper.onMove(e, mind.container)
    }
  })
  mind.map.addEventListener('mousedown', e => {
    if (e.button !== 2) return
    if ((e.target as HTMLElement).contentEditable !== 'true') {
      dragMoveHelper.moved = false
      dragMoveHelper.mousedown = true
    }
  })
  mind.map.addEventListener('mouseleave', e => {
    console.log(e.button)
    if (e.button !== 2) return
    dragMoveHelper.clear()
  })
  mind.map.addEventListener('mouseup', e => {
    if (e.button !== 2) return
    dragMoveHelper.clear()
  })
}
