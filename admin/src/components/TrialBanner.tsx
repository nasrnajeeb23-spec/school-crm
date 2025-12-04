import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppContext } from '../contexts/AppContext'
import { getSubscriptionState, SubscriptionState } from '../api'

export default function TrialBanner() {
  const { currentUser } = useAppContext()
  const [state, setState] = useState<SubscriptionState | null>(null)
  const [visible, setVisible] = useState(true)
  const location = useLocation()

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const sid = Number((currentUser as any)?.schoolId || 0)
        if (!currentUser || !sid) return
        const s = await getSubscriptionState(sid)
        if (!mounted) return
        setState(s)
      } catch {}
    }
    load()
    return () => { mounted = false }
  }, [currentUser])

  if (!visible) return null
  const path = location?.pathname || ''
  const onSchoolPages = path.startsWith('/school')
  const isSchoolAdmin = !!currentUser && String(currentUser.role).toUpperCase() === 'SCHOOL_ADMIN'
  const trialExpired = !!state?.subscription?.trialExpired
  if (!onSchoolPages || !isSchoolAdmin || !trialExpired) return null

  return (
    <div className="mb-4">
      <div className="rounded-lg border border-amber-300 bg-amber-100 text-amber-900 shadow">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="font-bold">انتهت فترة التجربة لهذه المدرسة</div>
            <div className="text-sm">فعّل اشتراكك واختر الوحدات التي تحتاجها للاستمرار. الوحدات غير المفعّلة ستبقى مقيدة.</div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/school/modules" className="px-3 py-2 rounded bg-amber-600 text-white">إدارة الوحدات</a>
            <button onClick={() => setVisible(false)} className="px-3 py-2 rounded border border-amber-400 bg-white text-amber-800">إخفاء</button>
          </div>
        </div>
      </div>
    </div>
  )
}
