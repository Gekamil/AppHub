import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { getAppTheme, getAppThemeTokens } from '../services/appTheme'

const INITIAL_RESOURCES = [
  {
    id: 'tailwind-docs',
    category: 'dev',
    categoryLabel: 'Dev & Design',
    categoryDotColor: 'bg-primary-container',
    title: 'Tailwind CSS Docs',
    link: 'https://tailwindcss.com/docs',
    linkDisplay: 'tailwindcss.com/docs',
    description: 'v3.4 reference for responsive flex/grid layouts, color palette conventions, and arbitrary value syntax. Includes cheat sheet for container queries and grid template tracks.',
    tags: [
      { label: '#Frontend', bg: 'bg-tag-university-bg', text: 'text-tag-university-text' },
      { label: '#Reference', bg: 'bg-surface-muted', text: 'text-secondary' },
    ],
    addedTime: 'Added 2d ago',
    renderBody: () => (
      <div className="bg-surface-muted rounded-lg p-space-md mb-space-md font-code-sm text-code-sm text-secondary overflow-x-auto">
        <div className="flex items-center justify-between text-[11px] text-outline mb-1">
          <span>CONFIG CHEAT</span>
          <span className="text-tertiary">v3.4.1</span>
        </div>
        <code className="text-on-surface">@layer base &#123; body &#123; color: theme('colors.on-surface'); &#125; &#125;</code>
      </div>
    )
  },
  {
    id: 'cybersecurity-pdf',
    category: 'university',
    categoryLabel: 'University · Málaga Tech',
    categoryDotColor: 'bg-tag-university-text',
    badge: 'Exam Nov',
    badgeClass: 'bg-tag-urgent-bg text-tag-urgent-text',
    title: 'Cybersecurity PDF resources',
    description: 'Lecture slides, Wireshark lab guides, and cryptography cheat sheets for the autumn semester. Contains practical command matrices for RSA key exchanges and TLS 1.3 handshakes.',
    tags: [
      { label: '#University', bg: 'bg-tag-university-bg', text: 'text-tag-university-text' },
      { label: '#Security', bg: 'bg-surface-muted', text: 'text-secondary' },
    ],
    addedTime: 'Added 4d ago',
    renderPreBody: () => (
      <div className="flex items-center gap-space-xs mb-space-md flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-tag-urgent-bg text-tag-urgent-text font-label-sm text-label-sm font-medium">
          <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
          <span>PDF • 14.2 MB</span>
        </span>
        <button className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-muted text-on-surface font-label-sm text-label-sm hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-[14px]">visibility</span>
          <span>Open Reader</span>
        </button>
      </div>
    ),
    renderBody: () => (
      <div className="bg-surface-muted rounded-lg p-space-md mb-space-md flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-body-sm text-secondary">
          <span className="flex items-center gap-1.5 text-on-surface">
            <span className="material-symbols-outlined text-[14px] text-tertiary">check_circle</span>
            Lab 03: Wireshark Packet Sniffing
          </span>
          <span className="font-code-sm text-[11px]">100%</span>
        </div>
        <div className="flex items-center justify-between text-body-sm text-secondary">
          <span className="flex items-center gap-1.5 text-on-surface">
            <span className="material-symbols-outlined text-[14px] text-outline">radio_button_unchecked</span>
            Lab 04: Diffie-Hellman Key Exchange
          </span>
          <span className="font-code-sm text-[11px] text-tag-urgent-text">Pending</span>
        </div>
      </div>
    )
  },
  {
    id: 'mechanical-puzzle-3d',
    category: 'maker',
    categoryLabel: 'Maker & 3D Lab',
    categoryDotColor: 'bg-tag-personal-text',
    verified: true,
    title: 'Mechanical Puzzle 3D models',
    link: 'https://printables.com',
    linkDisplay: 'printables.com/@maker_hub',
    description: 'Tolerance test files (.stl) and assembly diagrams for multi-layer gear puzzle. Designed for 0.16mm layer height with 0.2mm clearance gaps on interlocked rotation axles.',
    tags: [
      { label: '#3DPrinting', bg: 'bg-tag-personal-bg', text: 'text-tag-personal-text' },
      { label: '#Hardware', bg: 'bg-surface-muted', text: 'text-secondary' },
    ],
    addedTime: 'Added 1w ago',
    renderPreTitle: () => (
      <div className="relative w-full h-36 rounded-lg overflow-hidden mb-space-md bg-surface-muted">
        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Technical blueprint diagram and 3D rendering preview" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw0ETCqLuyeFmT95F8SsaMVSGuTJ7CPZ7i0IxzPLHyJE19ZhXjKbFGw6vyS_BTHJcQQVnDhcprBWCjDv76xMwFXI1FTzFEtU2QMs89DyjZOpHCu2FCTDstByX4oI9UYFIBcbrV9rICrgA1anwi_7j7mI6NZX7oZwDTaPdacxvV6jrIRTHFeqD5xJpxkLdFvcM7GfKwhioDYt3dz_GGURt8bu7zunlRFPdUcfG54CVkKqU6215eDR9rSw" />
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-surface-pure/90 backdrop-blur-sm font-code-sm text-[11px] text-on-surface font-medium flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">view_in_ar</span>
          <span>Bambu X1-Carbon (.3mf)</span>
        </div>
      </div>
    )
  },
  {
    id: 'malaga-running',
    category: 'personal',
    categoryLabel: 'Personal · Health',
    categoryDotColor: 'bg-tag-health-text',
    icon: 'directions_run',
    title: 'Málaga Running Routes & Elevation',
    location: 'Málaga, Spain · GPX Synced',
    description: 'Coastal 10k routes along La Malagueta, Gibralfaro hill sprints, and hydration stops. Includes elevation profile charts and morning sunrise intervals starting from Muelle Uno.',
    tags: [
      { label: '#Health', bg: 'bg-tag-health-bg', text: 'text-tag-health-text' },
      { label: '#Running', bg: 'bg-surface-muted', text: 'text-secondary' },
    ],
    addedTime: 'Added 2w ago',
    renderBody: () => (
      <div className="bg-surface-muted rounded-lg p-space-md mb-space-md">
        <div className="flex items-center justify-between text-body-sm mb-1">
          <span className="font-code-sm text-[11px] text-secondary">ELEVATION PROFILE (GIBRALFARO LOOP)</span>
          <span className="font-code-sm text-[11px] text-on-surface font-medium">+142m gain</span>
        </div>
        <div className="h-14 w-full flex items-end">
          <svg className="w-full h-12 text-tertiary" fill="none" preserveAspectRatio="none" viewBox="0 0 280 48">
            <path d="M0 44 L30 40 L60 38 L90 28 L120 12 L150 6 L180 18 L210 32 L240 40 L280 42" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
            <path d="M0 44 L30 40 L60 38 L90 28 L120 12 L150 6 L180 18 L210 32 L240 40 L280 42 L280 48 L0 48 Z" fill="currentColor" fillOpacity="0.12" />
          </svg>
        </div>
        <div className="flex justify-between font-code-sm text-[10px] text-outline mt-1">
          <span>0 km (Beachfront)</span>
          <span>4.2 km (Mirador Peak)</span>
          <span>10.0 km</span>
        </div>
      </div>
    )
  },
  {
    id: 'react-handbook',
    category: 'dev',
    categoryLabel: 'Dev & Design',
    categoryDotColor: 'bg-primary-container',
    icon: 'auto_stories',
    title: 'React Architecture Handbook',
    link: 'https://github.com/alan2207/bulletproof-react',
    linkDisplay: 'github.com/alan2207/bulletproof-react',
    description: 'Best practices on state management, hooks lifecycle, and performance profiling. Covers feature-sliced folder structure, modular server actions, and atomic design primitives.',
    tags: [
      { label: '#React', bg: 'bg-tag-university-bg', text: 'text-tag-university-text' },
      { label: '#Engineering', bg: 'bg-surface-muted', text: 'text-secondary' },
    ],
    addedTime: 'Added 3w ago',
    renderBody: () => (
      <div className="space-y-1.5 bg-surface-muted rounded-lg p-space-md mb-space-md font-code-sm text-code-sm">
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-secondary">Store Pattern:</span>
          <span className="text-on-surface font-medium">Zustand + TanStack Query</span>
        </div>
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-secondary">Component Model:</span>
          <span className="text-on-surface font-medium">Headless UI + Tailwind</span>
        </div>
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-secondary">Test Coverage:</span>
          <span className="text-tertiary font-medium">92% Vitest / Playwright</span>
        </div>
      </div>
    )
  },
  {
    id: 'lucia-gift',
    category: 'personal',
    categoryLabel: 'Personal · Private Note',
    categoryDotColor: 'bg-tag-personal-text',
    lock: true,
    title: "Lucía's Birthday Gift Ideas",
    description: 'Curated wishlist, pottery workshop vouchers in Málaga old town, and bookmark list. Reserve the 2-hour ceramic wheel session before Friday deadline.',
    tags: [
      { label: '#Personal', bg: 'bg-tag-personal-bg', text: 'text-tag-personal-text' },
      { label: '#Wishlist', bg: 'bg-surface-muted', text: 'text-secondary' },
    ],
    addedTime: 'Added 3w ago',
    renderPreTitle: () => (
      <div className="relative w-full h-32 rounded-lg overflow-hidden mb-space-md bg-surface-muted">
        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Artisanal handcrafted ceramic bowls" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDjL0BGhByTYfNw_xVzxM6nXCpUsfWdblNpXVs2qtGsx3cd2rgM97DpQeaTgoPOBrmbphvtaOquHrFfX-9nSOBPicQGleaJlssLZOEcVSXl7BtaII6nQeJbn9sbPEUY3HI9dnDmd5LJ2UFD4So2X-y-MbbgRXz6zH9rYprNY9sCzcsgU35Mty-ijEEKxco1Ehp9TGAB7hPAQm95rPILWFMBQBoQhRoShsY3pmhndW01sykUpDSQT3a0w" />
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-surface-pure/90 backdrop-blur-sm font-label-sm text-[10px] text-on-surface font-semibold">
          Event: Nov 18
        </div>
      </div>
    ),
    renderBody: () => (
      <div className="space-y-1.5 bg-surface-muted rounded-lg p-space-md mb-space-md font-body-sm text-body-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-tertiary">check_box</span>
          <span className="line-through text-outline">Taller de Cerámica San Felipe voucher</span>
        </div>
        <div className="flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-[16px] text-secondary">check_box_outline_blank</span>
          <span>Lamy 2000 Fountain pen (Makrolon)</span>
        </div>
        <div className="flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-[16px] text-secondary">check_box_outline_blank</span>
          <span>Japanese loose-leaf tea selection</span>
        </div>
      </div>
    )
  }
]

