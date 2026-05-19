/**
 * Force-loads every (font-family, font-weight) combination that's
 * actually rendered inside a given DOM root.
 *
 * Why this exists:
 *   Google Fonts ship each weight as a separate woff2 file. The CSS
 *   <link> in app/layout.tsx declares the families, but the browser
 *   only downloads weights it has seen needed. A slide template can
 *   reference "Anton Black 900" — but if no glyph on the current page
 *   has used that weight yet, the file isn't fetched, and html2canvas
 *   snapshots fall back to a generic sans on that weight.
 *
 *   document.fonts.ready resolves once already-requested fonts finish,
 *   but says nothing about fonts not yet requested. document.fonts.load()
 *   forces a request and resolves when ready — that's what we need.
 *
 * Returns once every needed font is cached, or after a 4s timeout (a
 * stalled font shouldn't block the whole export forever).
 */
export async function ensureFontsLoaded(root: HTMLElement): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return

  const specs = collectFontSpecs(root)
  if (specs.length === 0) return

  await Promise.race([
    Promise.all(
      specs.map(spec =>
        document.fonts.load(spec).catch(() => { /* missing/unknown — ignore */ })
      )
    ),
    new Promise<void>(resolve => setTimeout(resolve, 4000)),
  ])
  // Belt-and-suspenders: wait for any straggler font request.
  try { await document.fonts.ready } catch { /* ignore */ }
}

/**
 * Walks the element tree under `root` and collects unique
 * `${weight} 16px "family"` specs that document.fonts.load() can
 * consume. Uses computed style so it captures whatever the cascade
 * actually applied (inline + class + autofit override).
 */
function collectFontSpecs(root: HTMLElement): string[] {
  const seen = new Set<string>()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  // Include the root itself.
  let node: HTMLElement | null = root
  while (node) {
    const cs = window.getComputedStyle(node)
    const family = parseFirstFamily(cs.fontFamily)
    const weight = (cs.fontWeight || '400').toString()
    if (family) {
      // The size doesn't matter for FontFace matching, but the call
      // signature requires one.
      seen.add(`${weight} 16px "${family}"`)
    }
    node = walker.nextNode() as HTMLElement | null
  }
  return Array.from(seen)
}

function parseFirstFamily(fontFamily: string): string | null {
  if (!fontFamily) return null
  // Take the first entry of the comma-separated list, strip quotes,
  // skip generic keywords.
  const first = fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
  if (!first) return null
  if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-(?:serif|sans-serif|monospace|rounded))$/i.test(first)) {
    return null
  }
  return first
}
