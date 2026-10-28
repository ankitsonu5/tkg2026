import { randomUUID } from 'node:crypto'
import React from 'react'

/**
 * Lexical editor state -> JSX.
 *
 * Article bodies are stored as Lexical JSON (they were authored in the Payload editor).
 * This is a dependency-free port of `@payloadcms/richtext-lexical/react`'s RichText and its
 * default converters, kept output-identical so the rendered markup (and therefore the
 * styling in rich-text.css) did not change when Payload was removed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type LexicalNode = { type: string; [key: string]: any }

export interface SerializedEditorState {
  root: LexicalNode & { children: LexicalNode[] }
}

export interface ConverterArgs<N = any> {
  childIndex: number
  converters: JSXConverters
  node: N
  nodesToJSX: (args: { nodes: LexicalNode[]; parent?: LexicalNode; converters?: JSXConverters }) => React.ReactNode[]
  parent: LexicalNode
}

type ConverterFn = (args: ConverterArgs) => React.ReactNode
type Converter = ConverterFn | React.ReactNode

/** Node type -> converter; `blocks` / `inlineBlocks` map a block type to its converter. */
export type JSXConverters = {
  [nodeType: string]: Converter | Record<string, ConverterFn>
}

export type JSXConvertersFunction = (args: { defaultConverters: JSXConverters }) => JSXConverters

const IS_BOLD = 1
const IS_ITALIC = 1 << 1
const IS_STRIKETHROUGH = 1 << 2
const IS_UNDERLINE = 1 << 3
const IS_CODE = 1 << 4
const IS_SUBSCRIPT = 1 << 5
const IS_SUPERSCRIPT = 1 << 6

const ALLOWED_HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const ALLOWED_LIST_TAGS = new Set(['ul', 'ol'])

