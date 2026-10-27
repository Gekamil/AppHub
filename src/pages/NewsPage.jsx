import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FALLBACK_NEWS,
  getDailyNews,
  getNewsPreferences,
  getPersonalizedNews,
  toggleArticleLike,
  toggleArticleDislike,
  CATEGORY_METADATA,
  decodeHtmlEntities,
} from '../services/newsService'
import NewsSwipePersonalizer from '../components/news/NewsSwipePersonalizer'

const EDITORIAL_FILTERS = [
  { key: 'all', label: 'Todas', icon: 'newspaper' },
  { key: 'portada', label: 'España & Portada', icon: 'public' },
  { key: 'economia', label: 'Economía & Sociedad', icon: 'trending_up' },
  { key: 'deportes', label: 'Deportes', icon: 'sports_soccer' },
  { key: 'tecnologia', label: 'Tecnología & IA', icon: 'devices' },
  { key: 'favorites', label: 'Favoritas', icon: 'thumb_up' },
]

export default function NewsPage() {
  const [rawNews, setRawNews] = useState([])
  const [preferences, setPreferences] = useState(() => getNewsPreferences())
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [isPersonalizerOpen, setIsPersonalizerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [actionFeedback, setActionFeedback] = useState(null)

  // Formato de fecha en espanol (ej. "Martes, 27 de octubre de 2026")
  const todayFormatted = useMemo(() => {
    try {
      const d = new Date()
      return d.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch (e) {
      return 'Edición de hoy'
    }
  }, [])

  const refreshNews = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getDailyNews({ useLiveProxy: true, timeoutMs: 3500 })
      const clean = (Array.isArray(data) && data.length > 0 ? data : FALLBACK_NEWS).map((item) => ({
        ...item,
        title: decodeHtmlEntities(item.title || ''),
        summary: decodeHtmlEntities(item.summary || item.content || ''),
      }))
      setRawNews(clean)
    } catch (err) {
      setRawNews(FALLBACK_NEWS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handlePreferencesUpdated = useCallback(() => {
    setPreferences(getNewsPreferences())
  }, [])

  useEffect(() => {
    refreshNews()
    const handlePrefsChange = (e) => {
      if (e.detail) {
        setPreferences(e.detail)
      } else {
        setPreferences(getNewsPreferences())
      }
    }
    window.addEventListener('studenthub_news_preferences_changed', handlePrefsChange)
    return () => window.removeEventListener('studenthub_news_preferences_changed', handlePrefsChange)
  }, [refreshNews])

  // Limpiar mensaje flotante de feedback
  useEffect(() => {
    if (!actionFeedback) return
    const t = setTimeout(() => setActionFeedback(null), 2500)
    return () => clearTimeout(t)
  }, [actionFeedback])

  // Feed de noticias puntuado y ordenado por preferencias (likes / dislikes)
  const personalizedArticles = useMemo(() => {
    const list = rawNews && rawNews.length > 0 ? rawNews : FALLBACK_NEWS
    return getPersonalizedNews(list, preferences)
  }, [rawNews, preferences])

  // Filtrado por seccion editorial periodistica
  const filteredArticles = useMemo(() => {
    if (selectedFilter === 'favorites') {
      return personalizedArticles.filter((item) => item.isLiked)
    }
    if (selectedFilter === 'portada') {
      return personalizedArticles.filter((item) => {
        const cat = (item.categoryKey || '').toLowerCase()
        const source = (item.source || item.sourceName || '').toLowerCase()
        return (
          ['actualidad', 'portada', 'society', 'sociedad'].includes(cat) ||
          source.includes('el país') ||
          source.includes('rtve') ||
          source.includes('el mundo') ||
          source.includes('20 minutos') ||
          source.includes('europa press')
        )
      })
    }
    if (selectedFilter === 'economia') {
      return personalizedArticles.filter((item) => {
        const cat = (item.categoryKey || '').toLowerCase()
        return ['economy', 'salud', 'health', 'society', 'sociedad', 'university'].includes(cat)
      })
    }
    if (selectedFilter === 'deportes') {
      return personalizedArticles.filter((item) => {
        const cat = (item.categoryKey || '').toLowerCase()
        const source = (item.source || item.sourceName || '').toLowerCase()
        return cat === 'sports' || source.includes('marca') || /f[uú]tbol|liga|partido|deporte/i.test(item.title)
      })
    }
    if (selectedFilter === 'tecnologia') {
      return personalizedArticles.filter((item) => {
        const cat = (item.categoryKey || '').toLowerCase()
        const source = (item.source || item.sourceName || '').toLowerCase()
        return (
          ['tech', 'ai', 'software', 'gaming', 'science'].includes(cat) ||
          source.includes('xataka') ||
          source.includes('genbeta')
        )
      })
    }
    return personalizedArticles
  }, [personalizedArticles, selectedFilter])

  const handleLike = (articleId, categoryKey) => {
    toggleArticleLike(articleId, categoryKey)
    setPreferences(getNewsPreferences())
    const catLabel = CATEGORY_METADATA[categoryKey]?.label || categoryKey
    setActionFeedback(`Guardado: Priorizaremos mas noticias de ${catLabel}`)
  }

  const handleDislike = (articleId, categoryKey) => {
    toggleArticleDislike(articleId, categoryKey)
    setPreferences(getNewsPreferences())
    const catLabel = CATEGORY_METADATA[categoryKey]?.label || categoryKey
    setActionFeedback(`Guardado: Mostraremos menos noticias de ${catLabel}`)
  }

  // Identificador de color/estilo para el medio de comunicacion
  const getSourceBadgeStyle = (sourceName = '') => {
    const s = sourceName.toLowerCase()
    if (s.includes('el país')) return 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
    if (s.includes('rtve')) return 'bg-sky-600 text-white'
    if (s.includes('el mundo')) return 'bg-indigo-600 text-white'
    if (s.includes('marca')) return 'bg-red-600 text-white'
    if (s.includes('20 minutos')) return 'bg-teal-600 text-white'
    if (s.includes('xataka')) return 'bg-violet-600 text-white'
    if (s.includes('genbeta')) return 'bg-blue-600 text-white'
    if (s.includes('europa press')) return 'bg-slate-800 text-white'
    return 'bg-primary text-white'
  }

  const leadArticle = selectedFilter === 'all' && filteredArticles.length > 0 ? filteredArticles[0] : null
  const regularArticles = selectedFilter === 'all' && filteredArticles.length > 0 ? filteredArticles.slice(1) : filteredArticles

  return (
    <div className="min-h-full pb-16 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto relative animate-fade-in">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold backdrop-blur-md border border-white/10 dark:border-black/10 animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-emerald-400 dark:text-emerald-600">
            tune
          </span>
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Cabecera Periodistica */}
      <div className="pt-4 pb-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 capitalize">
              <span className="material-symbols-outlined text-[15px]">event</span>
              {todayFormatted}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Prensa de España • 12 Titulares en Vivo
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Noticias de Actualidad
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Las 12 noticias mas destacadas de hoy en España extraidas de El País, RTVE, El Mundo, Marca, 20 Minutos y Xataka. El orden se adapta a tus gustos.
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={refreshNews}
            disabled={isLoading}
            className="p-2.5 rounded-2xl bg-white dark:bg-[#161b26] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Recargar titulares de hoy"
            aria-label="Recargar titulares de hoy"
          >
            <span className={`material-symbols-outlined text-lg ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsPersonalizerOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">style</span>
            <span>Personalizar Feed</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Secciones Editoriales */}
      <div className="py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-x-auto max-w-full">
          {EDITORIAL_FILTERS.map((f) => {
            const isActive = selectedFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setSelectedFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  isActive
                    ? 'bg-white dark:bg-[#161b26] text-primary shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{f.icon}</span>
                <span>{f.label}</span>
                {f.key === 'all' && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {personalizedArticles.length}
                  </span>
                )}
                {f.key === 'favorites' && preferences?.swipes && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    {Object.values(preferences.swipes).filter((v) => v === 'liked').length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="text-xs text-slate-400 dark:text-slate-500 hidden sm:flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-emerald-500">auto_awesome</span>
          <span>Feed adaptativo ordenado por tus preferencias</span>
        </div>
      </div>

      {/* NOTICIA PRINCIPAL DE PORTADA (LEAD STORY) */}
      {leadArticle && (
        <section className="mt-2 mb-6 bg-white dark:bg-[#161b26] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all hover:shadow-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-full min-h-[260px] bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <img
                src={leadArticle.imageUrl}
                alt={leadArticle.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-xs ${getSourceBadgeStyle(leadArticle.sourceName || leadArticle.source)}`}>
                  {leadArticle.sourceName || leadArticle.source}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-primary">
                    {leadArticle.icon || CATEGORY_METADATA[leadArticle.categoryKey]?.icon || 'newspaper'}
                  </span>
                  <span>{leadArticle.category}</span>
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white/90 text-xs">
                <span>{leadArticle.publishedAt || 'Hoy'}</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {leadArticle.readTime || leadArticle.readingTime || '3 min'}
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 p-5 sm:p-7 flex flex-col justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary uppercase tracking-wider mb-2">
                  Noticia de Portada
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {leadArticle.title}
                </h2>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {leadArticle.summary}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLike(leadArticle.id, leadArticle.categoryKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                      leadArticle.isLiked
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                    }`}
                    title="Me interesa este tema"
                  >
                    <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                    <span>Me interesa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDislike(leadArticle.id, leadArticle.categoryKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                      leadArticle.isDisliked
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600'
                    }`}
                    title="Descartar tema"
                  >
                    <span className="material-symbols-outlined text-[16px]">thumb_down</span>
                    <span>Menos</span>
                  </button>
                </div>

                <a
                  href={leadArticle.url || leadArticle.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Leer Noticia</span>
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GRID DE NOTICIAS EDITORIALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {regularArticles.map((article) => {
          return (
            <article
              key={article.id}
              className="group bg-white dark:bg-[#161b26] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Imagen y Badges */}
                <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs ${getSourceBadgeStyle(article.sourceName || article.source)}`}>
                      {article.sourceName || article.source}
                    </span>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/65 backdrop-blur-md text-white border border-white/20 flex items-center gap-1 shadow-xs">
                      <span className="material-symbols-outlined text-[12px] text-sky-400">
                        {article.icon || CATEGORY_METADATA[article.categoryKey]?.icon || 'newspaper'}
                      </span>
                      <span>{article.category}</span>
                    </span>
                  </div>

                  <div className="absolute bottom-2 right-3 text-[11px] text-white/90 font-medium drop-shadow-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {article.readTime || article.readingTime || '3 min'}
                  </div>
                </div>

                {/* Cuerpo del Articulo */}
                <div className="p-4 sm:p-5">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h2>

                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {article.summary}
                  </p>
                </div>
              </div>

              {/* Pie de Tarjeta con Like, Dislike y Enlace */}
              <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 truncate">
                  {article.publishedAt || 'Hoy'}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      handleLike(article.id, article.categoryKey)
                    }}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      article.isLiked
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/10'
                    }`}
                    title="Me interesa este tema"
                    aria-label="Me interesa este tema"
                  >
                    <span className="material-symbols-outlined text-[17px]">thumb_up</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      handleDislike(article.id, article.categoryKey)
                    }}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      article.isDisliked
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold scale-105'
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-500/10'
                    }`}
                    title="Descartar tema"
                    aria-label="Descartar tema"
                  >
                    <span className="material-symbols-outlined text-[17px]">thumb_down</span>
                  </button>

                  <a
                    href={article.url || article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors py-1 px-2 rounded-lg hover:bg-primary/10 ml-0.5"
                  >
                    <span>Fuente</span>
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {filteredArticles.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 dark:text-slate-600">
            feed
          </span>
          <p className="text-sm font-medium">No hay noticias en esta seccion o han sido filtradas por tus preferencias.</p>
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
          >
            Ver todas las noticias
          </button>
        </div>
      )}

      {/* Tinder Swipe Personalizer Modal */}
      <NewsSwipePersonalizer
        isOpen={isPersonalizerOpen}
        onClose={() => setIsPersonalizerOpen(false)}
        articles={rawNews && rawNews.length > 0 ? rawNews : FALLBACK_NEWS}
        onPreferenceChange={handlePreferencesUpdated}
      />
    </div>
  )
}
