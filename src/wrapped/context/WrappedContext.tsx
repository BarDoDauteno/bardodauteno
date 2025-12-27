import React, { createContext, useContext, useState, useEffect, useRef } from 'react'

/* ===== Tipos ===== */

export type WinrateProgressPoint = {
  match_index: number
  winrate_progress: number
}

export type MatchPositionPoint = {
  match_index: number
  position: 1 | 2
}

export type WrappedData = {
  playerId: string
  year: number
  hooks: {
    base: any
    aura: any
    monthly: any
    personas: any
    streaks: any
    victoryTypes: any
    duos: any
    duels: any
    rivalries: any
    rankings: any
    comparisons: any
    dates: any
    winrateProgress: WinrateProgressPoint[]
    matchPositions: MatchPositionPoint[]
    graphs: any
  }
}

interface WrappedContextType {
  data: WrappedData | null
  currentIndex: number
  isPaused: boolean
  progress: number
  totalSlides: number
  nextSlide: () => void
  prevSlide: () => void
  setPaused: (v: boolean) => void
  setTotalSlides: (n: number) => void
}

const WrappedContext = createContext<WrappedContextType | undefined>(undefined)

export const useWrapped = () => {
  const ctx = useContext(WrappedContext)
  if (!ctx) throw new Error('useWrapped must be used within WrappedProvider')
  return ctx
}

/* ===== Provider ===== */

const SLIDE_DURATION = 5000 // 5s igual Instagram

export const WrappedProvider: React.FC<{
  data: WrappedData
  children: React.ReactNode
}> = ({ data, children }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [totalSlides, setTotalSlides] = useState(0)

  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const startProgressRef = useRef<number>(0)

  /* ===== Progresso tipo Instagram ===== */

  useEffect(() => {
    if (isPaused || totalSlides === 0) return

    startTimeRef.current = Date.now()
    startProgressRef.current = progress

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current
      const pct =
        startProgressRef.current +
        (elapsed / SLIDE_DURATION) * 100

      if (pct >= 100) {
        setProgress(100)
        cancelAnimationFrame(rafRef.current!)

        if (currentIndex < totalSlides - 1) {
          setCurrentIndex(i => i + 1)
          setProgress(0)
        } else {
          setIsPaused(true)
        }
        return
      }

      setProgress(pct)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [currentIndex, isPaused, totalSlides])

  /* ===== Navegação ===== */

  const nextSlide = () => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(i => i + 1)
      setProgress(0)
      setIsPaused(false)
    } else {
      setIsPaused(true)
      setProgress(100)
    }
  }

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
      setProgress(0)
      setIsPaused(false)
    }
  }

  return (
    <WrappedContext.Provider
      value={{
        data,
        currentIndex,
        isPaused,
        progress,
        totalSlides,
        nextSlide,
        prevSlide,
        setPaused: setIsPaused,
        setTotalSlides,
      }}
    >
      {children}
    </WrappedContext.Provider>
  )
}
