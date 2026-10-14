import { useState, useEffect, useRef } from 'react'
import {
  getCurrentUser,
  isGuestUser,
  updateUserProfileData,
  logoutUser,
  getAllAccounts,
} from '../services/firebase'

export default function ProfilePopover({
  isOpen,
  onClose,
  anchorRef,
  placement = 'header', // 'header' | 'sidebar'
  onOpenAccountModal,
}) {
  const [user, setUser] = useState(getCurrentUser())
  const [allAccounts, setAllAccounts] = useState(getAllAccounts())
  const popoverRef = useRef(null)

  const isGuest = isGuestUser(user)

  const FOCUS_STATES = [
    'Deep Work Block',
    'Sesión de Estudio',
    'Descanso Activo',
    'Revisión y Planificación',
  ]

  const refreshUserData = () => {
    const cur = getCurrentUser()
    setUser(cur)
    setAllAccounts(getAllAccounts())
  }

  useEffect(() => {
    if (isOpen) {
      refreshUserData()
    }
  }, [isOpen])

  // Escuchar cambios globales de cuenta
  useEffect(() => {
    const handleAuthChange = () => refreshUserData()
    window.addEventListener('studenthub_auth_changed', handleAuthChange)
    return () => window.removeEventListener('studenthub_auth_changed', handleAuthChange)
  }, [])

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        (!anchorRef || !anchorRef.current || !anchorRef.current.contains(e.target))
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen, onClose, anchorRef])

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleCycleFocus = async () => {
    const currentIndex = FOCUS_STATES.indexOf(user.focusStatus)
    const nextStatus = FOCUS_STATES[(currentIndex + 1) % FOCUS_STATES.length]
    const updated = await updateUserProfileData({ focusStatus: nextStatus })
    setUser(updated)
  }

  // Cerrar sesión con éxito garantizado
  const handleLogout = async () => {
    await logoutUser()
    refreshUserData()
    onClose()
  }

  const handleOpenModal = (tab = 'profile') => {
    onClose()
    if (onOpenAccountModal) {
      onOpenAccountModal(tab)
    } else {
      window.dispatchEvent(new CustomEvent('studenthub_open_account_modal', { detail: { tab } }))
    }
  }

  const getInitials = (name) => {
    if (!name || name === 'Invitado') return 'IN'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  if (!isOpen) return null

  // Clases de posicionamiento según ubicación
  const positionClasses =
    placement === 'sidebar'
      ? 'fixed left-3 sm:left-4 bottom-20 z-50'
      : 'fixed right-3 sm:right-6 top-16 z-50'

  return (
    <div
      ref={popoverRef}
      className={`${positionClasses} w-[280px] max-w-[calc(100vw-24px)] bg-white dark:bg-[#161b26] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-150 select-none z-50`}
    >
      {/* Cabecera del Popover */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div
              className={`w-9 h-9 rounded-full font-medium flex items-center justify-center text-xs tracking-tight shadow-xs ${
                isGuest
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  : 'bg-slate-900 text-white'
              }`}
            >
              {isGuest ? (
                <span className="material-symbols-outlined text-[19px]">person</span>
              ) : (
                getInitials(user.displayName)
              )}
            </div>
            {/* Indicador de estado: Verde si hay sesión, Gris si es invitado */}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#161b26] ${
                isGuest ? 'bg-slate-400' : 'bg-emerald-500 ring-1 ring-emerald-500/20'
              }`}
              title={isGuest ? 'Sin sesión iniciada (Modo Invitado)' : 'Sesión activa'}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 dark:text-white truncate text-[13px] leading-tight">
                {isGuest ? 'Invitado' : user.displayName}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  isGuest
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100/80 dark:border-blue-800/80'
                }`}
              >
                {isGuest ? 'Local' : user.plan || 'Pro'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-normal">
              {isGuest ? 'Sin sesión activa' : user.email || 'jorge.m@focushub.workspace'}
            </p>
          </div>
        </div>
      </div>

      {/* Bloque de Estado / Información */}
      {isGuest ? (
        <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>Modo sin conexión a la nube</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Inicia sesión para sincronizar tus tareas con WhatsApp y guardarlas 24/7.
          </p>
        </div>
      ) : (
        <div className="px-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">
            <span>Estado de enfoque</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Activo
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {user.focusStatus || 'Deep Work Block'}
            </span>
            <button
              type="button"
              onClick={handleCycleFocus}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium hover:underline cursor-pointer"
            >
              Cambiar
            </button>
          </div>
        </div>
      )}

      {/* Opciones de Menú */}
      <div className="p-1.5 space-y-0.5 border-b border-slate-100 dark:border-slate-800">
        {isGuest ? (
          <>
            <button
              type="button"
              onClick={() => handleOpenModal('login')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors group text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[18px]">
                  login
                </span>
                <span className="text-xs font-medium">Iniciar sesión</span>
              </div>
              <span className="text-[10px] text-primary font-semibold">Acceder</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenModal('register')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors group text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[18px]">
                  person_add
                </span>
                <span className="text-xs font-medium">Crear cuenta nueva</span>
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-600">Gratis</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenModal('accounts')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors group text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 transition-colors text-[18px]">
                  switch_account
                </span>
                <span className="text-xs font-medium">Cuentas en este equipo</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {allAccounts.length}
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleOpenModal('profile')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors group text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors text-[18px]">
                  manage_accounts
                </span>
                <span className="text-xs font-medium">Configuración de cuenta</span>
              </div>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 text-[16px]">
                chevron_right
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenModal('accounts')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors group text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors text-[18px]">
                  switch_account
                </span>
                <span className="text-xs font-medium">Cambiar de cuenta</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {allAccounts.length} activa{allAccounts.length > 1 ? 's' : ''}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Pie del Popover: Iniciar sesión (si no hay sesión) o Cerrar sesión (si hay sesión) */}
      <div className="p-1.5 bg-slate-50/50 dark:bg-slate-800/30">
        {isGuest ? (
          <button
            type="button"
            onClick={() => handleOpenModal('login')}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-primary hover:bg-primary/10 transition-colors group text-left cursor-pointer font-semibold"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[18px]">login</span>
              <span className="text-xs">Iniciar sesión</span>
            </div>
            <span className="text-[10px] text-primary/80 font-normal">Entrar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/30 hover:text-rose-700 transition-colors group text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-rose-500 group-hover:text-rose-600 transition-colors text-[18px]">
                logout
              </span>
              <span className="text-xs font-semibold">Cerrar sesión</span>
            </div>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-500 font-normal">
              {user.location || 'Málaga, ES'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
