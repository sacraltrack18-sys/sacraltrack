'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function YandexMetrika() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ym = (window as any).ym;
      if (typeof ym === 'function') {
        const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        ym(101742029, 'hit', url);
      }
    }
  }, [pathname, searchParams])

  return null
} 