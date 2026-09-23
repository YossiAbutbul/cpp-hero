/**
 * Copy text: the async Clipboard API when allowed, else a hidden textarea +
 * execCommand('copy') (older browsers, sandboxed iframes). Resolves true on success.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
    const host = document.getElementById('overlay-root') ?? document.body;
    host.appendChild(ta);
    const prev = document.activeElement as HTMLElement | null;
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    prev?.focus?.();
    return ok;
  } catch {
    return false;
  }
}
