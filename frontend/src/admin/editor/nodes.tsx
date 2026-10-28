'use client'

import { DecoratorBlockNode, type SerializedDecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode'
import { addClassNamesToElement } from '@lexical/utils'
import {
  $applyNodeReplacement,
  $createTextNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  ElementNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical'
import type { JSX } from 'react'

import { BlockCard, UploadPreview } from './decorators'

/**
 * Lexical nodes that read and write the exact JSON Payload stored (types `link`, `autolink`,
 * `upload`, `block`), so existing article bodies round-trip through the editor unchanged and
 * the site's renderer (frontend/src/frontend/components/lexical) keeps working.
 */

/** 24-hex id, the same shape as the ObjectIds Payload put on links/uploads. */
export function newObjectId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const time = Math.floor(Date.now() / 1000)
  bytes[0] = (time >> 24) & 0xff
  bytes[1] = (time >> 16) & 0xff
  bytes[2] = (time >> 8) & 0xff
  bytes[3] = time & 0xff
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ------------------------------------------------------------------ links

export interface LinkFields {
  url?: string
  newTab?: boolean
  linkType?: 'custom' | 'internal'
  doc?: unknown
  [key: string]: unknown
}

export type SerializedPayloadLinkNode = Spread<{ fields: LinkFields; id?: string; type: 'link' | 'autolink'; version: number }, SerializedElementNode>

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'sms:', 'tel:'])

export class PayloadLinkNode extends ElementNode {
  __fields: LinkFields
  __id: string | undefined

  constructor(fields: LinkFields = { linkType: 'custom', newTab: false }, id?: string, key?: NodeKey) {
    super(key)
    this.__fields = fields
    this.__id = id
  }

  static getType(): string {
    return 'link'
  }

  static clone(node: PayloadLinkNode): PayloadLinkNode {
    return new PayloadLinkNode(node.__fields, node.__id, node.__key)
  }

  static importJSON(json: SerializedPayloadLinkNode): PayloadLinkNode {
    return $createPayloadLinkNode(json.fields ?? {}, json.id).updateFromJSON(json)
  }

  updateFromJSON(json: SerializedPayloadLinkNode): this {
    const node = super.updateFromJSON(json)
    node.setFields(json.fields ?? {})
    node.setID(json.id ?? newObjectId())
    return node
  }

  exportJSON(): SerializedPayloadLinkNode {
    const fields = { ...this.getFields() }
    if (fields.linkType === 'internal') delete fields.url
    else if (fields.linkType === 'custom') delete fields.doc
    const out: SerializedPayloadLinkNode = { ...super.exportJSON(), type: 'link', fields, version: 3 }
    const id = this.getID()
    if (id) out.id = id
    return out
  }

  createDOM(config: EditorConfig): HTMLAnchorElement {
    const a = document.createElement('a')
    a.href = this.safeUrl(this.__fields.url ?? '')
    if (this.__fields.newTab) {
      a.target = '_blank'
      a.rel = 'noopener'
    }
    addClassNamesToElement(a, config.theme.link)
    return a
  }

  updateDOM(prev: PayloadLinkNode, dom: HTMLAnchorElement): boolean {
    if (prev.__fields.url !== this.__fields.url) dom.href = this.safeUrl(this.__fields.url ?? '')
    if (prev.__fields.newTab !== this.__fields.newTab) {
      if (this.__fields.newTab) dom.target = '_blank'
      else dom.removeAttribute('target')
    }
    return false
  }

  private safeUrl(url: string): string {
    try {
      return SAFE_PROTOCOLS.has(new URL(url, 'https://x.invalid').protocol) ? url : 'about:blank'
    } catch {
      return url
    }
  }

  getFields(): LinkFields {
    return this.getLatest().__fields
  }

  setFields(fields: LinkFields): this {
    const writable = this.getWritable()
    writable.__fields = fields
    return writable
  }

  getID(): string | undefined {
    return this.getLatest().__id
  }

