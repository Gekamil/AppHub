import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FALLBACK_NEWS,
  getDailyNews,
  getNewsPreferences,
  getPersonalizedNews,
  toggleArticleLike,
  toggleArticleDislike,
  CATEGORY_METADATA,
} from '../services/newsService'
import NewsSwipePersonalizer from '../components/news/NewsSwipePersonalizer'

const VIEW_FILTERS = [
  { key: 'all', label: 'Todas las noticias', icon: 'newspaper' },
  { key: 'recommended', label: 'Recomendadas', icon: 'star' },
  { key: 'favorites', label: 'Favoritas', icon: 'thumb_up' },
]

export default function NewsPage() {
  const [rawNews, setRawNews] = useState([])
  const [preferences, setPreferences] = useState(() => getNewsPreferences())
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [isPersonalizerOpen, setIsPersonalizerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [actionFeedback, setActionFeedback] = useState(null)

  // Format today's date in Spanish (e.g., "Viernes, 23 de octubre de 2026")
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
      const data = await getDailyNews({ useLiveProxy: true, timeoutMs: 3000 })
      setRawNews(Array.isArray(data) && data.length > 0 ? data : FALLBACK_NEWS)
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

  // Clear toast feedback
  useEffect(() => {
    if (!actionFeedback) return
    const t = setTimeout(() => setActionFeedback(null), 2500)
    return () => clearTimeout(t)
  }, [actionFeedback])

  // Personalized and ranked news feed (prioritizing likes and deprioritizing dislikes)
  const personalizedArticles = useMemo(() => {
    const list = rawNews && rawNews.length > 0 ? rawNews : FALLBACK_NEWS
    return getPersonalizedNews(list, preferences)
  }, [rawNews, preferences])

  // Filtered by selected feed view (Todas / Recomendadas / Favoritas)
  const filteredArticles = useMemo(() => {
    if (selectedFilter === 'recommended') return personalizedArticles.filter((item) => item.isRecommended)
    if (selectedFilter === 'favorites') return personalizedArticles.filter((item) => item.isLiked)
    return personalizedArticles
  }, [personalizedArticles, selectedFilter])

  const handleLike = (articleId, categoryKey) => {
    toggleArticleLike(articleId, categoryKey)
    setPreferences(getNewsPreferences())
    const catLabel = CATEGORY_METADATA[categoryKey]?.label || categoryKey
    setActionFeedback(`Preferencia guardada: Más noticias de ${catLabel}`)
  }

  const handleDislike = (articleId, categoryKey) => {
    toggleArticleDislike(articleId, categoryKey)
    setPreferences(getNewsPreferences())
    const catLabel = CATEGORY_METADATA[categoryKey]?.label || categoryKey
    setActionFeedback(`Preferencia guardada: Menos noticias de ${catLabel}`)
  }

  return (
    <div className="min-h-full pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in relative">
      {/* Toast Feedback for direct like / dislike interactions */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold backdrop-blur-md border border-white/10 dark:border-black/10 animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-emerald-400 dark:text-emerald-600">
            tune
          </span>
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="pt-6 pb-8 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 capitalize">
              <span className="material-symbols-outlined text-[15px]">event</span>
              {todayFormatted}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              12 Titulares del Día
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Noticias Diarias
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            12 noticias actualizadas hoy sobre deportes, actualidad, ciencia, economía, cultura, vida universitaria y tecnología. Se adaptan dinámicamente según tus likes y dislikes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={refreshNews}
            disabled={isLoading}
            className="p-2.5 rounded-2xl bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Recargar noticias"
            aria-label="Recargar noticias"
          >
            <span className={`material-symbols-outlined text-lg ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsPersonalizerOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">style</span>
            <span>Personalizar Feed</span>
          </button>
        </div>
      </div>

      {/* Clean, intuitive view filter selector */}
      <div className="py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
          {VIEW_FILTERS.map((f) => {
            const isActive = selectedFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setSelectedFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  isActive
                    ? 'bg-white dark:bg-[#1e2433] text-primary shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{f.icon}</span>
                <span>{f.label}</span>
                {f.key === 'all' && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    {personalizedArticles.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-emerald-500">auto_awesome</span>
          <span>Feed adaptativo ordenado por tus preferencias</span>
        </div>
      </div>

      {/* News Grid (12 dynamic items with category icons and like/dislike buttons) */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.map((article) => {
          return (
            <article
              key={article.id}
              className="group bg-white dark:bg-[#161b26] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                {/* Article Header Image / Category Hero */}
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

                  {/* Badges on Image with category icon */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/65 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5 shadow-xs">
                      <span className="material-symbols-outlined text-[13px] text-sky-400">
                        {article.icon || CATEGORY_METADATA[article.categoryKey]?.icon || 'newspaper'}
                      </span>
                      <span>{article.category}</span>
                    </span>

                    {article.isRecommended && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 backdrop-blur-md text-white shadow-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">star</span>
                        <span>Recomendado</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-3 text-[11px] text-white/90 font-medium drop-shadow-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {article.readTime || article.readingTime || '3 min'}
                  </div>
                </div>

                {/* Article Body */}
                <div className="p-5">
                  <div className="text-[11px] font-semibold text-primary mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">newspaper</span>
                    {article.sourceName || article.source}
                  </div>

                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h2>

                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {article.summary}
                  </p>
                </div>
              </div>

              {/* Card Footer with Direct External Link and Like / Dislike Buttons */}
              <div className="px-5 pb-4 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 truncate">
                  {article.publishedAt || 'Hoy'}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      handleLike(article.id, article.categoryKey)
                    }}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      article.isLiked
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                        : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                    title={article.isLiked ? 'Te gusta (Interés guardado)' : 'Me interesa este tema'}
                    aria-label="Me gusta este tema"
                  >
                    <span className="material-symbols-outlined text-[17px]">thumb_up</span>
                  </button>

                  {/* Dislike Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      handleDislike(article.id, article.categoryKey)
                    }}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      article.isDisliked
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold scale-105'
                        : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10'
                    }`}
                    title={article.isDisliked ? 'Descartada (Menos noticias de este tema)' : 'No me interesa este tema'}
                    aria-label="No me interesa este tema"
                  >
                    <span className="material-symbols-outlined text-[17px]">thumb_down</span>
                  </button>

                  {/* External Source Link */}
                  <a
                    href={article.url || article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover transition-colors py-1 px-2.5 rounded-lg hover:bg-primary/10 ml-0.5"
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
          <p className="text-sm">No hay noticias en esta categoría hoy o han sido descartadas según tus preferencias.</p>
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
