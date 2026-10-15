import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import ProfilePopover from './ProfilePopover'
import { getCurrentUser, isGuestUser } from '../services/firebase'
import AIBotIcon from './AIBotIcon'

const DEFAULT_NAVIGATION = [
  { name: 'Calendario', to: '/calendar', icon: 'calendar_today' },
  { name: 'Auto-Organizer', to: '/', icon: 'checklist' },
  { name: 'Notebooks', to: '/notebooks', icon: 'menu_book' },
  { name: 'AI Assistant', to: '/ai-assistant', icon: 'smart_toy' },
  { name: 'My Hub (Links & Projects)', to: '/my-hub', icon: 'hub' },
]

export default function Sidebar({ isSidebarOpen = true, onCloseSidebar }) {
  const [navItems, setNavItems] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_nav_order')
      if (saved) {
        const order = JSON.parse(saved)
        const sorted = [...DEFAULT_NAVIGATION].sort((a, b) => {
          const idxA = order.indexOf(a.to)
          const idxB = order.indexOf(b.to)
          return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99)
        })
        return sorted
      }
    } catch (e) {
      console.warn('Error leyendo orden de sidebar:', e)
    }
    return DEFAULT_NAVIGATION
  })

  const [draggingIdx, setDraggingIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileSnippetRef = useRef(null)

  const longPressTimerRef = useRef(null)
  const hasMovedRef = useRef(false)
  const activeTouchIndexRef = useRef(null)

  const [user, setUser] = useState(getCurrentUser())
  const isGuest = isGuestUser(user)

  useEffect(() => {
    setUser(getCurrentUser())
  }, [isProfileOpen])

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getCurrentUser())
    }
    window.addEventListener('studenthub_auth_changed', handleAuthChange)
    return () => window.removeEventListener('studenthub_auth_changed', handleAuthChange)
  }, [])

  // Iniciar temporizador de click mantenido (long-press 280ms)
  const startLongPress = (index) => {
    hasMovedRef.current = false
    activeTouchIndexRef.current = index
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      setDraggingIdx(index)
      if (navigator.vibrate) navigator.vibrate(30)
    }, 280)
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handlePointerUp = () => {
    cancelLongPress()
    if (isLongPressing && draggingIdx !== null && dragOverIdx !== null && draggingIdx !== dragOverIdx) {
      setNavItems((prev) => {
        const next = [...prev]
        const [movedItem] = next.splice(draggingIdx, 1)
        next.splice(dragOverIdx, 0, movedItem)
        localStorage.setItem('sidebar_nav_order', JSON.stringify(next.map((i) => i.to)))
        return next
      })
    }
    setDraggingIdx(null)
    setDragOverIdx(null)
    setTimeout(() => {
      setIsLongPressing(false)
    }, 60)
  }

  // Soporte de arrastre táctil en móviles/tablets
  const handleTouchMove = (e) => {
    if (!isLongPressing) return
    const touch = e.touches[0]
    if (!touch) return
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const navItemEl = el ? el.closest('[data-nav-index]') : null
    if (navItemEl) {
      const idx = Number(navItemEl.getAttribute('data-nav-index'))
      if (!isNaN(idx) && idx !== dragOverIdx) {
        setDragOverIdx(idx)
      }
    }
  }

  // HTML5 Drag and Drop para ratón en escritorio
  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggingIdx(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIdx !== index) {
      setDragOverIdx(index)
    }
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    if (draggingIdx === null || draggingIdx === dropIndex) return
    setNavItems((prev) => {
      const next = [...prev]
      const [movedItem] = next.splice(draggingIdx, 1)
      next.splice(dropIndex, 0, movedItem)
      localStorage.setItem('sidebar_nav_order', JSON.stringify(next.map((i) => i.to)))
      return next
    })
    setDraggingIdx(null)
    setDragOverIdx(null)
    setIsLongPressing(false)
  }

  return (
    <>
      {/* Backdrop en pantallas móviles cuando el menú lateral está abierto */}
      {isSidebarOpen && (
        <div
          onClick={onCloseSidebar}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-60 bg-surface-pure z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-300 border-r border-slate-200/70 dark:border-slate-800 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Brand / Logo */}
          <div className="h-14 px-space-lg flex items-center justify-between border-b border-surface-muted/50">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[24px] text-primary">adjust</span>
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                StudentHub
              </span>
            </div>
            {/* Botón cerrar para móvil */}
            <button
              type="button"
              onClick={onCloseSidebar}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Indicación de reorganización sutil */}
          <div className="px-space-md pt-3 pb-1 flex items-center justify-between text-[11px] text-secondary">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Menú Principal</span>
            {isLongPressing ? (
              <span className="text-primary font-bold animate-pulse text-[10px]">Arrastra para ordenar</span>
            ) : (
              <span className="text-[9px] text-secondary/70">Mantén click para reordenar</span>
            )}
          </div>

          {/* Navigation links con Reorganización mediante Click Mantenido & Arrastre */}
          <nav
            className="flex flex-col gap-1.5 px-space-sm pt-1 select-none"
            onTouchMove={handleTouchMove}
            onPointerUp={handlePointerUp}
          >
            {navItems.map((item, index) => {
              const isBeingDragged = draggingIdx === index
              const isTargetSlot = dragOverIdx === index && draggingIdx !== index

              return (
                <div
                  key={item.to}
                  data-nav-index={index}
                  draggable={isLongPressing && draggingIdx === index}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onMouseDown={() => startLongPress(index)}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => startLongPress(index)}
                  onTouchEnd={handlePointerUp}
                  onTouchCancel={cancelLongPress}
                  className={`relative transition-all duration-150 rounded-xl ${
                    isBeingDragged
                      ? 'scale-[1.03] shadow-md ring-2 ring-primary/80 bg-primary/10 z-20 cursor-grabbing'
                      : isTargetSlot
                      ? 'ring-2 ring-primary/40 bg-primary/5 translate-y-1'
                      : ''
                  }`}
                >
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={(e) => {
                      if (isLongPressing) {
                        e.preventDefault()
                        return
                      }
                      if (onCloseSidebar) onCloseSidebar()
                    }}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors font-label-md text-label-md cursor-pointer ${
                        isActive
                          ? 'bg-primary-fixed/25 dark:bg-primary/20 text-primary font-bold shadow-2xs'
                          : 'text-on-surface-variant hover:bg-surface-muted hover:text-on-surface font-medium'
                      }`
                    }
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <span className="material-symbols-outlined text-[19px] shrink-0">{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </div>

                    {/* Icono de arrastre visible al mantener pulsado */}
                    {isLongPressing && (
                      <span className="material-symbols-outlined text-[16px] text-primary/70 shrink-0">
                        drag_indicator
                      </span>
                    )}
                  </NavLink>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Profile snippet en Sidebar enlazado al Popover de Perfil Stitch */}
        <div className="p-space-sm m-space-sm relative">
          <div
            ref={profileSnippetRef}
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="p-space-md rounded-2xl bg-surface-subtle hover:bg-surface-muted/80 border border-slate-200/70 dark:border-slate-800 transition-all cursor-pointer shadow-2xs group"
            title="Abrir menú de perfil y cuenta Focus Hub"
          >
            {isGuest ? (
              <div className="flex items-center gap-space-sm">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium flex items-center justify-center text-xs tracking-tight shadow-xs">
                    <span className="material-symbols-outlined text-[17px]">person</span>
                  </div>
                  <span
                    className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-slate-400 border border-white dark:border-[#161b26]"
                    title="Sin sesión iniciada"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-body-sm text-on-surface font-semibold truncate">
                      Invitado
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                      Local
                    </span>
                  </div>
                  <span className="font-label-sm text-[11px] text-primary flex items-center gap-1 truncate mt-0.5 font-medium">
                    <span className="material-symbols-outlined text-[12px]">login</span>
                    Iniciar sesión
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-space-sm">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-xs tracking-tight shadow-xs">
                    {user.displayName
                      ? user.displayName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'U'}
                  </div>
                  <span
                    className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-[#161b26]"
                    title="Sesión activa"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-body-sm text-on-surface font-semibold truncate">
                      {user.displayName || 'Usuario'}
                    </span>
                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.2 rounded border border-blue-100/80 dark:border-blue-800/80">
                      {user.plan || 'Pro'}
                    </span>
                  </div>
                  <span className="font-label-sm text-[11px] text-tertiary flex items-center gap-1 truncate mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {user.focusStatus || 'Deep Work Block'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Menú de Perfil desplegable hacia arriba desde el Sidebar */}
          <ProfilePopover
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            anchorRef={profileSnippetRef}
            placement="sidebar"
            onOpenAccountModal={(tab) => {
              window.dispatchEvent(
                new CustomEvent('studenthub_open_account_modal', { detail: { tab } })
              )
            }}
          />
        </div>
      </aside>
    </>
  )
}
