import React, { useEffect, useMemo, useState } from 'react'

type Tip = { selector: string; title: string; content: string; position: 'top' | 'bottom' | 'left' | 'right' }

function getRouteKey(): string {
  const p = window.location.pathname.toLowerCase()
  if (p.includes('/help-center')) return 'help-center'
  if (p.includes('/school') && p.includes('/settings')) return 'school-settings'
  if (p.includes('/teachers')) return 'teachers'
  if (p.includes('/classes')) return 'classes'
  if (p.includes('/students')) return 'students'
  if (p.includes('/finance')) return 'finance'
  if (p.includes('/attendance')) return 'attendance'
  if (p.includes('/messaging')) return 'messaging'
  if (p.includes('/analytics') || p.includes('/dashboard')) return 'analytics'
  return 'dashboard'
}

export default function TooltipGuide() {
  const [open, setOpen] = useState(false)
  const [tips, setTips] = useState<Tip[]>([])
  const [idx, setIdx] = useState(0)
  const current = useMemo(() => (tips.length > 0 ? tips[idx] : null), [tips, idx])

  useEffect(() => {
    if (!open) return
    const routeKey = getRouteKey()
    const base = (typeof process !== 'undefined' && (process as any).env && (process as any).env.REACT_APP_API_URL) || '/api'
    fetch(`${base.replace(/\/$/, '')}/help/tooltips?route=${encodeURIComponent(routeKey)}`)
      .then(r => r.json())
      .then(j => setTips(Array.isArray(j.tooltips) ? j.tooltips : []))
      .catch(() => setTips([]))
  }, [open])

  useEffect(() => {
    if (!open || !current) return
    const el = document.querySelector(current.selector) as HTMLElement | null
    if (!el) return
    const rect = el.getBoundingClientRect()
    const bubble = document.getElementById('ttg-bubble')
    const mask = document.getElementById('ttg-mask')
    if (bubble) {
      const x = rect.left + window.scrollX
      const y = rect.top + window.scrollY
      const bw = bubble.offsetWidth
      const bh = bubble.offsetHeight
      let top = y
      let left = x
      if (current.position === 'bottom') top = y + rect.height + 8
      if (current.position === 'top') top = Math.max(0, y - bh - 8)
      if (current.position === 'right') left = x + rect.width + 8
      if (current.position === 'left') left = Math.max(0, x - bw - 8)
      bubble.style.top = `${top}px`
      bubble.style.left = `${left}px`
    }
    if (mask) {
      mask.style.display = 'block'
    }
  }, [open, current])

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setIdx(0) }}
        style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 10000, padding: '10px 14px', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none' }}
      >
        تعليم الواجهة
      </button>
    )
  }

  const has = !!current

  return (
    <div>
      <div id="ttg-mask" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} />
      <div id="ttg-bubble" style={{ position: 'absolute', zIndex: 9999, maxWidth: 360, background: '#fff', color: '#111', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{has ? current!.title : 'لا توجد تلميحات'}</div>
        <div style={{ marginBottom: 12 }}>{has ? current!.content : 'أضف محددات data-tip للعناصر المطلوبة.'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setOpen(false)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}>إغلاق</button>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}>السابق</button>
          <button onClick={() => setIdx(i => Math.min(tips.length - 1, i + 1))} disabled={idx >= tips.length - 1} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff' }}>التالي</button>
        </div>
      </div>
    </div>
  )
}
