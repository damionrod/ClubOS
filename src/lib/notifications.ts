export type NoticeKind = 'success' | 'error' | 'info';

export function notify(message: string, kind: NoticeKind = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('clubos:notify', { detail: { message, kind } }));
}

export const notifySuccess = (message = 'Saved successfully.') => notify(message, 'success');
export const notifyError = (message = 'Something went wrong.') => notify(message, 'error');
export const notifyInfo = (message: string) => notify(message, 'info');