export const defaultJSXConverters: JSXConverters = {
  paragraph: ({ node, nodesToJSX }: ConverterArgs) => {
    const children = nodesToJSX({ nodes: node.children })
    if (!children?.length) {
      return (
        <p>
          <br />
        </p>
      )
    }
    return <p>{children}</p>
  },
  text: ({ node }: ConverterArgs) => {
    let text: React.ReactNode = node.text
    if (node.format & IS_BOLD) text = <strong>{text}</strong>
    if (node.format & IS_ITALIC) text = <em>{text}</em>
    if (node.format & IS_STRIKETHROUGH) text = <span style={{ textDecoration: 'line-through' }}>{text}</span>
    if (node.format & IS_UNDERLINE) text = <span style={{ textDecoration: 'underline' }}>{text}</span>
    if (node.format & IS_CODE) text = <code>{text}</code>
    if (node.format & IS_SUBSCRIPT) text = <sub>{text}</sub>
    if (node.format & IS_SUPERSCRIPT) text = <sup>{text}</sup>
    return text
  },
  linebreak: <br />,
  quote: ({ node, nodesToJSX }: ConverterArgs) => <blockquote>{nodesToJSX({ nodes: node.children })}</blockquote>,
  table: ({ node, nodesToJSX }: ConverterArgs) => (
    <div className="lexical-table-container">
      <table className="lexical-table" style={{ borderCollapse: 'collapse' }}>
        <tbody>{nodesToJSX({ nodes: node.children })}</tbody>
      </table>
    </div>
  ),
  tablecell: ({ node, nodesToJSX }: ConverterArgs) => {
    const children = nodesToJSX({ nodes: node.children })
    const TagName = node.headerState > 0 ? 'th' : 'td'
    const style = { backgroundColor: node.backgroundColor || undefined, border: '1px solid #ccc', padding: '8px' }
    const colSpan = node.colSpan && node.colSpan > 1 ? node.colSpan : undefined
    const rowSpan = node.rowSpan && node.rowSpan > 1 ? node.rowSpan : undefined
    return (
      <TagName
        className={`lexical-table-cell lexical-table-cell-header-${node.headerState}`}
        colSpan={colSpan}
        rowSpan={rowSpan}
        style={style}
      >
        {children}
      </TagName>
    )
  },
  tablerow: ({ node, nodesToJSX }: ConverterArgs) => (
    <tr className="lexical-table-row">{nodesToJSX({ nodes: node.children })}</tr>
  ),
  heading: ({ node, nodesToJSX }: ConverterArgs) => {
    const NodeTag = (ALLOWED_HEADING_TAGS.has(node.tag) ? node.tag : 'h1') as 'h1'
    return <NodeTag>{nodesToJSX({ nodes: node.children })}</NodeTag>
  },
  horizontalrule: <hr />,
  list: ({ node, nodesToJSX }: ConverterArgs) => {
    const NodeTag = (ALLOWED_LIST_TAGS.has(node.tag) ? node.tag : 'ul') as 'ul'
    return <NodeTag className={`list-${node?.listType}`}>{nodesToJSX({ nodes: node.children })}</NodeTag>
  },
  listitem: ({ node, nodesToJSX, parent }: ConverterArgs) => {
    const hasSubLists = node.children.some((child: LexicalNode) => child.type === 'list')
    const children = nodesToJSX({ nodes: node.children })
    if ('listType' in parent && parent?.listType === 'check') {
      const uuid = randomUUID()
      return (
        <li
          aria-checked={node.checked ? 'true' : 'false'}
          className={`list-item-checkbox${node.checked ? ' list-item-checkbox-checked' : ' list-item-checkbox-unchecked'}${hasSubLists ? ' nestedListItem' : ''}`}
          role="checkbox"
          style={{ listStyleType: 'none' }}
          tabIndex={-1}
          value={node?.value}
        >
          {hasSubLists ? (
            children
          ) : (
            <>
              <input checked={node.checked} id={uuid} readOnly type="checkbox" />
              <label htmlFor={uuid}>{children}</label>
              <br />
            </>
          )}
        </li>
      )
    }
    return (
      <li
        className={`${hasSubLists ? 'nestedListItem' : ''}`}
        style={hasSubLists ? { listStyleType: 'none' } : undefined}
        value={node?.value}
      >
        {children}
      </li>
    )
  },
  autolink: ({ node, nodesToJSX }: ConverterArgs) => {
    const rel = node.fields.newTab ? 'noopener noreferrer' : undefined
    const target = node.fields.newTab ? '_blank' : undefined
    return (
      <a href={node.fields.url} rel={rel} target={target}>
        {nodesToJSX({ nodes: node.children })}
      </a>
    )
  },
  link: ({ node, nodesToJSX }: ConverterArgs) => {
    const rel = node.fields.newTab ? 'noopener noreferrer' : undefined
    const target = node.fields.newTab ? '_blank' : undefined
    let href = node.fields.url ?? ''
    if (node.fields.linkType === 'internal') {
      // Same fallback the Payload converter used when no internalDocToHref is configured.
      console.error('Lexical => JSX converter: Link converter: found internal link, but internalDocToHref is not provided')
      href = '#'
    }
    return (
      <a href={href} rel={rel} target={target}>
        {nodesToJSX({ nodes: node.children })}
      </a>
    )
  },
  upload: ({ node }: ConverterArgs) => {
    if (typeof node.value !== 'object' || !node.value) return null
    const uploadDoc = node.value
    const alt = node.fields?.alt || uploadDoc?.alt || ''
    const url = uploadDoc.url
    if (!uploadDoc.mimeType?.startsWith('image')) {
      return (
        <a href={url} rel="noopener noreferrer">
          {uploadDoc.filename}
        </a>
      )
    }
    if (!uploadDoc.sizes || !Object.keys(uploadDoc.sizes).length) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img alt={alt} height={uploadDoc.height} src={url} width={uploadDoc.width} />
    }
    const pictureJSX: React.ReactNode[] = []
    for (const size in uploadDoc.sizes) {
      const imageSize = uploadDoc.sizes[size]
      if (
        !imageSize ||
        !imageSize.width ||
        !imageSize.height ||
        !imageSize.mimeType ||
        !imageSize.filesize ||
        !imageSize.filename ||
        !imageSize.url
      ) {
        continue
      }
      pictureJSX.push(
        <source key={size} media={`(max-width: ${imageSize.width}px)`} srcSet={imageSize.url} type={imageSize.mimeType} />,
      )
    }
    pictureJSX.push(
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} height={uploadDoc?.height} key="image" src={url} width={uploadDoc?.width} />,
    )
    return <picture>{pictureJSX}</picture>
  },
  tab: '\t',
}

