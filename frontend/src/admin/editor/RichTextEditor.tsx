'use client'

import { $isListNode, INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode, REMOVE_LIST_COMMAND } from '@lexical/list'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { HorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode, HeadingNode, QuoteNode, type HeadingTagType } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { INSERT_TABLE_COMMAND, TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils'
import {
  $createParagraphNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_MODIFIER_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type BaseSelection,
  type EditorState,
  type ElementFormatType,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { MediaPicker } from '../MediaLibrary'
import { EDITOR_BLOCKS } from './blocks'
import { $createBlockNode, $createUploadNode, $selectedLink, $toggleLink, BlockNode, PayloadAutoLinkNode, PayloadLinkNode, UploadNode } from './nodes'

const theme = {
  paragraph: '',
  quote: '',
  link: '',
  list: { ul: '', ol: '', checklist: 'lx-checklist', listitem: '', listitemChecked: 'lx-check lx-check--checked', listitemUnchecked: 'lx-check', nested: { listitem: 'lx-nested' } },
  text: { bold: 'lx-bold', italic: 'lx-italic', underline: 'lx-underline', strikethrough: 'lx-strike', underlineStrikethrough: 'lx-underline lx-strike', code: '', subscript: 'lx-sub', superscript: 'lx-sup' },
}

/** True when the stored value looks like a Lexical editor state. */
function isEditorState(value: unknown): value is { root: unknown } {
  return Boolean(value && typeof value === 'object' && 'root' in (value as object) && (value as { root?: { children?: unknown[] } }).root?.children)
}

export function RichTextEditor({ value, onChange, readOnly }: { value: unknown; onChange: (value: unknown) => void; readOnly?: boolean }) {
  const [loadError, setLoadError] = useState<string | null>(null)

  const initialConfig = useMemo<InitialConfigType>(
    () => ({
      namespace: 'tkg-admin',
      theme,
      editable: !readOnly,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, HorizontalRuleNode, TableNode, TableRowNode, TableCellNode, PayloadLinkNode, PayloadAutoLinkNode, UploadNode, BlockNode],
      editorState: isEditorState(value)
        ? (editor: LexicalEditor) => {
            try {
              editor.setEditorState(editor.parseEditorState(JSON.stringify(value)))
            } catch (error) {
              console.error('Could not load the stored content into the editor', error)
              setLoadError('Some of this content could not be loaded into the editor. Saving now would overwrite it — reload or contact a developer.')
            }
          }
        : undefined,
      onError: (error: Error) => console.error(error),
    }),
    // The initial value only seeds the editor; later changes flow out through onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="wpa-editor">
      {loadError && <div className="wpa-notice wpa-notice--error">{loadError}</div>}
      <LexicalComposer initialConfig={initialConfig}>
        {!readOnly && <Toolbar />}
        <div className="wpa-editor__surface">
          <RichTextPlugin
            contentEditable={<ContentEditable className="wpa-editor__content" aria-label="Content" />}
            placeholder={<div className="wpa-editor__placeholder">Type / write your content here…</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <HorizontalRulePlugin />
        <TablePlugin />
        <OnChangePlugin
          ignoreSelectionChange
          onChange={(state: EditorState) => {
            if (!loadError) onChange(state.toJSON())
          }}
        />
      </LexicalComposer>
    </div>
  )
}

type BlockType = 'paragraph' | HeadingTagType | 'quote' | 'bullet' | 'number' | 'check'

function Toolbar() {
  const [editor] = useLexicalComposerContext()
  const [blockType, setBlockType] = useState<BlockType>('paragraph')
  const [formats, setFormats] = useState<Record<string, boolean>>({})
  const [isLink, setIsLink] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [picker, setPicker] = useState(false)
  const [linkDraft, setLinkDraft] = useState<{ url: string; newTab: boolean; selection: BaseSelection | null; existing: boolean } | null>(null)
  const [currentLink, setCurrentLink] = useState<{ url: string; newTab: boolean } | null>(null)

  const refresh = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return
    const anchor = selection.anchor.getNode()
    let element = anchor.getKey() === 'root' ? anchor : $findMatchingParent(anchor, (e) => {
      const parent = e.getParent()
      return parent !== null && $isRootOrShadowRoot(parent)
    })
    if (element === null) element = anchor.getTopLevelElementOrThrow()
    if ($isListNode(element)) {
      const parentList = $getNearestNodeOfType(anchor, ListNode)
      const type = (parentList ?? element).getListType()
      setBlockType(type === 'number' ? 'number' : type === 'check' ? 'check' : 'bullet')
    } else if ($isHeadingNode(element)) setBlockType(element.getTag())
    else if ($isQuoteNode(element)) setBlockType('quote')
    else setBlockType('paragraph')
    setFormats({
      bold: selection.hasFormat('bold'),
      italic: selection.hasFormat('italic'),
      underline: selection.hasFormat('underline'),
      strikethrough: selection.hasFormat('strikethrough'),
      code: selection.hasFormat('code'),
      superscript: selection.hasFormat('superscript'),
      subscript: selection.hasFormat('subscript'),
    })
    const linkNode = $selectedLink()
    setIsLink(linkNode !== null)
    setCurrentLink(linkNode ? { url: linkNode.getFields().url ?? '', newTab: Boolean(linkNode.getFields().newTab) } : null)
  }, [])

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => editorState.read(refresh)),
        editor.registerCommand(SELECTION_CHANGE_COMMAND, () => (refresh(), false), COMMAND_PRIORITY_LOW),
        editor.registerCommand(CAN_UNDO_COMMAND, (v) => (setCanUndo(v), false), COMMAND_PRIORITY_LOW),
        editor.registerCommand(CAN_REDO_COMMAND, (v) => (setCanRedo(v), false), COMMAND_PRIORITY_LOW),
      ),
    [editor, refresh],
  )

  const setBlock = (type: BlockType) => {
    if (type === 'bullet') return editor.dispatchCommand(blockType === 'bullet' ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND, undefined)
    if (type === 'number') return editor.dispatchCommand(blockType === 'number' ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)
    if (type === 'check') return editor.dispatchCommand(blockType === 'check' ? REMOVE_LIST_COMMAND : INSERT_CHECK_LIST_COMMAND, undefined)
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      if (type === 'paragraph') $setBlocksType(selection, () => $createParagraphNode())
      else if (type === 'quote') $setBlocksType(selection, () => $createQuoteNode())
      else $setBlocksType(selection, () => $createHeadingNode(type))
    })
  }

  const text = (format: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  const align = (format: ElementFormatType) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format)

  /** Opens the inline link editor, remembering the selection it applies to. */
  const link = useCallback(() => {
    editor.getEditorState().read(() => {
      const node = $selectedLink()
      const selection = $getSelection()
      setLinkDraft({
        url: node?.getFields().url ?? '',
        newTab: Boolean(node?.getFields().newTab),
        selection: selection ? selection.clone() : null,
        existing: node !== null,
      })
    })
  }, [editor])

  const applyLink = (fields: { url: string; newTab: boolean } | null) => {
    const draft = linkDraft
    setLinkDraft(null)
    editor.update(() => {
      if (draft?.selection) $setSelection(draft.selection.clone())
      $toggleLink(fields ? { linkType: 'custom', url: fields.url, newTab: fields.newTab } : null)
    })
    editor.focus()
  }

  // Ctrl/Cmd+K opens the link editor, as in WordPress.
  useEffect(
    () =>
      editor.registerCommand(
        KEY_MODIFIER_COMMAND,
        (event: KeyboardEvent) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault()
            link()
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor, link],
  )

  const insertBlock = (slug: string) => {
    const def = EDITOR_BLOCKS.find((b) => b.slug === slug)
    if (!def) return
    editor.update(() => {
      $insertNodes([$createBlockNode({ blockType: slug, ...structuredClone(def.defaults) })])
    })
  }

  const btn = (label: string, onClick: () => void, active = false, title = label, disabled = false) => (
    <button type="button" disabled={disabled} className={active ? 'is-active' : ''} onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title} aria-label={title} aria-pressed={active}>
      {label}
    </button>
  )

  return (
    <div className="wpa-editor__toolbar" role="toolbar" aria-label="Formatting">
      {btn('↶', () => editor.dispatchCommand(UNDO_COMMAND, undefined), false, 'Undo', !canUndo)}
      {btn('↷', () => editor.dispatchCommand(REDO_COMMAND, undefined), false, 'Redo', !canRedo)}
      <span className="wpa-editor__sep" />
      <select value={['bullet', 'number', 'check'].includes(blockType) ? 'paragraph' : blockType} onChange={(e) => setBlock(e.target.value as BlockType)} aria-label="Block type">
        <option value="paragraph">Paragraph</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
        <option value="h1">Heading 1</option>
        <option value="h5">Heading 5</option>
        <option value="h6">Heading 6</option>
        <option value="quote">Quote</option>
      </select>
      <span className="wpa-editor__sep" />
      {btn('B', () => text('bold'), formats.bold, 'Bold (Ctrl+B)')}
      {btn('I', () => text('italic'), formats.italic, 'Italic (Ctrl+I)')}
      {btn('U', () => text('underline'), formats.underline, 'Underline (Ctrl+U)')}
      {btn('S', () => text('strikethrough'), formats.strikethrough, 'Strikethrough')}
      {btn('</>', () => text('code'), formats.code, 'Inline code')}
      {btn('x²', () => text('superscript'), formats.superscript, 'Superscript')}
      {btn('🔗', link, isLink, isLink ? 'Edit link' : 'Insert link')}
      <span className="wpa-editor__sep" />
      {btn('• List', () => setBlock('bullet'), blockType === 'bullet', 'Bulleted list')}
      {btn('1. List', () => setBlock('number'), blockType === 'number', 'Numbered list')}
      {btn('☑', () => setBlock('check'), blockType === 'check', 'Checklist')}
      {btn('❝', () => setBlock('quote'), blockType === 'quote', 'Quote')}
      <span className="wpa-editor__sep" />
      {btn('⯇', () => align('left'), false, 'Align left')}
      {btn('≡', () => align('center'), false, 'Align center')}
      {btn('⯈', () => align('right'), false, 'Align right')}
      {btn('☰', () => align('justify'), false, 'Justify')}
      <span className="wpa-editor__sep" />
      {btn('― HR', () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined), false, 'Horizontal line')}
      {btn('▦ Table', () => editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '3', rows: '3', includeHeaders: true }), false, 'Insert table')}
      {btn('🖼 Add Media', () => setPicker(true), false, 'Add image or file')}
      <select value="" onChange={(e) => insertBlock(e.target.value)} aria-label="Insert block">
        <option value="">+ Insert block…</option>
        {EDITOR_BLOCKS.map((b) => (
          <option key={b.slug} value={b.slug}>
            {b.label}
          </option>
        ))}
      </select>
      {linkDraft ? (
        <LinkEditor
          initial={linkDraft}
          onApply={(fields) => applyLink(fields)}
          onRemove={linkDraft.existing ? () => applyLink(null) : undefined}
          onCancel={() => {
            setLinkDraft(null)
            editor.focus()
          }}
        />
      ) : (
        currentLink && (
          <div className="wpa-linkbar" role="status">
            <span className="wpa-linkbar__url" title={currentLink.url}>
              🔗 {currentLink.url || '(no URL)'} {currentLink.newTab && <em className="wpa-muted">(new tab)</em>}
            </span>
            <button type="button" className="wpa-btn" onMouseDown={(e) => e.preventDefault()} onClick={link}>
              Edit
            </button>
            <button
              type="button"
              className="wpa-link-danger"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.update(() => {
                  const node = $selectedLink()
                  if (!node) return
                  node.getChildren().forEach((child) => node.insertBefore(child))
                  node.remove()
                })
              }}
            >
              Remove link
            </button>
          </div>
        )
      )}
      {picker && (
        <MediaPicker
          title="Add media"
          onClose={() => setPicker(false)}
          onSelect={(asset) => {
            setPicker(false)
            editor.update(() => {
              $insertNodes([$createUploadNode({ relationTo: 'assets', value: asset.id, fields: null })])
            })
          }}
        />
      )}
    </div>
  )
}

