import { useState, useEffect, useRef } from 'react'
import {
  getCurrentUser,
  updateUserProfileData,
  logoutUser,
  loginUser,
  registerUser,
  getAllAccounts,
  switchAccount,
} from '../services/firebase'

export default function ProfilePopover({
  isOpen,
  onClose,
  anchorRef,
  placement = 'header', // 'header' | 'sidebar'
}) {
  const [user, setUser] = useState(getCurrentUser())
  const [allAccounts, setAllAccounts] = useState(getAllAccounts())
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [accountTab, setAccountTab] = useState('profile') // 'profile' | 'switch' | 'new'
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [editName, setEditName] = useState(user.displayName || 'Jorge García')
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' })

  const popoverRef = useRef(null)

  const FOCUS_STATES = [
    'Deep Work Block',
    'Sesión de Estudio',
    'Descanso Activo',
    'Revisión y Planificación',
  ]

  const refreshUserData = () => {
    const cur = getCurrentUser()
    setUser(cur)
    setEditName(cur.displayName || 'Jorge García')
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

  // Cerrar al hacer click fuera (SOLO si el modal de cuenta NO está abierto)
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showAccountModal) return // Nunca cerrar el popover si el modal secundario está activo
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
  }, [isOpen, onClose, anchorRef, showAccountModal])

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAccountModal) {
          setShowAccountModal(false)
          setStatusMessage({ text: '', type: '' })
        } else if (isOpen) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showAccountModal, onClose])

  const handleCycleFocus = async () => {
    const currentIndex = FOCUS_STATES.indexOf(user.focusStatus)
    const nextStatus = FOCUS_STATES[(currentIndex + 1) % FOCUS_STATES.length]
    const updated = await updateUserProfileData({ focusStatus: nextStatus })
    setUser(updated)
  }

  const handleLogout = async () => {
    await logoutUser()
    refreshUserData()
    onClose()
  }

  const handleSwitch = (uid) => {
    switchAccount(uid)
    refreshUserData()
    setShowAccountModal(false)
    setStatusMessage({ text: '', type: '' })
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!editName.trim()) return
    const updated = await updateUserProfileData({ displayName: editName.trim() })
    setUser(updated)
    setStatusMessage({ text: 'Nombre de usuario actualizado con éxito', type: 'success' })
    setTimeout(() => {
      setShowAccountModal(false)
      setStatusMessage({ text: '', type: '' })
    }, 900)
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    setStatusMessage({ text: '', type: '' })
    try {
      await registerUser(emailInput, passwordInput, nameInput)
      refreshUserData()
      setStatusMessage({ text: 'Cuenta creada y activada correctamente', type: 'success' })
      setEmailInput('')
      setPasswordInput('')
      setNameInput('')
      setTimeout(() => {
        setShowAccountModal(false)
        setStatusMessage({ text: '', type: '' })
      }, 900)
    } catch (err) {
      setStatusMessage({ text: err.message || 'Error al crear cuenta', type: 'error' })
    }
  }

  const handleLoginAccount = async (e) => {
    e.preventDefault()
    setStatusMessage({ text: '', type: '' })
    try {
      await loginUser(emailInput, passwordInput)
      refreshUserData()
      setStatusMessage({ text: 'Sesión iniciada con éxito', type: 'success' })
      setEmailInput('')
      setPasswordInput('')
      setTimeout(() => {
        setShowAccountModal(false)
        setStatusMessage({ text: '', type: '' })
      }, 900)
    } catch (err) {
      setStatusMessage({ text: err.message || 'Error al iniciar sesión', type: 'error' })
    }
  }

  const getInitials = (name) => {
    if (!name) return 'JG'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  if (!isOpen) return null

  // Clases de posicionamiento inteligentes segun donde se abra
  const positionClasses =
    placement === 'sidebar'
      ? 'fixed left-3 sm:left-4 bottom-20 z-50'
      : 'fixed right-3 sm:right-6 top-16 z-50'

  return (
    <>
      {/* Componente Aislado: Menú desplegable de Perfil & Gestión de Sesión (Diseño Stitch) */}
      <div
        ref={popoverRef}
        className={`${positionClasses} w-[270px] max-w-[calc(100vw-24px)] bg-white dark:bg-[#161b26] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-150 select-none`}
      >
        {/* Cabecera de Usuario */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-xs tracking-tight shadow-xs">
                {getInitials(user.displayName)}
              </div>
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#161b26] ring-1 ring-emerald-500/20"
                title="Sesión activa"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900 dark:text-white truncate text-[13px] leading-tight">
                  {user.displayName || 'Jorge García'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100/80 dark:border-blue-800/80">
                  {user.plan || 'Pro'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-normal">
                {user.email || 'jorge.m@focushub.workspace'}
              </p>
            </div>
          </div>
        </div>

        {/* Bloque de Estado de Enfoque */}
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

        {/* Opciones de Navegación & Cuenta */}
        <div className="p-1.5 space-y-0.5 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAccountTab('profile')
              setStatusMessage({ text: '', type: '' })
              setShowAccountModal(true)
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors group text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg
                className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-medium">Configuración de cuenta</span>
            </div>
            <svg
              className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountTab('switch')
              setStatusMessage({ text: '', type: '' })
              setShowAccountModal(true)
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors group text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg
                className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-xs font-medium">Cambiar de cuenta</span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {allAccounts.length} activa{allAccounts.length > 1 ? 's' : ''}
            </span>
          </button>
        </div>

        {/* Pie de Gestión de Sesión */}
        <div className="p-1.5 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/30 hover:text-rose-700 transition-colors group text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg
                className="w-4 h-4 text-rose-500 group-hover:text-rose-600 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-xs font-semibold">Cerrar sesión</span>
            </div>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-500 font-normal">
              {user.location || 'Málaga, ES'}
            </span>
          </button>
        </div>
      </div>

      {/* Modal Robusto e Independiente de Gestión de Cuenta (z-[80] que SIEMPRE se puede cerrar) */}
      {showAccountModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAccountModal(false)
              setStatusMessage({ text: '', type: '' })
            }
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            {/* Cabecera del Modal con Boton X siempre operativo */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary text-[22px]">manage_accounts</span>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  {accountTab === 'profile'
                    ? 'Ajustes de Perfil'
                    : accountTab === 'switch'
                    ? 'Cambiar de Cuenta'
                    : 'Crear Nueva Cuenta'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAccountModal(false)
                  setStatusMessage({ text: '', type: '' })
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title="Cerrar ventana"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Selector de Pestañas con Pastilla Deslizante Apple */}
            <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div
                className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-[#161b26] shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                style={{
                  width: 'calc(33.333% - 2.6px)',
                  left: '2px',
                  transform: `translateX(${
                    accountTab === 'profile' ? '0%' : accountTab === 'switch' ? '100%' : '200%'
                  })`,
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setAccountTab('profile')
                  setStatusMessage({ text: '', type: '' })
                }}
                className={`relative z-10 flex-1 py-1 text-xs font-semibold text-center rounded-lg transition-colors cursor-pointer ${
                  accountTab === 'profile'
                    ? 'text-primary font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Perfil
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountTab('switch')
                  setStatusMessage({ text: '', type: '' })
                }}
                className={`relative z-10 flex-1 py-1 text-xs font-semibold text-center rounded-lg transition-colors cursor-pointer ${
                  accountTab === 'switch'
                    ? 'text-primary font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Cuentas
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountTab('new')
                  setStatusMessage({ text: '', type: '' })
                }}
                className={`relative z-10 flex-1 py-1 text-xs font-semibold text-center rounded-lg transition-colors cursor-pointer ${
                  accountTab === 'new'
                    ? 'text-primary font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Nueva
              </button>
            </div>

            {/* Mensajes de feedback */}
            {statusMessage.text && (
              <div
                className={`p-2.5 rounded-xl text-xs font-medium border ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            {/* Contenido Pestaña 1: Perfil Activo */}
            {accountTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {getInitials(user.displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{user.displayName}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        {user.plan || 'Pro'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nombre visible</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/60 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>Base de datos sincronizada permanentemente en tu dispositivo.</span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-white font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountModal(false)
                      setStatusMessage({ text: '', type: '' })
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </form>
            )}

            {/* Contenido Pestaña 2: Cambiar de Cuenta */}
            {accountTab === 'switch' && (
              <div className="flex flex-col gap-2.5 text-xs">
                <span className="text-[11px] text-slate-500 font-medium">Cuentas disponibles en este equipo:</span>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {allAccounts.map((acc) => {
                    const isCurrent = acc.uid === user.uid
                    return (
                      <div
                        key={acc.uid}
                        onClick={() => handleSwitch(acc.uid)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-primary-fixed/20 border-primary text-primary font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-semibold flex items-center justify-center text-[11px] shrink-0">
                            {getInitials(acc.displayName)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold">{acc.displayName}</div>
                            <div className="truncate text-[10px] text-slate-400">{acc.email}</div>
                          </div>
                        </div>
                        {isCurrent ? (
                          <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full shrink-0">
                            Activa
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 hover:text-primary shrink-0">
                            Cambiar
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountTab('new')
                      setStatusMessage({ text: '', type: '' })
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-white font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    + Añadir otra cuenta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountModal(false)
                      setStatusMessage({ text: '', type: '' })
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {/* Contenido Pestaña 3: Crear Nueva Cuenta */}
            {accountTab === 'new' && (
              <form onSubmit={handleCreateAccount} className="flex flex-col gap-2.5 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nombre y Apellidos</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Jorge García"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="jorge.m@focushub.workspace"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-white font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    Crear y Guardar Cuenta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountModal(false)
                      setStatusMessage({ text: '', type: '' })
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