  setID(id: string | undefined): this {
    const writable = this.getWritable()
    writable.__id = id
    return writable
  }

  isInline(): true {
    return true
  }

  canBeEmpty(): false {
    return false
  }

  canInsertTextBefore(): false {
    return false
  }

  canInsertTextAfter(): false {
    return false
  }
}

/** Links Payload created automatically from typed URLs. Rendered and edited like links. */
export class PayloadAutoLinkNode extends PayloadLinkNode {
  static getType(): string {
    return 'autolink'
  }

  static clone(node: PayloadAutoLinkNode): PayloadAutoLinkNode {
    return new PayloadAutoLinkNode(node.__fields, node.__id, node.__key)
  }

  static importJSON(json: SerializedPayloadLinkNode): PayloadAutoLinkNode {
    return new PayloadAutoLinkNode(json.fields ?? {}, json.id).updateFromJSON(json)
  }

  exportJSON(): SerializedPayloadLinkNode {
    const base = super.exportJSON()
    return {
      type: 'autolink',
      children: base.children,
      direction: base.direction,
      fields: base.fields,
      format: base.format,
      indent: base.indent,
      version: 2,
    } as SerializedPayloadLinkNode
  }
}

export function $createPayloadLinkNode(fields: LinkFields, id?: string): PayloadLinkNode {
  return $applyNodeReplacement(new PayloadLinkNode(fields, id ?? newObjectId()))
}

export function $isPayloadLinkNode(node: LexicalNode | null | undefined): node is PayloadLinkNode {
  return node instanceof PayloadLinkNode
}

function $linkAncestor(node: LexicalNode): PayloadLinkNode | null {
  let parent = node.getParent()
  while (parent && !$isPayloadLinkNode(parent)) parent = parent.getParent()
  return parent
}

/** The link around the current selection, if any. */
export function $selectedLink(): PayloadLinkNode | null {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return null
  const node = selection.anchor.getNode()
  return $isPayloadLinkNode(node) ? node : $linkAncestor(node)
}

/** Wrap the selection in a link, update the link it is in, or (fields = null) remove it. */
export function $toggleLink(fields: LinkFields | null): void {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return
  const nodes = selection.extract()

  if (fields === null) {
    nodes.forEach((node) => {
      const parent = node.getParent()
      if ($isPayloadLinkNode(parent)) {
        parent.getChildren().forEach((child) => parent.insertBefore(child))
        parent.remove()
      }
    })
    return
  }

  if (nodes.length === 1) {
    const existing = $isPayloadLinkNode(nodes[0]) ? nodes[0] : $linkAncestor(nodes[0])
    if (existing) {
      existing.setFields(fields)
      return
    }
  }

  let prevParent: LexicalNode | null = null
  let linkNode: PayloadLinkNode | null = null
  nodes.forEach((node) => {
    const parent = node.getParent()
    if (parent === linkNode || parent === null || ($isElementNode(node) && !node.isInline())) return
    if ($isPayloadLinkNode(parent)) {
      linkNode = parent
      parent.setFields(fields)
      return
    }
    if (!parent.is(prevParent)) {
      prevParent = parent
      linkNode = $createPayloadLinkNode(fields)
      node.insertBefore(linkNode)
    }
    if ($isPayloadLinkNode(node)) {
      if (node.is(linkNode)) return
      if (linkNode) linkNode.append(...node.getChildren())
      node.remove()
      return
    }
    if (linkNode) linkNode.append(node)
  })

  if (nodes.length === 0) {
    // Collapsed caret: insert the URL itself as linked text.
    const link = $createPayloadLinkNode(fields)
    link.append($createTextNode(fields.url ?? 'link'))
    selection.insertNodes([link])
  }
}

// ------------------------------------------------------------------ uploads

export interface UploadData {
  id?: string
  relationTo: string
  /** Asset id (string). May arrive populated with the asset document. */
  value: unknown
  fields?: Record<string, unknown> | null
  pending?: unknown
}

