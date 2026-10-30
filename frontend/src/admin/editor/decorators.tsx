'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey } from 'lexical'
import { useEffect, useState } from 'react'

import { assetPreview, getDoc, type AdminDoc } from '../api'
import { FieldList } from '../fields'
import { blockDef } from './blocks'
import type { BlockFields, BlockNode, UploadData, UploadNode } from './nodes'

/** Editable card for a content block inside the editor. */
export function BlockCard({ nodeKey, fields }: { nodeKey: string; fields: BlockFields }) {
  const [editor] = useLexicalComposerContext()
  const def = blockDef(fields.blockType)
  const [open, setOpen] = useState(false)
  const editable = editor.isEditable()

  const update = (name: string, value: unknown) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey) as BlockNode | null
      node?.setFields({ ...node.getFields(), [name]: value })
    })
  }
  const remove = () =>
    editor.update(() => {
      $getNodeByKey(nodeKey)?.remove()
    })

  return (
    <div className="wpa-block-card" contentEditable={false} data-lexical-decorator="true">
      <div className="wpa-block-card__head">
        <span>▣ {def?.label ?? fields.blockType}</span>
        {editable && (
          <div>
            <button type="button" className="wpa-btn" onClick={() => setOpen((o) => !o)}>
              {open ? 'Done' : 'Edit'}
            </button>
            <button type="button" className="wpa-btn wpa-btn--danger" onClick={remove}>
              Remove
            </button>
          </div>
        )}
      </div>
      {open && def ? (
        <div className="wpa-block-card__form">
          <FieldList fields={def.fields} values={fields} onChange={update} />
        </div>
      ) : (
        <div className="wpa-block-card__summary">{def ? def.summary(fields) : 'This block type is not editable here; it is kept as is.'}</div>
      )}
    </div>
  )
}

/** Image (or file) placed in the article body. */
export function UploadPreview({ nodeKey, data }: { nodeKey: string; data: UploadData }) {
  const [editor] = useLexicalComposerContext()
  const populated = data.value && typeof data.value === 'object' ? (data.value as AdminDoc) : null
  const [asset, setAsset] = useState<AdminDoc | null>(populated)
  const id = populated ? populated.id : typeof data.value === 'string' ? data.value : null

  useEffect(() => {
    if (asset || !id) return
    getDoc('assets', id)
      .then(setAsset)
      .catch(() => setAsset(null))
  }, [asset, id])

  const preview = assetPreview(asset)
  return (
    <div className="wpa-upload-node" contentEditable={false}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview ? <img src={asset?.filename ? `/api/admin/media/file/${encodeURIComponent(asset.filename)}` : preview} alt={asset?.alt ?? ''} /> : <p className="wpa-mono">{asset?.filename ?? id ?? 'Missing file'}</p>}
      {asset && asset.rightsStatus !== 'cleared' && <p className="wpa-field__help">Rights “{asset.rightsStatus}”: hidden on the public site until cleared.</p>}
      {editor.isEditable() && (
        <p>
          <button
            type="button"
            className="wpa-link-danger"
            onClick={() =>
              editor.update(() => {
                ;($getNodeByKey(nodeKey) as UploadNode | null)?.remove()
              })
            }
          >
            Remove image
          </button>
        </p>
      )}
    </div>
  )
}
