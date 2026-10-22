import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FALLBACK_NEWS,
  getDailyNews,
  getNewsPreferences,
  getPersonalizedNews,
} from '../services/newsService'
import NewsSwipePersonalizer from '../components/news/NewsSwipePersonalizer'

const CATEGORIES = [
  { key: 'all', label: 'Todas' },
  { key: 'ai', label: 'Inteligencia Artificial' },
  { key: 'tech', label: 'Tecnología' },
  { key: 'science', label: 'Ciencia' },
  { key: 'productivity', label: 'Productividad' },
  { key: 'university', label: 'Universidad' },
  { key: 'software', label: 'Desarrollo' },
]

export default function NewsPage() {
  const [rawNews, setRawNews] = useState(FALLBACK_NEWS)
  const [preferences, setPreferences] = useState(() => getNewsPreferences())
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isPersonalizerOpen, setIsPersonalizerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Format today's date in Spanish (e.g., "Jueves, 22 de octubre de 2026")
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
      setRawNews(data && Array.isArray(data) && data.length > 0 ? data : FALLBACK_NEWS)
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

  // Personalized and ranked news feed
  const personalizedArticles = useMemo(() => {
    return getPersonalizedNews(rawNews, preferences)
  }, [rawNews, preferences])

  // Filtered by active category pill
  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'all') return personalizedArticles
    return personalizedArticles.filter((item) => item.categoryKey === selectedCategory)
  }, [personalizedArticles, selectedCategory])

  return (
    <div className="min-h-full pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
      {/* Hero Header */}
      <div className="pt-6 pb-8 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 capitalize">
              <span className="material-symbols-outlined text-[15px]">event</span>
              {todayFormatted}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Edición Diaria
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Noticias Diarias
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Titulares y actualidad sobre inteligencia artificial, ciencia, tecnología y vida universitaria. Personalizado según tus intereses.
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

      {/* Category Pills Filter */}
      <div className="py-4 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.key
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'bg-white dark:bg-[#1a1f2c] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* News Grid (6 structured items) */}
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
                      // Fallback gradient placeholder if external image fails to load
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Badges on Image */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {article.category}
                    </span>
                    {article.isRecommended && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 backdrop-blur-md text-white shadow-xs">
                        ⭐ Recomendado
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-3 text-[11px] text-white/90 font-medium drop-shadow-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {article.readTime || article.readingTime}
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

              {/* Card Footer with Direct External Link */}
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {article.publishedAt}
                </span>

                <a
                  href={article.url || article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover transition-colors py-1 px-2.5 rounded-lg hover:bg-primary/10"
                >
                  <span>Leer fuente</span>
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
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
          <p className="text-sm">No hay noticias en esta categoría hoy.</p>
        </div>
      )}

      {/* Tinder Swipe Personalizer Modal */}
      <NewsSwipePersonalizer
        isOpen={isPersonalizerOpen}
        onClose={() => setIsPersonalizerOpen(false)}
        articles={rawNews}
        onPreferenceChange={handlePreferencesUpdated}
      />
    </div>
  )
}
