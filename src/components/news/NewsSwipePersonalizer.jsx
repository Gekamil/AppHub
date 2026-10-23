import { useState, useRef, useEffect, useCallback } from 'react'
import {
  FALLBACK_NEWS,
  getNewsPreferences,
  recordSwipe,
  resetNewsPreferences,
} from '../../services/newsService'

const SWIPE_THRESHOLD = 90

export default function NewsSwipePersonalizer({
  isOpen,
  onClose,
  articles = FALLBACK_NEWS,
  onPreferenceChange,
}) {
  const cards = Array.isArray(articles) && articles.length > 0 ? articles : FALLBACK_NEWS
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [exitDirection, setExitDirection] = useState(null)
  const [feedbackToast, setFeedbackToast] = useState(null)

  const dragStartRef = useRef({ x: 0, y: 0 })
  const activeCardRef = useRef(null)

  // Reset index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0)
      setDragOffset({ x: 0, y: 0 })
      setIsDragging(false)
      setExitDirection(null)
      setFeedbackToast(null)
    }
  }, [isOpen])

  // Clear feedback toast after 2.5s
  useEffect(() => {
    if (!feedbackToast) return
    const t = setTimeout(() => setFeedbackToast(null), 2500)
    return () => clearTimeout(t)
  }, [feedbackToast])

  const triggerSwipe = useCallback((direction) => {
    if (currentIndex >= cards.length) return
    const currentCard = cards[currentIndex]
    setExitDirection(direction)

    if (direction === 'right') {
      recordSwipe(currentCard.id, currentCard.categoryKey, 'like')
      setFeedbackToast(`Interés guardado: ${currentCard.category}`)
    } else {
      recordSwipe(currentCard.id, currentCard.categoryKey, 'dislike')
      setFeedbackToast(`Descartado: ${currentCard.category}`)
    }

    if (onPreferenceChange) {
      onPreferenceChange()
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1)
      setDragOffset({ x: 0, y: 0 })
      setExitDirection(null)
    }, 280)
  }, [cards, currentIndex, onPreferenceChange])

  const handlePointerDown = (e) => {
    if (exitDirection || currentIndex >= cards.length) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (err) {
      // Ignore if pointer capture fails on certain platforms
    }
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y
    setDragOffset({ x: deltaX, y: deltaY })
  }

  const handlePointerUp = (e) => {
    if (!isDragging) return
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch (err) {
      // Clean safe release
    }

    if (dragOffset.x > SWIPE_THRESHOLD) {
      triggerSwipe('right')
    } else if (dragOffset.x < -SWIPE_THRESHOLD) {
      triggerSwipe('left')
    } else {
      // Spring back to center
      setDragOffset({ x: 0, y: 0 })
    }
  }

  const handlePointerCancel = (e) => {
    if (!isDragging) return
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch (err) {}
    setDragOffset({ x: 0, y: 0 })
  }

  const handleApprove = () => {
    if (exitDirection || currentIndex >= cards.length) return
    triggerSwipe('right')
  }

  const handleReject = () => {
    if (exitDirection || currentIndex >= cards.length) return
    triggerSwipe('left')
  }

  const handleReset = () => {
    resetNewsPreferences()
    setCurrentIndex(0)
    setDragOffset({ x: 0, y: 0 })
    setExitDirection(null)
    setFeedbackToast('Preferencias restablecidas al estado neutro (1.0)')
    if (onPreferenceChange) {
      onPreferenceChange()
    }
  }

  if (!isOpen) return null

  const isCompleted = currentIndex >= cards.length
  const currentCard = !isCompleted ? cards[currentIndex] : null
  const nextCard = currentIndex + 1 < cards.length ? cards[currentIndex + 1] : null
  const thirdCard = currentIndex + 2 < cards.length ? cards[currentIndex + 2] : null

  // Dynamic stamp opacities and rotation
  const rotationDeg = dragOffset.x / 15
  const likeOpacity = Math.min(Math.max(dragOffset.x / 80, 0), 1)
  const dislikeOpacity = Math.min(Math.max(-dragOffset.x / 80, 0), 1)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="personalizer-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-[#1a1f2c] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col p-6 max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">
              tune
            </span>
            <div>
              <h2
                id="personalizer-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Personalizar Noticias
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Desliza para entrenar tus temas de interés
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Cerrar personalizador"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Feedback Toast */}
        {feedbackToast && (
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold text-center animate-fade-in">
            {feedbackToast}
          </div>
        )}

        {/* Deck Area */}
        <div className="relative w-full h-[370px] my-5 flex items-center justify-center select-none touch-none">
          {isCompleted ? (
            /* Clean completion state */
            <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 w-full h-full shadow-inner animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-3 shadow-xs">
                <span className="material-symbols-outlined text-3xl">task_alt</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                ¡Estás al día!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mb-4">
                Has revisado todas las tarjetas. Tus preferencias han quedado guardadas y el feed de noticias se ha reordenado para ti.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Reiniciar tarjetas
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-sm"
                >
                  Ver noticias
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Third Card Base */}
              {thirdCard && (
                <div
                  className="absolute inset-x-4 top-4 bottom-0 bg-white/70 dark:bg-[#151922]/70 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-md pointer-events-none transition-transform duration-200"
                  style={{
                    transform: 'scale(0.92) translateY(24px)',
                    opacity: 0.4,
                  }}
                />
              )}

              {/* Second Card Peek */}
              {nextCard && (
                <div
                  className="absolute inset-x-2 top-2 bottom-0 bg-white dark:bg-[#161b26] rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg pointer-events-none transition-transform duration-200 overflow-hidden p-5 flex flex-col justify-between"
                  style={{
                    transform: 'scale(0.96) translateY(12px)',
                    opacity: 0.75,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">{nextCard.icon || 'newspaper'}</span>
                      <span>{nextCard.category}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">{nextCard.readTime}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2">
                      {nextCard.title}
                    </h4>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Fuente: {nextCard.sourceName}
                  </div>
                </div>
              )}

              {/* Active Interactive Top Card */}
              {currentCard && (
                <div
                  ref={activeCardRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  className="absolute inset-0 bg-white dark:bg-[#1e2433] rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl p-5 flex flex-col justify-between cursor-grab active:cursor-grabbing will-change-transform overflow-hidden"
                  style={{
                    transform: exitDirection === 'left'
                      ? 'translate3d(-500px, 0, 0) rotate(-25deg)'
                      : exitDirection === 'right'
                      ? 'translate3d(500px, 0, 0) rotate(25deg)'
                      : `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotationDeg}deg)`,
                    transition: isDragging
                      ? 'none'
                      : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease',
                    opacity: exitDirection ? 0 : 1,
                  }}
                >
                  {/* Dynamic Stamp Overlays */}
                  {/* Green Tick / Me Interesa Stamp */}
                  <div
                    className="absolute top-6 left-6 z-20 pointer-events-none px-3 py-1 rounded-xl border-2 border-emerald-500 bg-emerald-500/15 text-emerald-500 font-extrabold text-sm tracking-wider uppercase shadow-md flex items-center gap-1.5"
                    style={{
                      opacity: likeOpacity,
                      transform: 'rotate(-15deg)',
                    }}
                  >
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span>ME INTERESA</span>
                  </div>

                  {/* Red X / Descartar Stamp */}
                  <div
                    className="absolute top-6 right-6 z-20 pointer-events-none px-3 py-1 rounded-xl border-2 border-rose-500 bg-rose-500/15 text-rose-500 font-extrabold text-sm tracking-wider uppercase shadow-md flex items-center gap-1.5"
                    style={{
                      opacity: dislikeOpacity,
                      transform: 'rotate(15deg)',
                    }}
                  >
                    <span className="material-symbols-outlined text-lg">cancel</span>
                    <span>DESCARTAR</span>
                  </div>

                  {/* Card Content */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">
                          {currentCard.icon || 'newspaper'}
                        </span>
                        <span>{currentCard.category}</span>
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {currentCard.readTime || currentCard.readingTime}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                      {currentCard.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed mb-3">
                      {currentCard.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">newspaper</span>
                      {currentCard.sourceName || currentCard.source}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {currentIndex + 1} de {cards.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
          {/* Red Reject / Dislike Button */}
          <button
            type="button"
            onClick={handleReject}
            disabled={isCompleted || !!exitDirection}
            className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Descartar tema (Swipe izquierda)"
            aria-label="Descartar noticia"
          >
            <span className="material-symbols-outlined text-2xl font-bold">close</span>
          </button>

          {/* Reset Preferences Button */}
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Restablecer preferencias a valores predeterminados"
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
            <span>Resetear preferencias</span>
          </button>

          {/* Green Approve / Like Button */}
          <button
            type="button"
            onClick={handleApprove}
            disabled={isCompleted || !!exitDirection}
            className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Me interesa este tema (Swipe derecha)"
            aria-label="Aprobar noticia"
          >
            <span className="material-symbols-outlined text-2xl font-bold">check</span>
          </button>
        </div>
      </div>
    </div>
  )
}