export default function MyHubPage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [resources, setResources] = useState(() => {
    try {
      const saved = localStorage.getItem('studenthub_myhub_resources')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (err) {
      console.error('Error loading myhub resources:', err)
    }
    return INITIAL_RESOURCES
  })
  const [clipperUrl, setClipperUrl] = useState('')
  const [clipperFeedback, setClipperFeedback] = useState('')
  const [appTheme, setAppThemeState] = useState(() => getAppTheme())

  useEffect(() => {
    try {
      localStorage.setItem('studenthub_myhub_resources', JSON.stringify(resources))
    } catch (err) {
      console.error('Error saving myhub resources:', err)
    }
  }, [resources])

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail && APP_THEMES.some((t) => t.id === e.detail)) {
        setAppThemeState(e.detail)
      } else if (!e.detail) {
        setAppThemeState(getAppTheme())
      }
    }
    window.addEventListener('app_theme_style_changed', handleThemeChange)
    window.addEventListener('app_theme_changed', handleThemeChange)
    return () => {
      window.removeEventListener('app_theme_style_changed', handleThemeChange)
      window.removeEventListener('app_theme_changed', handleThemeChange)
    }
  }, [])

  const themeTokens = useMemo(() => getAppThemeTokens(appTheme), [appTheme])

  // Estados para Modal de Recurso
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingResource, setEditingResource] = useState(null)
  const [resourceFormData, setResourceFormData] = useState({
    title: '',
    url: '',
    category: 'dev',
    description: '',
    imageUrl: '',
  })

  const handleOpenAddModal = () => {
    setEditingResource(null)
    setResourceFormData({
      title: '',
      url: '',
      category: 'dev',
      description: '',
      imageUrl: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (item) => {
    setEditingResource(item)
    setResourceFormData({
      title: item.title || '',
      url: item.link || '',
      category: item.category || 'dev',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
    })
    setIsModalOpen(true)
  }

  const handleSaveResource = (data) => {
    if (!data.title?.trim()) return

    const categoryLabels = {
      dev: 'Dev & Design',
      university: 'University',
      personal: 'Personal',
      maker: 'Maker & 3D',
    }

    const categoryColors = {
      dev: 'bg-primary-container',
      university: 'bg-tag-university-text',
      personal: 'bg-tag-personal-text',
      maker: 'bg-tag-personal-text',
    }

    const cleanCategory = (data.category || 'dev').toLowerCase().trim()
    const cleanUrl = data.url?.trim() || ''

    if (editingResource) {
      setResources((prev) =>
        prev.map((r) =>
          r.id === editingResource.id
            ? {
                ...r,
                title: data.title.trim(),
                link: cleanUrl,
                linkDisplay: cleanUrl.replace(/^https?:\/\//, '').trim() || cleanUrl,
                category: cleanCategory,
                categoryLabel: categoryLabels[cleanCategory] || 'Custom Resource',
                categoryDotColor: categoryColors[cleanCategory] || 'bg-primary-container',
                description: data.description?.trim() || r.description,
                imageUrl: data.imageUrl?.trim() || r.imageUrl,
              }
            : r
        )
      )
    } else {
      const newResource = {
        id: `resource-${Date.now()}`,
        category: cleanCategory,
        categoryLabel: categoryLabels[cleanCategory] || 'Custom Resource',
        categoryDotColor: categoryColors[cleanCategory] || 'bg-primary-container',
        title: data.title.trim(),
        link: cleanUrl,
        linkDisplay: cleanUrl.replace(/^https?:\/\//, '').trim() || cleanUrl,
        description: data.description?.trim() || 'Recurso guardado en el workspace.',
        imageUrl: data.imageUrl?.trim() || '',
        tags: [
          { label: `#${cleanCategory.charAt(0).toUpperCase() + cleanCategory.slice(1)}`, bg: 'bg-surface-muted', text: 'text-secondary' },
        ],
        addedTime: 'Just now',
      }
      setResources((prev) => [newResource, ...prev])
    }
    setIsModalOpen(false)
  }

  const handleDeleteResource = (id) => {
    setResources((prev) => prev.filter((r) => r.id !== id))
  }

  const handleIngestLink = () => {
    if (!clipperUrl.trim()) return
    const rawUrl = clipperUrl.trim()
    let cleanUrl = rawUrl
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl
    }
    let domain = cleanUrl
    try {
      const u = new URL(cleanUrl)
      domain = u.hostname.replace(/^www\./i, '')
    } catch (_) {
      // ignore
    }

    const newResource = {
      id: `resource-${Date.now()}`,
      category: 'dev',
      categoryLabel: 'Dev & Design',
      categoryDotColor: 'bg-primary-container',
      title: domain || 'Recurso Web',
      link: cleanUrl,
      linkDisplay: domain || cleanUrl,
      description: `Capturado vía Fast Web Clipper (${new Date().toLocaleDateString()}).`,
      imageUrl: '',
      tags: [
        { label: '#Clipped', bg: 'bg-surface-muted', text: 'text-primary' },
        { label: '#Web', bg: 'bg-surface-muted', text: 'text-secondary' },
      ],
      addedTime: 'Just now',
    }

    setResources((prev) => [newResource, ...prev])
    setClipperUrl('')
    setClipperFeedback('Enlace guardado correctamente en tu Hub')
    setTimeout(() => setClipperFeedback(''), 3000)
  }

  const resourceModalFields = [
    { name: 'title', label: 'Título del Recurso', type: 'text', required: true, placeholder: 'Ej: React 19 Docs' },
    { name: 'url', label: 'URL / Enlace', type: 'text', required: true, placeholder: 'https://...' },
    {
      name: 'category',
      label: 'Categoría',
      type: 'select',
      options: [
        { value: 'dev', label: 'Dev & Design' },
        { value: 'university', label: 'University' },
        { value: 'personal', label: 'Personal' },
        { value: 'maker', label: 'Maker & 3D' },
      ],
    },
    { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Breve resumen del recurso...' },
    { name: 'imageUrl', label: 'URL de Imagen (Opcional)', type: 'text', placeholder: 'https://images.unsplash.com/...' },
  ]

  const filteredResources = resources.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory
    const matchesSearch = !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const categories = [
    { id: 'all', label: 'All', count: resources.length },
    { id: 'university', label: 'University', count: resources.filter(r => r.category === 'university').length },
    { id: 'dev', label: 'Dev & Design', count: resources.filter(r => r.category === 'dev').length },
    { id: 'personal', label: 'Personal', count: resources.filter(r => r.category === 'personal').length },
    { id: 'maker', label: 'Maker & 3D', count: resources.filter(r => r.category === 'maker').length },
  ]

  return (
    <div className="relative w-full min-h-[calc(100vh-140px)] rounded-3xl overflow-hidden">
      {/* CAPA DE CRISTAL ESMERILADO (FROSTED GLASS) OPACO QUE TAPA TODO EL CONTENIDO */}
      <div className="absolute inset-0 z-30 backdrop-blur-2xl bg-white/75 dark:bg-[#0b0f19]/85 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl p-6 sm:p-8 rounded-3xl border border-white/60 dark:border-slate-800 shadow-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-[32px]">lock</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mx-auto">
              <span className="material-symbols-outlined text-[14px]">construction</span>
              <span>Próximamente</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              My Hub (Recursos & Enlaces)
            </h2>
            <p className="text-xs sm:text-sm text-secondary leading-relaxed">
              Este módulo se encuentra protegido y en fase de optimización. Si deseas trabajar únicamente con Calendario y Tareas, puedes desactivar esta pestaña en <strong>Ajustes &gt; Pestañas Visibles</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>Ir al Calendario</span>
          </button>
        </div>
      </div>

      {/* Contenido subyacente difuminado e inactivo que se vislumbra sutilmente a través del cristal */}
      <div className="filter blur-md pointer-events-none select-none opacity-25 flex flex-col w-full">
        {/* Banner de Próximamente (MVP - Fase de lanzamiento) */}
        <div className="w-full max-w-[2400px] 2xl:max-w-[2800px] mx-auto mb-4 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">construction</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Módulo My Hub en Optimización (Próximamente)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white">
                  Beta Preview
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px] leading-relaxed">
                Estamos integrando previsualizaciones enriquecidas y enlaces cruzados con tu calendario. Puedes ocultar o activar esta pestaña en <strong>Configuración &gt; Pestañas Visibles</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Hub Top Utility & Summary Banner */}
        <div className="w-full max-w-[2400px] 2xl:max-w-[2800px] mx-auto flex flex-col gap-space-lg">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-secondary font-code-sm text-code-sm">
              <span className="material-symbols-outlined text-[16px] text-primary">hub</span>
              <span>{appTheme === 'brutalista' ? '[DEPÓSITO DE PROTOCOLOS // LOCAL DB]' : 'Workspace • Knowledge Repository'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
              <span className="text-tertiary">SYNCED WITH LOCAL DB</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              {themeTokens?.labels?.myHub || 'My Hub'}
            </h1>
            <p className="font-body-md text-body-md text-secondary">
              {themeTokens?.labels?.myHubDesc || 'Saved links, documentation, and personal project notes curated for rapid context retrieval.'}
            </p>
          </div>
          {/* Quick Metrics Pill Strip */}
          <div className="flex items-center gap-space-sm">
            <button
              onClick={handleOpenAddModal}
              className={`font-label-md text-label-md px-space-md py-2 flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-all cursor-pointer ${
                appTheme === 'brutalista'
                  ? 'rounded-none bg-yellow-300 text-black border-2 border-black font-bold uppercase shadow-[3px_3px_0px_#000]'
                  : appTheme === 'executive'
                  ? 'rounded-md bg-slate-800 hover:bg-slate-900 text-white font-medium border border-slate-700 shadow-xs'
                  : appTheme === 'aura'
                  ? 'rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-xs'
                  : 'bg-primary-container text-on-primary rounded-lg'
              }`}
              id="btnNewResource"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>{appTheme === 'brutalista' ? '[+] AÑADIR' : '+ New Resource'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Search, Filter & Control Toolbar */}
        <div className="bg-surface-pure rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row gap-space-md items-stretch lg:items-center justify-between">
          {/* Search Input Container */}
          <div className="relative flex-1 min-w-[260px] max-w-xl">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full bg-surface-muted rounded-lg pl-9 pr-16 py-2 text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-pure shadow-inner transition-colors"
              id="hubSearchInput"
              placeholder="Search items by title or description..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-pure shadow-sm font-code-sm text-[10px] text-secondary">⌘F</kbd>
            </div>
          </div>
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none" id="categoryTabContainer">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-space-md py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-surface-muted text-on-surface font-semibold shadow-sm'
                    : 'text-secondary hover:bg-surface-muted hover:text-on-surface'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`font-code-sm text-[11px] px-1 rounded ${
                  activeCategory === cat.id ? 'bg-surface-pure text-on-surface' : 'bg-surface-muted text-secondary'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
          {/* Controls: Sort & Layout Toggle */}
          <div className="flex items-center gap-space-sm self-end lg:self-auto">
            {/* Sort Dropdown Trigger */}
            <div className="relative group">
              <button className="bg-surface-muted hover:bg-surface-variant text-on-surface font-label-md text-label-md px-space-md py-2 rounded-lg flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-[16px] text-secondary">sort</span>
                <span id="sortLabel">Recently Added</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">expand_more</span>
              </button>
            </div>
            {/* View Mode Segmented Switch */}
            <div className="bg-surface-muted p-0.5 rounded-lg flex items-center">
              <button className="p-1.5 rounded-md bg-surface-pure shadow-sm text-on-surface transition-all flex items-center justify-center" id="viewGridBtn" title="Masonry Grid">
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button className="p-1.5 rounded-md text-secondary hover:text-on-surface transition-all flex items-center justify-center" id="viewListBtn" title="List View">
                <span className="material-symbols-outlined text-[18px]">view_agenda</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Stat Summary Strip */}
        <div className="flex items-center justify-between px-space-xs text-secondary font-code-sm text-code-sm">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
            <span>INDEXED: <span className="text-on-surface font-medium" id="visibleCounter">{filteredResources.length} displayed</span></span>
            <span className="text-outline-variant">•</span>
            <span>LAST AUTO-CRAWL: 14 mins ago</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
            <span className="text-on-surface-variant font-label-sm text-label-sm">Live Workspace Sync</span>
          </div>
        </div>

        {/* Dynamic Cards Layout or Empty State */}
        {filteredResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-space-3xl px-space-lg text-center bg-surface-pure rounded-xl shadow-sm" id="noResultsState">
            <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center text-outline mb-space-md">
              <span className="material-symbols-outlined text-[24px]">search_off</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">No matching resources found</h3>
            <p className="font-body-md text-body-md text-secondary max-w-sm mb-space-md">
              Adjust your search query or reset the category filters to display saved documentation and bookmarks.
            </p>
            <button
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
              className="bg-surface-muted hover:bg-surface-variant text-on-surface font-label-md text-label-md px-space-md py-1.5 rounded-lg transition-colors cursor-pointer"
              id="resetFiltersBtn"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-space-lg space-y-space-lg transition-all duration-300" id="resourceGrid">
            {filteredResources.map((item) => (
              <article
                key={item.id}
                className="resource-card break-inside-avoid bg-surface-pure rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                data-category={item.category}
              >
                <div>
                  {/* Header metadata */}
                  <div className="flex items-start justify-between gap-space-sm mb-space-sm">
                    <div className="flex items-center gap-space-xs">
                      <span className={`w-2 h-2 rounded-full ${item.categoryDotColor}`}></span>
                      <span className="font-code-sm text-code-sm text-secondary uppercase tracking-wider">{item.categoryLabel}</span>
                    </div>
                    <div className="flex items-center gap-1 text-secondary opacity-80 group-hover:opacity-100 transition-opacity">
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm font-semibold ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      )}
                      {item.verified && (
                        <span className="material-symbols-outlined text-[16px] text-tertiary" title="Print-ready files valid">verified</span>
                      )}
                      {item.icon && (
                        <span className={`material-symbols-outlined text-[16px] ${item.category === 'personal' ? 'text-tag-health-text' : 'text-primary-container'}`}>{item.icon}</span>
                      )}
                      {item.lock && (
                        <span className="material-symbols-outlined text-[16px] text-outline">lock</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1 rounded text-secondary hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="Edit Resource"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteResource(item.id)}
                        className="p-1 rounded text-secondary hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                        title="Delete Resource"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Optional thumbnail / banner */}
                  {item.renderPreTitle ? (
                    item.renderPreTitle()
                  ) : item.imageUrl ? (
                    <div className="relative w-full h-36 rounded-lg overflow-hidden mb-space-md bg-surface-muted">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        src={item.imageUrl}
                        alt={item.title}
                      />
                    </div>
                  ) : null}

                  {/* Card Title */}
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold mb-space-xs group-hover:text-primary-container transition-colors">
                    {item.title}
                  </h2>

                  {/* Optional link */}
                  {item.link && (
                    <a
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-muted text-primary-container font-code-sm text-code-sm hover:bg-surface-variant transition-colors mb-space-md"
                      href={item.link}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span className="material-symbols-outlined text-[13px]">link</span>
                      <span>{item.linkDisplay}</span>
                      <span className="material-symbols-outlined text-[13px]">north_east</span>
                    </a>
                  )}

                  {/* Optional location badge */}
                  {item.location && (
                    <div className="flex items-center gap-space-xs mb-space-md">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-tag-health-bg text-tag-health-text font-code-sm text-code-sm">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        <span>{item.location}</span>
                      </span>
                    </div>
                  )}

                  {/* Optional pre-body reader buttons */}
                  {item.renderPreBody && item.renderPreBody()}

                  {/* Snippet */}
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-space-md">
                    {item.description}
                  </p>

                  {/* Custom Body Block */}
                  {item.renderBody && item.renderBody()}
                </div>

                {/* Card Footer */}
                <div className="pt-space-md flex flex-wrap items-center justify-between gap-space-xs bg-surface-subtle -mx-space-lg -mb-space-lg px-space-lg py-space-sm rounded-b-xl">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.tags.map((tag, idx) => (
                      <span key={idx} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-label-sm ${tag.bg} ${tag.text}`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <span className="font-code-sm text-[11px] text-secondary">{item.addedTime}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Bottom Hub Ingestion Quick Bar */}
        <div className="bg-surface-pure rounded-xl p-space-md shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md mt-space-md">
          <div className="flex items-center gap-space-sm text-secondary">
            <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
            </div>
            <div>
              <div className="font-headline-sm text-body-sm text-on-surface font-semibold">Fast Web Clipper Active</div>
              <div className="font-body-sm text-body-sm text-secondary">Send any browser URL via chrome-extension or paste clipboard items here.</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-space-xs w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <input
                className="bg-surface-muted rounded-lg px-space-md py-1.5 text-on-surface font-code-sm text-code-sm placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-64"
                placeholder="https://ejemplo.com..."
                type="text"
                value={clipperUrl}
                onChange={(e) => setClipperUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleIngestLink()
                }}
              />
            </div>
            <button
              onClick={handleIngestLink}
              disabled={!clipperUrl.trim()}
              className="w-full sm:w-auto bg-primary-container text-on-primary disabled:opacity-50 hover:bg-primary text-on-surface font-label-md text-label-md px-space-md py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Ingest Link
            </button>
            {clipperFeedback && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
                {clipperFeedback}
              </span>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Universal Modal para Crear / Editar Recurso */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveResource}
        title={editingResource ? 'Editar Recurso' : 'Nuevo Recurso en el Hub'}
        fields={resourceModalFields}
        formData={resourceFormData}
        onChangeField={(name, value) => setResourceFormData((prev) => ({ ...prev, [name]: value }))}
      />
    </div>
  )
}