/** True when the editor state holds something other than a single empty paragraph. */
export function hasText(value: SerializedEditorState | null | undefined): boolean {
  const children = value?.root?.children
  if (!children?.length) return false
  if (children.length === 1 && children[0]?.type === 'paragraph') {
    const paragraph = children[0]
    if (!paragraph?.children || paragraph.children.length === 0) return false
    if (paragraph.children.length === 1) {
      const child = paragraph.children[0]
      if (child?.type === 'text' && !child?.text?.length) return false
    }
  }
  return true
}

function convertNodes({
  converters,
  nodes,
  parent,
}: {
  converters: JSXConverters
  nodes: LexicalNode[]
  parent: LexicalNode
}): React.ReactNode[] {
  const unknownConverter = converters.unknown as Converter | undefined
  const blockConverters = converters.blocks as Record<string, ConverterFn> | undefined
  const inlineBlockConverters = converters.inlineBlocks as Record<string, ConverterFn> | undefined
  const jsxArray = nodes.map((node, i) => {
    let converterForNode: Converter | undefined
    if (node.type === 'block') {
      converterForNode = blockConverters?.[node?.fields?.blockType]
      if (!converterForNode && !unknownConverter) {
        console.error(`Lexical => JSX converter: Blocks converter: found ${node?.fields?.blockType} block, but no converter is provided`)
      }
    } else if (node.type === 'inlineBlock') {
      converterForNode = inlineBlockConverters?.[node?.fields?.blockType]
      if (!converterForNode && !unknownConverter) {
        console.error(
          `Lexical => JSX converter: Inline Blocks converter: found ${node?.fields?.blockType} inline block, but no converter is provided`,
        )
      }
    } else {
      converterForNode = converters[node.type] as Converter | undefined
    }

    try {
      if (!converterForNode && unknownConverter) converterForNode = unknownConverter

      let reactNode: React.ReactNode
      if (converterForNode) {
        reactNode =
          typeof converterForNode === 'function'
            ? converterForNode({
                childIndex: i,
                converters,
                node,
                nodesToJSX: (args) =>
                  convertNodes({
                    converters: args.converters ?? converters,
                    nodes: args.nodes,
                    parent: args.parent ?? { ...node, parent },
                  }),
                parent,
              })
            : converterForNode
      } else {
        reactNode = <span key={i}>unknown node</span>
      }

      const style: React.CSSProperties = {}
      if ('format' in node && node.format) {
        switch (node.format) {
          case 'center':
            style.textAlign = 'center'
            break
          case 'end':
          case 'right':
            style.textAlign = 'right'
            break
          case 'justify':
            style.textAlign = 'justify'
            break
          case 'start':
            style.textAlign = 'left'
            break
        }
      }
      if ('indent' in node && node.indent && node.type !== 'listitem') {
        // 40px per level, matching the editor.
        style.paddingInlineStart = `${Number(node.indent) * 40}px`
      }

      if (React.isValidElement(reactNode)) {
        if (style.textAlign || style.paddingInlineStart) {
          const props = reactNode.props as { style?: React.CSSProperties }
          return React.cloneElement(reactNode as React.ReactElement<{ style?: React.CSSProperties }>, {
            key: i,
            style: { ...style, ...(props?.style ?? {}) },
          })
        }
        return React.cloneElement(reactNode, { key: i })
      }
      return reactNode
    } catch (error) {
      console.error('Error converting lexical node to JSX:', error, 'node:', node)
      return null
    }
  })
  return jsxArray.filter(Boolean)
}

export function RichText({
  className,
  converters,
  data,
}: {
  className?: string
  converters?: JSXConverters | JSXConvertersFunction
  data: SerializedEditorState | null | undefined
}) {
  if (!data) return null

  const finalConverters =
    typeof converters === 'function'
      ? converters({ defaultConverters: defaultJSXConverters })
      : (converters ?? defaultJSXConverters)

  const content =
    typeof data === 'object' && !Array.isArray(data) && 'root' in data ? (
      hasText(data) ? (
        convertNodes({ converters: finalConverters, nodes: data.root.children, parent: data.root })
      ) : (
        <></>
      )
    ) : (
      false
    )

  return <div className={className ?? 'payload-richtext'}>{content}</div>
}