/** Inline link editor shown under the toolbar (WordPress-style), instead of a browser prompt. */
function LinkEditor({
  initial,
  onApply,
  onRemove,
  onCancel,
}: {
  initial: { url: string; newTab: boolean; existing: boolean }
  onApply: (fields: { url: string; newTab: boolean }) => void
  onRemove?: () => void
  onCancel: () => void
}) {
  const [url, setUrl] = useState(initial.url)
  const [newTab, setNewTab] = useState(initial.newTab)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    let value = url.trim()
    if (!value) return setError('Enter a URL, or press Remove to unlink.')
    // Bare domains become https links; site paths, anchors, mailto: and tel: stay as typed.
    if (!/^(https?:|mailto:|tel:|\/|#)/i.test(value)) value = `https://${value}`
    try {
      new URL(value, 'https://example.invalid')
    } catch {
      return setError('That does not look like a valid link.')
    }
    onApply({ url: value, newTab })
  }

  return (
    <div className="wpa-linkbar wpa-linkbar--edit" role="dialog" aria-label={initial.existing ? 'Edit link' : 'Insert link'}>
      <input
        type="text"
        autoFocus
        placeholder="Paste URL or type /path, mailto:, tel:"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value)
          setError(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
        aria-label="Link URL"
      />
      <label className="wpa-checkbox">
        <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} /> Open in new tab
      </label>
      <button type="button" className="wpa-btn wpa-btn--primary" onClick={submit}>
        {initial.existing ? 'Update' : 'Apply'}
      </button>
      {onRemove && (
        <button type="button" className="wpa-link-danger" onClick={onRemove}>
          Remove
        </button>
      )}
      <button type="button" className="wpa-btn" onClick={onCancel}>
        Cancel
      </button>
      {error && <span className="wpa-linkbar__error">{error}</span>}
    </div>
  )
}

