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
  const [activeTab, setActiveTab] = useState(initialTab)
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
      setActiveTab(initialTab)
      setStatusMessage({ text: '', type: '' })
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

  // Guardar cambios en el perfil (sin expulsar al usuario)
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

  // Cambiar de cuenta (sin expulsar al usuario de la ventana)
  const handleSwitchAccount = (uid) => {
    setStatusMessage({ text: '', type: '' })
    const target = switchAccount(uid)
    refreshState()
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

  // Iniciar sesión
  const handleLogin = async (e) => {
    e.preventDefault()
    setStatusMessage({ text: '', type: '' })
    setIsSubmitting(true)
    try {
      const loggedUser = await loginUser(loginEmail, loginPassword)
      refreshState()
      setStatusMessage({
        text: `¡Bienvenido de nuevo, ${loggedUser.displayName}! Sesión iniciada con éxito.`,
        type: 'success',
      })
      setLoginPassword('')
    } catch (err) {
      setStatusMessage({ text: err.message || 'Error al iniciar sesión', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Registrar nueva cuenta
  const handleRegister = async (e) => {
    e.preventDefault()
    setStatusMessage({ text: '', type: '' })
    setIsSubmitting(true)
    try {
      const newUser = await registerUser(regEmail, regPassword, regName)
      refreshState()
      setStatusMessage({
        text: `¡Cuenta creada con éxito! Ya estás conectado como ${newUser.displayName}.`,
        type: 'success',
      })
      setRegName('')
      setRegEmail('')
      setRegPassword('')
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

  const tabs = [
    { id: 'profile', label: 'Perfil' },
    { id: 'accounts', label: `Cuentas (${allAccounts.length})` },
    { id: 'login', label: 'Entrar' },
    { id: 'register', label: 'Nueva' },
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
        className="bg-white dark:bg-[#161b26] w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">
                {activeTab === 'profile'
                  ? 'person'
                  : activeTab === 'accounts'
                  ? 'switch_account'
                  : activeTab === 'login'
                  ? 'login'
                  : 'person_add'}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                {activeTab === 'profile'
                  ? 'Ajustes de Perfil'
                  : activeTab === 'accounts'
                  ? 'Cuentas en este equipo'
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
              transform: `translateX(${activeIndex * 100}%)`,
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
              className={`relative z-10 flex-1 py-1.5 text-xs font-semibold text-center rounded-xl transition-colors cursor-pointer ${
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

        {/* PESTAÑA 1: PERFIL */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-4 text-xs">
            {/* Tarjeta de estado de usuario */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-3.5 ${
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

                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/60 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>Base de datos sincronizada permanentemente en la nube y dispositivo.</span>
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
          </div>
        )}

        {/* PESTAÑA 2: CUENTAS GUARDADAS EN ESTE EQUIPO */}
        {activeTab === 'accounts' && (
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Cuentas registradas en este navegador ({allAccounts.length}):
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-[11px] text-primary hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Nueva cuenta</span>
              </button>
            </div>

            {allAccounts.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center justify-center text-center gap-2.5 my-1">
                <div className="w-10 h-10 rounded-2xl bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">no_accounts</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  No hay cuentas guardadas en este equipo
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                  Inicia sesión con tu cuenta existente o crea una nueva para sincronizar tus tareas en la nube y WhatsApp.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="px-3 py-1.5 rounded-xl bg-primary text-white font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer text-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">login</span>
                    <span>Iniciar Sesión</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 transition-colors cursor-pointer text-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">person_add</span>
                    <span>Crear Cuenta</span>
                  </button>
                </div>
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
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300'
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
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
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

            {/* Opción de volver a modo invitado si tiene una cuenta iniciada */}
            {!isGuest && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">¿Usar sin ninguna cuenta activa?</span>
                <button
                  type="button"
                  onClick={handleLogoutFromModal}
                  className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 cursor-pointer underline"
                >
                  Cambiar a Modo Invitado
                </button>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: INICIAR SESIÓN */}
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
                placeholder="tu.correo@ejemplo.com"
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

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>¿No tienes cuenta todavía?</span>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-primary font-semibold hover:underline cursor-pointer"
              >
                Crear una cuenta gratis
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>{isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
            </button>
          </form>
        )}

        {/* PESTAÑA 4: CREAR NUEVA CUENTA */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Nombre y Apellidos
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Tu nombre y apellidos"
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
                placeholder="tu.correo@ejemplo.com"
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
                minLength={4}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>¿Ya tienes una cuenta registrada?</span>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-primary font-semibold hover:underline cursor-pointer"
              >
                Inicia sesión aquí
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>{isSubmitting ? 'Creando cuenta...' : 'Crear y Guardar Cuenta'}</span>
            </button>
          </form>
        )}

        {/* Pie del modal con botón cerrar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
