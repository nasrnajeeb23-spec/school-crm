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
  if (!onSchoolPages || !isSchoolAdmin) return null

  // 1. Expired State
  if (state?.subscription?.trialExpired) {
    return (
      <div className="mb-4">
        <div className="rounded-lg border border-red-300 bg-red-100 text-red-900 shadow">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-bold">انتهت فترة التجربة لهذه المدرسة</div>
              <div className="text-sm">فعّل اشتراكك الآن لتجنب انقطاع الخدمة.</div>
            </div>
            <div className="flex items-center gap-2">
              <a href="/school/subscription-locked" className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors">تجديد الاشتراك</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 2. Countdown State (Less than 5 days remaining)
  const daysLeft = (state?.subscription?.daysLeft ?? undefined) as number | undefined
  if (daysLeft !== undefined && daysLeft <= 5 && daysLeft >= 0) {
    return (
      <div className="mb-4">
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 shadow">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>تنبيه: متبقي {daysLeft} أيام على انتهاء الفترة التجريبية</span>
              </div>
              <div className="text-sm mt-1">يرجى تجديد الاشتراك واختيار الخطة المناسبة لضمان استمرار عمل النظام دون توقف.</div>
            </div>
            <div className="flex items-center gap-2">
              <a href="/school/subscription-locked" className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors">تجديد الآن</a>
              <button onClick={() => setVisible(false)} className="px-3 py-2 rounded border border-amber-300 hover:bg-amber-100 text-amber-800 transition-colors">تذكير لاحقاً</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
