import { useState, useEffect } from 'react'
import {
  getCurrentUser,
  isGuestUser,
  updateUserProfileData,
  getAllAccounts,
  switchAccount,
  loginUser,
  registerUser,
  deleteAccount,
  logoutUser,
} from '../services/firebase'

export default function AccountModal({
  isOpen,
  onClose,
  initialTab = 'profile',
}) {
  // Mapear tabs antiguos o unificados: 'accounts' o 'theme' van a 'profile'
  const normalizedInitialTab = (initialTab === 'accounts' || initialTab === 'theme') ? 'profile' : initialTab
  const [activeTab, setActiveTab] = useState(normalizedInitialTab)
  const [user, setUser] = useState(getCurrentUser())
  const [allAccounts, setAllAccounts] = useState(getAllAccounts())
  const [editName, setEditName] = useState(user.displayName || '')

  // Estados de formularios
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')

  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Animación de inicio de sesión / cambio de cuenta
  const [authCelebration, setAuthCelebration] = useState({
    visible: false,
    name: '',
    email: '',
    action: 'login', // 'login' | 'switch' | 'register'
  })

  const isGuest = isGuestUser(user)

  const refreshState = () => {
    const cur = getCurrentUser()
    setUser(cur)
    setEditName(cur.displayName || '')
    setAllAccounts(getAllAccounts())
  }

  useEffect(() => {
    if (isOpen) {
      refreshState()
      const nTab = (initialTab === 'accounts' || initialTab === 'theme') ? 'profile' : initialTab
      setActiveTab(nTab)
      setStatusMessage({ text: '', type: '' })
      setAuthCelebration({ visible: false, name: '', email: '', action: 'login' })
    }
  }, [isOpen, initialTab])

  // Escuchar cambios de autenticación
  useEffect(() => {
    const handleAuthChange = () => refreshState()
    window.addEventListener('studenthub_auth_changed', handleAuthChange)
    return () => window.removeEventListener('studenthub_auth_changed', handleAuthChange)
  }, [])

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const getInitials = (name) => {
    if (!name || name === 'Invitado') return 'IN'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const triggerAuthCelebration = (displayName, email, action = 'login') => {
    setAuthCelebration({
      visible: true,
      name: displayName || email || 'Usuario',
      email: email || '',
      action,
    })
    setTimeout(() => {
      setAuthCelebration((prev) => ({ ...prev, visible: false }))
    }, 2200)
  }

  // Guardar cambios en el perfil
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!editName.trim()) return
    setIsSubmitting(true)
    try {
      const updated = await updateUserProfileData({ displayName: editName.trim() })
      setUser(updated)
      setStatusMessage({ text: 'Nombre actualizado con éxito.', type: 'success' })
    } catch (err) {
      setStatusMessage({ text: err.message || 'Error al actualizar el nombre', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cambiar de cuenta (con animación clara y sin expulsar al usuario)
  const handleSwitchAccount = (uid) => {
    setStatusMessage({ text: '', type: '' })
    const target = switchAccount(uid)
    refreshState()
    triggerAuthCelebration(target.displayName, target.email, 'switch')
    setStatusMessage({
      text: `Sesión cambiada a ${target.displayName || target.email}.`,
      type: 'success',
    })
  }

  // Eliminar cuenta local
  const handleDeleteAccount = async (uid, name) => {
    if (window.confirm(`¿Seguro que deseas eliminar la cuenta de ${name} de este equipo?`)) {
      await deleteAccount(uid)
      refreshState()
      setStatusMessage({ text: 'Cuenta eliminada de este equipo.', type: 'success' })
    }
  }

  // Iniciar sesión con animación celebratoria
  const handleLogin = async (e) => {
    e.preventDefault()
    setStatusMessage({ text: '', type: '' })
    setIsSubmitting(true)
    try {
      const loggedUser = await loginUser(loginEmail, loginPassword)
      refreshState()
      triggerAuthCelebration(loggedUser.displayName, loggedUser.email, 'login')
      setStatusMessage({
        text: `¡Bienvenido de nuevo, ${loggedUser.displayName}! Sesión iniciada con éxito.`,
        type: 'success',
      })
      setLoginPassword('')
      setActiveTab('profile')
    } catch (err) {
      setStatusMessage({ text: err.message || 'Error al iniciar sesión', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Registrar nueva cuenta con animación celebratoria
  const handleRegister = async (e) => {
    e.preventDefault()
    setStatusMessage({ text: '', type: '' })
    setIsSubmitting(true)
    try {
      const newUser = await registerUser(regEmail, regPassword, regName)
      refreshState()
      triggerAuthCelebration(newUser.displayName, newUser.email, 'register')
      setStatusMessage({
        text: `¡Cuenta creada con éxito! Te hemos enviado un correo de bienvenida a ${newUser.email} con el enlace a nuestra web de descarga.`,
        type: 'success',
      })
      setRegName('')
      setRegEmail('')
      setRegPassword('')
      setActiveTab('profile')
    } catch (err) {
      setStatusMessage({ text: err.message || 'Error al registrar la cuenta', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cerrar sesión desde el modal
  const handleLogoutFromModal = async () => {
    await logoutUser()
    refreshState()
    setStatusMessage({
      text: 'Has cerrado sesión. Ahora estás en modo invitado.',
      type: 'success',
    })
    setActiveTab('profile')
  }

  if (!isOpen) return null

  // Pestañas unificadas sin la redundancia de 'Fuente' y con 'Cuentas' integrado en Perfil
  const tabs = [
    { id: 'profile', label: `Perfil & Cuentas (${allAccounts.length})` },
    { id: 'login', label: 'Entrar' },
    { id: 'register', label: 'Nueva Cuenta' },
  ]

  const activeIndex = tabs.findIndex((t) => t.id === activeTab)

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-[#161b26] w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
      >
        {/* ANIMACIÓN DE CELEBRACIÓN DE INICIO DE SESIÓN / CAMBIO DE CUENTA */}
        {authCelebration.visible && (
          <div className="absolute inset-0 bg-white/95 dark:bg-[#161b26]/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-90 fade-in duration-200 rounded-3xl">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-3 animate-bounce shadow-sm">
              <span className="material-symbols-outlined text-[36px]">
                {authCelebration.action === 'register' ? 'how_to_reg' : 'verified_user'}
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {authCelebration.action === 'switch'
                ? `Cambiado a ${authCelebration.name}`
                : authCelebration.action === 'register'
                ? `¡Bienvenido a bordo, ${authCelebration.name}!`
                : `¡Hola de nuevo, ${authCelebration.name}!`}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              {authCelebration.action === 'register'
                ? `Te hemos enviado un correo de agradecimiento a ${authCelebration.email} con el enlace a nuestra web de descargas.`
                : 'Sesión sincronizada con éxito. Tus calendarios y tareas están conectados en la nube.'}
            </p>
            <div className="mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200/60 dark:border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Cuenta Activa</span>
            </div>
          </div>
        )}

        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">
                {activeTab === 'profile'
                  ? 'person'
                  : activeTab === 'login'
                  ? 'login'
                  : 'person_add'}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                {activeTab === 'profile'
                  ? 'Perfil & Cuentas'
                  : activeTab === 'login'
                  ? 'Iniciar Sesión'
                  : 'Crear Nueva Cuenta'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {isGuest ? 'Modo Invitado activo' : `Conectado como ${user.displayName}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Selector de pestañas fluido y estable */}
        <div className="relative flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 select-none">
          <div
            className="absolute top-1 bottom-1 rounded-xl bg-white dark:bg-[#1a202c] shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
            style={{
              width: `calc((100% - 8px) / ${tabs.length})`,
              left: '4px',
              transform: `translateX(${Math.max(0, activeIndex) * 100}%)`,
            }}
          />
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                setStatusMessage({ text: '', type: '' })
              }}
              className={`relative z-10 flex-1 py-1.5 text-xs font-semibold text-center rounded-xl transition-colors cursor-pointer truncate px-1 ${
                activeTab === tab.id
                  ? 'text-primary font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mensaje de feedback de estado */}
        {statusMessage.text && (
          <div
            className={`p-3 rounded-2xl text-xs font-medium border flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[17px] shrink-0">
                {statusMessage.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage({ text: '', type: '' })}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        )}

        {/* PESTAÑA UNIFICADA: PERFIL Y GESTIÓN DE CUENTAS */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-4 text-xs">
            {/* 1. Tarjeta de estado de usuario activo */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all ${
                isGuest
                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
                  : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-2xl font-bold flex items-center justify-center text-sm shadow-xs shrink-0 ${
                  isGuest
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'bg-slate-900 text-white'
                }`}
              >
                {isGuest ? (
                  <span className="material-symbols-outlined text-[22px]">person_off</span>
                ) : (
                  getInitials(user.displayName)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    {isGuest ? 'Modo Invitado (Sin sesión)' : user.displayName}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isGuest
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {isGuest ? 'Local' : user.plan || 'Pro'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {isGuest
                    ? 'Tus tareas y notas se almacenan solo localmente'
                    : user.email || ''}
                </p>
              </div>
            </div>

            {/* Si es invitado: banner para iniciar sesión rápidamente */}
            {isGuest ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
                    cloud_sync
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      ¿Quieres guardar tus tareas en la nube?
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-relaxed">
                      Inicia sesión con tu cuenta para sincronizar con WhatsApp 24/7 y no perder tus datos al borrar el navegador.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-white font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">login</span>
                    <span>Iniciar Sesión</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>Crear Cuenta</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Si tiene cuenta: formulario para editar nombre visible */
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nombre visible en la aplicación
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-white font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogoutFromModal}
                    className="py-2 px-3 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 font-semibold hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1"
                    title="Cerrar la sesión activa"
                  >
                    <span className="material-symbols-outlined text-[15px]">logout</span>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </form>
            )}

            {/* 2. Sección Unificada: Cuentas Guardadas en este equipo */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">switch_account</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Cuentas en este dispositivo ({allAccounts.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span>Añadir otra</span>
                </button>
              </div>

              {allAccounts.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    No hay cuentas guardadas aún.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Iniciar sesión
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-0.5">
                  {allAccounts.map((acc) => {
                    const isCurrent = !isGuest && acc.uid === user.uid
                    return (
                      <div
                        key={acc.uid}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                          isCurrent
                            ? 'bg-primary/5 border-primary shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-semibold flex items-center justify-center text-xs shrink-0">
                            {getInitials(acc.displayName)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900 dark:text-white text-xs">
                              {acc.displayName}
                            </div>
                            <div className="truncate text-[10px] text-slate-400">{acc.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Activa
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSwitchAccount(acc.uid)}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-primary hover:text-white text-slate-800 dark:text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Usar cuenta
                            </button>
                          )}

                          {/* Botón borrar solo si hay más de 1 cuenta */}
                          {allAccounts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc.uid, acc.displayName)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Eliminar de este equipo"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA: INICIAR SESIÓN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>{isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-[11px] text-slate-500 hover:text-primary transition-colors cursor-pointer"
              >
                ¿No tienes cuenta? <strong className="underline">Crear cuenta gratis</strong>
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA: CREAR NUEVA CUENTA */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Tu nombre
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Ej. Jorge García"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Contraseña (mínimo 6 caracteres)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>{isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-[11px] text-slate-500 hover:text-primary transition-colors cursor-pointer"
              >
                ¿Ya tienes cuenta? <strong className="underline">Inicia sesión</strong>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
