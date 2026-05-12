"use client"

import { useEffect, useRef, useCallback } from "react"

interface Dot {
  x: number
  y: number
  targetOpacity: number
  currentOpacity: number
  opacitySpeed: number
  currentRadius: number
}

const DOT_SPACING = 25
const BASE_OPACITY_MIN = 0.35
const BASE_OPACITY_MAX = 0.50
const BASE_RADIUS = 1
const INTERACTION_RADIUS = 150
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS
const OPACITY_BOOST = 0.6
const RADIUS_BOOST = 2.5
const GRID_CELL_SIZE = 100

export function DotGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const dotsRef = useRef<Dot[]>([])
  const gridRef = useRef<Record<string, number[]>>({})
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null })

  const createDots = useCallback((width: number, height: number) => {
    const newDots: Dot[] = []
    const newGrid: Record<string, number[]> = {}
    const cols = Math.ceil(width / DOT_SPACING)
    const rows = Math.ceil(height / DOT_SPACING)

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * DOT_SPACING + DOT_SPACING / 2
        const y = j * DOT_SPACING + DOT_SPACING / 2
        const cellKey = `${Math.floor(x / GRID_CELL_SIZE)}_${Math.floor(y / GRID_CELL_SIZE)}`
        if (!newGrid[cellKey]) newGrid[cellKey] = []
        newGrid[cellKey].push(newDots.length)
        const op = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN
        newDots.push({
          x, y,
          targetOpacity: op,
          currentOpacity: op,
          opacitySpeed: Math.random() * 0.005 + 0.002,
          currentRadius: BASE_RADIUS,
        })
      }
    }
    dotsRef.current = newDots
    gridRef.current = newGrid
  }, [])

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w
    canvas.height = h
    createDots(w, h)
  }, [createDots])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !canvas) {
      rafRef.current = requestAnimationFrame(animate)
      return
    }

    const { width: w, height: h } = canvas
    const dots = dotsRef.current
    const grid = gridRef.current
    const { x: mx, y: my } = mouseRef.current

    ctx.clearRect(0, 0, w, h)

    const active = new Set<number>()
    if (mx !== null && my !== null) {
      const cx = Math.floor(mx / GRID_CELL_SIZE)
      const cy = Math.floor(my / GRID_CELL_SIZE)
      const sr = Math.ceil(INTERACTION_RADIUS / GRID_CELL_SIZE) + 1
      for (let i = -sr; i <= sr; i++) {
        for (let j = -sr; j <= sr; j++) {
          grid[`${cx + i}_${cy + j}`]?.forEach((idx) => active.add(idx))
        }
      }
    }

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i]
      if (!dot) continue

      dot.currentOpacity += dot.opacitySpeed
      if (dot.currentOpacity >= dot.targetOpacity || dot.currentOpacity <= BASE_OPACITY_MIN) {
        dot.opacitySpeed = -dot.opacitySpeed
        dot.currentOpacity = Math.max(BASE_OPACITY_MIN, Math.min(dot.currentOpacity, BASE_OPACITY_MAX))
        dot.targetOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN
      }

      let factor = 0
      dot.currentRadius = BASE_RADIUS

      if (mx !== null && my !== null && active.has(i)) {
        const dx = dot.x - mx
        const dy = dot.y - my
        const dSq = dx * dx + dy * dy
        if (dSq < INTERACTION_RADIUS_SQ) {
          const t = 1 - Math.sqrt(dSq) / INTERACTION_RADIUS
          factor = t * t
        }
      }

      const finalOpacity = Math.min(1, dot.currentOpacity + factor * OPACITY_BOOST)
      dot.currentRadius = BASE_RADIUS + factor * RADIUS_BOOST

      ctx.beginPath()
      ctx.fillStyle = `rgba(87,220,205,${finalOpacity.toFixed(3)})`
      ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    handleResize()

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseLeave = () => { mouseRef.current = { x: null, y: null } }

    window.addEventListener("mousemove", onMouseMove, { passive: true })
    window.addEventListener("resize", handleResize)
    document.documentElement.addEventListener("mouseleave", onMouseLeave)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("resize", handleResize)
      document.documentElement.removeEventListener("mouseleave", onMouseLeave)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [handleResize, animate])

  return (
    <>
      {/* Dot canvas — fixed, covers full viewport */}
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.75,
        }}
      />
      {/* Vignette gradient — same pattern as InteractiveHero */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(to bottom, transparent 0%, #171717 88%), radial-gradient(ellipse at center, transparent 40%, #171717 95%)",
        }}
      />
    </>
  )
}