export type SerializedUploadNode = Spread<UploadData & { type: 'upload'; version: number }, SerializedDecoratorBlockNode>

export class UploadNode extends DecoratorBlockNode {
  __data: UploadData

  constructor(data: UploadData, format?: SerializedDecoratorBlockNode['format'], key?: NodeKey) {
    super(format, key)
    this.__data = data
  }

  static getType(): string {
    return 'upload'
  }

  static clone(node: UploadNode): UploadNode {
    return new UploadNode(node.__data, node.__format, node.__key)
  }

  static importJSON(serialized: SerializedLexicalNode & Record<string, unknown>): UploadNode {
    const json = serialized as unknown as SerializedUploadNode
    const value = json.value
    const node = $createUploadNode({ id: json.id, fields: json.fields, pending: json.pending, relationTo: json.relationTo, value })
    node.setFormat(json.format)
    return node
  }

  exportJSON(): SerializedUploadNode {
    const data = this.getData()
    const value = data.value && typeof data.value === 'object' && 'id' in (data.value as object) ? String((data.value as { id: unknown }).id) : data.value
    const out = { ...super.exportJSON(), ...data, value, type: 'upload' as const, version: 3 }
    if (out.pending === undefined) delete out.pending
    return out
  }

  getData(): UploadData {
    return this.getLatest().__data
  }

  setData(data: UploadData): void {
    this.getWritable().__data = data
  }

  createDOM(): HTMLElement {
    return document.createElement('div')
  }

  updateDOM(): false {
    return false
  }

  decorate(): JSX.Element {
    return <UploadPreview nodeKey={this.getKey()} data={this.__data} />
  }
}

export function $createUploadNode(data: UploadData): UploadNode {
  return $applyNodeReplacement(new UploadNode({ ...data, id: data.id ?? newObjectId() }))
}

// ------------------------------------------------------------------ blocks

export type BlockFields = Record<string, unknown> & { id?: string; blockType: string; blockName?: string }

export type SerializedBlockNode = Spread<{ fields: BlockFields; type: 'block'; version: number }, SerializedDecoratorBlockNode>

export class BlockNode extends DecoratorBlockNode {
  __fields: BlockFields

  constructor(fields: BlockFields, format?: SerializedDecoratorBlockNode['format'], key?: NodeKey) {
    super(format, key)
    this.__fields = fields
  }

  static getType(): string {
    return 'block'
  }

  static clone(node: BlockNode): BlockNode {
    return new BlockNode(node.__fields, node.__format, node.__key)
  }

  static importJSON(json: SerializedBlockNode): BlockNode {
    // Version 1 wrapped the fields in a `data` property.
    const fields = (json.version === 1 && (json.fields as { data?: BlockFields }).data) || json.fields
    const node = $createBlockNode(fields)
    node.setFormat(json.format)
    return node
  }

  exportJSON(): SerializedBlockNode {
    return { ...super.exportJSON(), fields: this.getFields(), type: 'block', version: 2 }
  }

  getFields(): BlockFields {
    return this.getLatest().__fields
  }

  setFields(fields: BlockFields): void {
    this.getWritable().__fields = fields
  }

  createDOM(): HTMLElement {
    return document.createElement('div')
  }

  updateDOM(): false {
    return false
  }

  decorate(): JSX.Element {
    return <BlockCard nodeKey={this.getKey()} fields={this.__fields} />
  }
}

export function $createBlockNode(fields: BlockFields): BlockNode {
  return $applyNodeReplacement(new BlockNode({ ...fields, id: fields.id ?? newObjectId(), blockName: fields.blockName ?? '' }))
}

export function $isBlockNode(node: LexicalNode | null | undefined): node is BlockNode {
  return node instanceof BlockNode
}

export function $isUploadNode(node: LexicalNode | null | undefined): node is UploadNode {
  return node instanceof UploadNode
}
