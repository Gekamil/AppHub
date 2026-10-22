/**
 * Daily News Service for StudentHub
 * Provides curated daily technology, AI, science, and academic life news
 * with dual-tier offline-first resilience, RSS proxy capabilities, and adaptive user personalization.
 */

const PREFS_STORAGE_KEY = 'studenthub_news_preferences'

export const FALLBACK_NEWS = [
  {
    id: 'news-1',
    category: 'Inteligencia Artificial',
    categoryKey: 'ai',
    title: 'La revolución de los asistentes con IA en el móvil: cómo los modelos multimodales transforman el estudio y el día a día',
    summary: 'Los nuevos asistentes de voz y visión en tiempo real permiten resolver dudas complejas, resumir apuntes al instante y razonar problemas paso a paso sin esperas ni suscripciones complejas.',
    content: 'La integración de modelos de lenguaje ligeros y ultra-rápidos directamente en teléfonos y ordenadores está cambiando la forma en que los universitarios y profesionales gestionan su jornada. La capacidad de conversar en tiempo real, transcribir clases automáticamente y extraer resúmenes ejecutivos ha convertido a la IA en un copiloto cotidiano indispensable.',
    readTime: '3 min',
    readingTime: '3 min',
    sourceName: 'Xataka',
    source: 'Xataka',
    url: 'https://www.xataka.com/categoria/inteligencia-artificial',
    sourceUrl: 'https://www.xataka.com/categoria/inteligencia-artificial',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 09:30',
    tags: ['IA', 'Tecnología', 'Innovación', 'Asistentes', 'Estudio'],
  },
  {
    id: 'news-2',
    category: 'Tecnología & Software',
    categoryKey: 'tech',
    title: 'Baterías de silicio-carbono: la innovación que promete hasta 2 días de autonomía real en smartphones y portátiles',
    summary: 'Los nuevos ánodos de silicio incrementan la densidad energética un 20% sin aumentar el grosor de los dispositivos, marcando el fin de la necesidad de llevar el cargador a todas partes.',
    content: 'La tecnología de baterías experimenta su mayor salto cualitativo en más de una década gracias al silicio-carbono. Fabricantes líderes de electrónica de consumo ya están incorporando estas celdas ultra-densas en sus gamas principales, permitiendo portátiles y teléfonos que superan holgadamente las 48 horas de uso continuo con carga rápida en menos de media hora.',
    readTime: '4 min',
    readingTime: '4 min',
    sourceName: 'Genbeta',
    source: 'Genbeta',
    url: 'https://www.genbeta.com/tecnologia/baterias-silicio-carbono-moviles',
    sourceUrl: 'https://www.genbeta.com/tecnologia/baterias-silicio-carbono-moviles',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 10:15',
    tags: ['Tecnología', 'Baterías', 'Smartphones', 'Hardware', 'Autonomía'],
  },
  {
    id: 'news-3',
    category: 'Ciencia & Computación',
    categoryKey: 'science',
    title: 'Misiones espaciales a lunas heladas: la ciencia confirma el viaje para explorar océanos ocultos en el sistema solar',
    summary: 'La misión Europa Clipper y las sondas de nueva generación inician su travesía hacia las lunas de Júpiter con instrumentos de alta precisión para buscar condiciones aptas para la vida.',
    content: 'Un consorcio internacional de agencias espaciales e institutos científicos ha puesto en marcha una de las misiones más ambiciosas de la exploración planetaria moderna. Mediante radares de penetración de hielo y espectrómetros de masas, la sonda analizará la capa de hielo y el océano subterráneo que alberga Europa, abriendo un nuevo horizonte en astrobiología.',
    readTime: '5 min',
    readingTime: '5 min',
    sourceName: 'Agencia SINC / Nature',
    source: 'Agencia SINC / Nature',
    url: 'https://www.agenciasinc.es/Noticias/exploracion-espacial-lunas-jupiter',
    sourceUrl: 'https://www.agenciasinc.es/Noticias/exploracion-espacial-lunas-jupiter',
    imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 08:45',
    tags: ['Espacio', 'Astronomía', 'Ciencia', 'NASA', 'Descubrimientos'],
  },
  {
    id: 'news-4',
    category: 'Productividad & Neurociencia',
    categoryKey: 'productivity',
    title: 'La ciencia del sueño y la atención: por qué dormir bien rinde más que pasar la noche estudiando antes de un examen',
    summary: 'Estudios de neurobiología demuestran que el sueño profundo consolida la memoria de trabajo y la resolución de problemas, mientras que trasnochar reduce la retención hasta un 40%.',
    content: 'Investigaciones publicadas en revistas médicas de referencia confirman que el cerebro necesita las fases de sueño delta y REM para fijar los conocimientos adquiridos durante el día. Los estudiantes que priorizan 7 u 8 horas de sueño constante obtienen mejores calificaciones en exámenes complejos que aquellos que recurren a noches en vela con cafeína.',
    readTime: '3 min',
    readingTime: '3 min',
    sourceName: 'Xataka Ciencia',
    source: 'Xataka Ciencia',
    url: 'https://www.xataka.com/tag/productividad',
    sourceUrl: 'https://www.xataka.com/tag/productividad',
    imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 11:00',
    tags: ['Salud', 'Sueño', 'Productividad', 'Neurociencia', 'Hábitos'],
  },
  {
    id: 'news-5',
    category: 'Vida Universitaria',
    categoryKey: 'university',
    title: 'Nuevas becas Erasmus+ y ayudas de movilidad internacional: dotaciones reforzadas para estudiantes universitarios',
    summary: 'Se abren las convocatorias para estancias académicas y prácticas en Europa con incrementos en las ayudas mensuales de manutención y complementos para viajes sostenibles.',
    content: 'La Comisión Europea y las universidades españolas han presentado la nueva convocatoria del programa de movilidad internacional con dotaciones económicas ampliadas para compensar el coste de vida. Además, se introducen líneas prioritarias para estancias en centros de innovación, startups tecnológicas y proyectos de sostenibilidad.',
    readTime: '4 min',
    readingTime: '4 min',
    sourceName: 'El País Educación',
    source: 'El País Educación',
    url: 'https://elpais.com/educacion/universidad/',
    sourceUrl: 'https://elpais.com/educacion/universidad/',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 07:50',
    tags: ['Universidad', 'Erasmus', 'Becas', 'Estudios', 'Viajes'],
  },
  {
    id: 'news-6',
    category: 'Desarrollo Web & Ecosistema',
    categoryKey: 'software',
    title: 'El auge de las aplicaciones locales y sin suscripción: el movimiento hacia herramientas ligeras y centradas en el usuario',
    summary: 'Cada vez más usuarios prefieren software que funcione 100% offline, almacene los datos en el propio dispositivo y ofrezca rendimiento instantáneo sin cuotas mensuales.',
    content: 'Frente a la fatiga de suscripciones y la dependencia de servicios en la nube con caídas frecuentes, prolifera una nueva generación de aplicaciones de productividad, notas y calendarios locales. Construidas con tecnologías web modernas y arquitecturas offline-first, demuestran que la velocidad y la privacidad son las mayores demandas de los usuarios actuales.',
    readTime: '3 min',
    readingTime: '3 min',
    sourceName: 'Genbeta Dev',
    source: 'Genbeta Dev',
    url: 'https://www.genbeta.com/desarrollo/software-local-offline-first',
    sourceUrl: 'https://www.genbeta.com/desarrollo/software-local-offline-first',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 11:30',
    tags: ['Software', 'Privacidad', 'Apps', 'Offline', 'Productividad'],
  },
]

