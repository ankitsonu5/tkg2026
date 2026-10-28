'use client'

import Swal from 'sweetalert2'

/**
 * SweetAlert2 dialogs and toasts for the admin, styled to the brand (see admin-premium.css,
 * `.tkg-swal*`). Use these instead of window.confirm / alert.
 */

const base = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
  customClass: {
    popup: 'tkg-swal',
    title: 'tkg-swal__title',
    htmlContainer: 'tkg-swal__text',
    confirmButton: 'wpa-btn wpa-btn--primary wpa-btn--large',
    cancelButton: 'wpa-btn wpa-btn--large',
    actions: 'tkg-swal__actions',
  },
})

/** Ask before doing something. Resolves true when the user confirms. */
export async function confirmDialog(options: {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  icon?: 'warning' | 'question' | 'info'
}): Promise<boolean> {
  const result = await base.fire({
    title: options.title,
    text: options.text,
    icon: options.icon ?? (options.danger ? 'warning' : 'question'),
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Yes, continue',
    cancelButtonText: options.cancelText ?? 'Cancel',
    customClass: options.danger
      ? {
          popup: 'tkg-swal',
          title: 'tkg-swal__title',
          htmlContainer: 'tkg-swal__text',
          confirmButton: 'wpa-btn wpa-btn--large tkg-swal__danger',
          cancelButton: 'wpa-btn wpa-btn--large',
          actions: 'tkg-swal__actions',
        }
      : undefined,
  })
  return result.isConfirmed
}

/** Confirm a permanent delete. */
export function confirmDelete(what: string): Promise<boolean> {
  return confirmDialog({
    title: `Delete ${what}?`,
    text: 'This is permanent and cannot be undone.',
    confirmText: 'Yes, delete it',
    danger: true,
  })
}

const toaster = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  customClass: { popup: 'tkg-toast' },
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  },
})

/**
 * SweetAlert2's animated success icon draws the tick from two rotated lines, which in the small
 * toast renders as a slanted cross. A static SVG tick always reads as a check mark.
 */
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'

export function toast(title: string, icon: 'success' | 'error' | 'info' | 'warning' = 'success') {
  void toaster.fire({ icon, title, ...(icon === 'success' ? { iconHtml: CHECK_ICON, customClass: { popup: 'tkg-toast', icon: 'tkg-toast__check' } } : {}) })
}
