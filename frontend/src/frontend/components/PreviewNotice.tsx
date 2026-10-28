/**
 * Banner shown to staff while previewing through the admin (Draft Mode). Never rendered for
 * visitors. Uses the site's existing `.notice` styles.
 */
export function PreviewNotice({ path, draft }: { path: string; draft: boolean }) {
  return (
    <div className="container">
      <div className="notice">
        <p className="notice__title">{draft ? 'Draft preview' : 'Preview mode'}</p>
        <p>
          {draft ? 'You are viewing unpublished content. It is not visible to the public. ' : 'You are viewing the site as staff. '}
          <a href={`/admin/preview/exit?path=${encodeURIComponent(path)}`}>Exit preview</a>
        </p>
      </div>
    </div>
  )
}