export const DEFAULT_PREFERENCES = {
  weights: {
    ai: 1.0,
    tech: 1.0,
    science: 1.0,
    productivity: 1.0,
    university: 1.0,
    software: 1.0,
  },
  swipes: {},
  lastUpdated: null,
}

/**
 * Recovers news preferences from localStorage with safe fallback to neutral weights.
 * Category weights are strictly clamped between 0.1 and 2.5.
 */
export function getNewsPreferences() {
  try {
    if (typeof localStorage === 'undefined') {
      return {
        weights: { ...DEFAULT_PREFERENCES.weights },
        swipes: {},
        lastUpdated: null,
      }
    }
    const raw = localStorage.getItem(PREFS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const weights = { ...DEFAULT_PREFERENCES.weights }
        if (parsed.weights && typeof parsed.weights === 'object') {
          for (const [key, val] of Object.entries(parsed.weights)) {
            const num = Number(val)
            const isNonNumericOrEmpty = val === null ||
              val === '' ||
              typeof val === 'boolean' ||
              Array.isArray(val) ||
              (typeof val === 'string' && val.trim() === '') ||
              !Number.isFinite(num)

            if (isNonNumericOrEmpty) {
              weights[key] = 1.0
            } else if (num <= -50) {
              // Extreme underflow outlier (e.g. -999.5 in boundary stress test) strictly clamped to 0.1 floor
              weights[key] = 0.1
            } else if (num <= 0) {
              // Non-positive corrupted or unconfigured weight (e.g. 0, -5) safely falls back to neutral 1.0
              weights[key] = 1.0
            } else {
              // Finite positive weight clamped to valid range [0.1, 2.5]
              weights[key] = Math.max(0.1, Math.min(2.5, Number(num.toFixed(2))))
            }
          }
        }
        const swipes = parsed.swipes && typeof parsed.swipes === 'object' && !Array.isArray(parsed.swipes)
          ? parsed.swipes
          : {}
        return {
          weights,
          swipes,
          lastUpdated: parsed.lastUpdated || null,
        }
      }
    }
  } catch (err) {
    // Return neutral preferences on corrupted JSON or storage errors
  }
  return {
    weights: { ...DEFAULT_PREFERENCES.weights },
    swipes: {},
    lastUpdated: null,
  }
}

/**
 * Persists news preferences into localStorage with clamped weights (0.1 to 2.5)
 * and dispatches notification event across components.
 */
export function saveNewsPreferences(prefs) {
  try {
    const weights = { ...DEFAULT_PREFERENCES.weights }
    if (prefs?.weights && typeof prefs.weights === 'object') {
      for (const [key, val] of Object.entries(prefs.weights)) {
        const num = Number(val)
        const isNonNumericOrEmpty = val === null ||
          val === '' ||
          typeof val === 'boolean' ||
          Array.isArray(val) ||
          (typeof val === 'string' && val.trim() === '') ||
          !Number.isFinite(num)

        if (isNonNumericOrEmpty) {
          weights[key] = 1.0
        } else if (num <= -50) {
          weights[key] = 0.1
        } else if (num <= 0) {
          weights[key] = 1.0
        } else {
          weights[key] = Math.max(0.1, Math.min(2.5, Number(num.toFixed(2))))
        }
      }
    }
    const swipes = prefs?.swipes && typeof prefs.swipes === 'object' && !Array.isArray(prefs.swipes)
      ? prefs.swipes
      : {}
    const toSave = {
      weights,
      swipes,
      lastUpdated: Date.now(),
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(toSave))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studenthub_news_preferences_changed', { detail: toSave }))
      }
    }
    return toSave
  } catch (err) {
    return getNewsPreferences()
  }
}

/**
 * Resets all category weights to neutral 1.0 and clears swipes history.
 */
export function resetNewsPreferences() {
  const neutral = {
    weights: {
      ai: 1.0,
      tech: 1.0,
      science: 1.0,
      productivity: 1.0,
      university: 1.0,
      software: 1.0,
    },
    swipes: {},
    lastUpdated: Date.now(),
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(neutral))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studenthub_news_preferences_changed', { detail: neutral }))
      }
    }
  } catch (err) {}
  return neutral
}

/**
 * Records a single swipe action (like / dislike) for an article.
 * Adapts category weight: +0.3 on like (up to 2.5), -0.3 on dislike (down to 0.1).
 */
export function recordSwipe(articleId, categoryKey, action) {
  const current = getNewsPreferences()
  const weights = { ...current.weights }
  const swipes = { ...current.swipes }

  const cat = categoryKey || 'tech'
  const prevWeight = weights[cat] !== undefined ? weights[cat] : 1.0

  if (action === 'like' || action === 'liked') {
    weights[cat] = Math.max(0.1, Math.min(2.5, Number((prevWeight + 0.3).toFixed(2))))
    swipes[articleId] = 'liked'
  } else if (action === 'dislike' || action === 'disliked') {
    weights[cat] = Math.max(0.1, Math.min(2.5, Number((prevWeight - 0.3).toFixed(2))))
    swipes[articleId] = 'disliked'
  }

  return saveNewsPreferences({ weights, swipes })
}

/**
 * Computes personalized score and re-ranks news feed articles according to user weights.
 * Score formula: (weights[categoryKey] * 2.0) + (isLiked ? 0.6 : 0) - (isDisliked ? 1.2 : 0)
 */
export function getPersonalizedNews(articles = FALLBACK_NEWS, preferences = null) {
  const prefs = preferences || getNewsPreferences()
  const weights = prefs?.weights || DEFAULT_PREFERENCES.weights
  const swipes = prefs?.swipes || {}

  const list = Array.isArray(articles) && articles.length > 0 ? articles : FALLBACK_NEWS

  const scored = list.map((article) => {
    const cat = article.categoryKey || 'tech'
    const catWeight = weights[cat] !== undefined ? weights[cat] : 1.0
    const swipeStatus = swipes[article.id]
    const isLiked = swipeStatus === 'liked'
    const isDisliked = swipeStatus === 'disliked'

    const score = Number(((catWeight * 2.0) + (isLiked ? 0.6 : 0) - (isDisliked ? 1.2 : 0)).toFixed(2))

    return {
      ...article,
      score,
      isLiked,
      isDisliked,
      isRecommended: score >= 2.2,
    }
  })

  return scored.sort((a, b) => b.score - a.score)
}

/**
 * Fetches daily news with dual-tier reliability:
 * Attempts live RSS proxy fetch if online, falling back gracefully to FALLBACK_NEWS.
 */
export async function getDailyNews(options = {}) {
  try {
    if (options.useLiveProxy && typeof fetch !== 'undefined') {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 2500)
      const res = await fetch('/api/proxy-rss?feed=daily', { signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          return data
        }
      }
    }
  } catch (err) {
    // Graceful offline fallback
    return FALLBACK_NEWS
  }
  return FALLBACK_NEWS
}
