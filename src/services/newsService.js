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
    title: 'Groq y la nueva ola de procesadores LPU: cómo la inferencia ultrarrápida revoluciona los asistentes en tiempo real',
    summary: 'Las unidades de procesamiento de lenguaje (LPU) logran velocidades de generación superiores a 300 tokens por segundo, posibilitando respuestas de voz instantáneas y razonamiento reactivo sin la latencia de las GPUs tradicionales.',
    content: 'Las unidades de procesamiento de lenguaje (LPU) diseñadas por Groq han marcado un punto de inflexión en la velocidad de inferencia de modelos de lenguaje grande (LLM). Frente a las GPUs convencionales optimizadas para entrenamiento paralelo masivo, la arquitectura LPU ofrece una latencia determinista y un throughput que supera ampliamente los 300 tokens por segundo en modelos como Llama 3.',
    readTime: '3 min',
    readingTime: '3 min',
    sourceName: 'Xataka',
    source: 'Xataka',
    url: 'https://www.xataka.com/categoria/inteligencia-artificial',
    sourceUrl: 'https://www.xataka.com/categoria/inteligencia-artificial',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 09:30',
    tags: ['IA', 'Groq', 'LPU', 'Inferencia', 'Hardware'],
  },
  {
    id: 'news-2',
    category: 'Tecnología & Software',
    categoryKey: 'tech',
    title: 'Herramientas esenciales de desarrollo y productividad para universitarios: de editores Markdown a bases de datos locales',
    summary: 'Genbeta analiza las mejores utilidades open-source y plataformas ligeras para organizar apuntes, proyectos de código y calendarios académicos sin depender de suscripciones costosas ni comprometer la privacidad.',
    content: 'El flujo de trabajo digital del estudiante moderno exige herramientas versátiles y sin ataduras propietarias. Una selección de aplicaciones locales basadas en Markdown y motores de sincronización P2P permite gestionar bibliografías, apuntes colaborativos y cronogramas de estudio con rendimiento fluido y máxima privacidad.',
    readTime: '4 min',
    readingTime: '4 min',
    sourceName: 'Genbeta',
    source: 'Genbeta',
    url: 'https://www.genbeta.com/herramientas/mejores-aplicaciones-estudiantes',
    sourceUrl: 'https://www.genbeta.com/herramientas/mejores-aplicaciones-estudiantes',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 10:15',
    tags: ['Productividad', 'Open Source', 'Software', 'Estudiantes'],
  },
  {
    id: 'news-3',
    category: 'Ciencia & Computación',
    categoryKey: 'science',
    title: 'Avance clave en corrección de errores cuánticos: los nuevos cúbits lógicos reducen el ruido experimental',
    summary: 'Investigadores logran implementar esquemas de redundancia cuántica en chips superconductores que disminuyen la tasa de fallos en un orden de magnitud, acercando la viabilidad de la computación cuántica tolerante a fallos.',
    content: 'Un consorcio internacional de físicos e ingenieros ha demostrado la supresión activa de decoherencia en cúbits cuánticos lógicos entrelazados. Este hito experimental, publicado en Nature, solventa uno de los mayores cuellos de botella para el escalado de ordenadores cuánticos aplicados a la ciencia de materiales.',
    readTime: '5 min',
    readingTime: '5 min',
    sourceName: 'Agencia SINC / Nature',
    source: 'Agencia SINC / Nature',
    url: 'https://www.agenciasinc.es/Noticias/computacion-cuantica',
    sourceUrl: 'https://www.agenciasinc.es/Noticias/computacion-cuantica',
    imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 08:45',
    tags: ['Ciencia', 'Cuántica', 'Física', 'Innovación'],
  },
  {
    id: 'news-4',
    category: 'Productividad & Neurociencia',
    categoryKey: 'productivity',
    title: 'El protocolo Pomodoro 50/10 y timeboxing: qué dice la evidencia sobre la atención sostenida y el descanso cognitivo',
    summary: 'Estudios cognitivos demuestran que fraccionar jornadas de estudio intensivo en bloques de 50 minutos con 10 minutos de desconexión sin pantallas previene la fatiga mental y maximiza la retención a largo plazo.',
    content: 'La neurociencia aplicada a la educación respalda los descansos estratégicos para la consolidación de la memoria a largo plazo. Alternar bloques de enfoque profundo de 50 minutos con pausas de 10 minutos libres de dopamina digital previene el agotamiento cognitivo durante periodos de exámenes.',
    readTime: '3 min',
    readingTime: '3 min',
    sourceName: 'Xataka Ciencia',
    source: 'Xataka Ciencia',
    url: 'https://www.xataka.com/tag/productividad',
    sourceUrl: 'https://www.xataka.com/tag/productividad',
    imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 11:00',
    tags: ['Pomodoro', 'Productividad', 'Hábitos', 'Enfoque'],
  },
  {
    id: 'news-5',
    category: 'Vida Universitaria',
    categoryKey: 'university',
    title: 'Convocatorias Erasmus+ y becas de movilidad e investigación para estudiantes universitarios y máster',
    summary: 'Se publican las nuevas dotaciones económicas y plazos de solicitud para estancias académicas internacionales, con complementos reforzados para proyectos STEM y prácticas en empresas tecnológicas europeas.',
    content: 'La Comisión Europea y las universidades asociadas han ampliado los fondos de movilidad para el próximo curso académico. Los estudiantes de grado y posgrado contarán con mayores cuantías mensuales y ayudas específicas para la transición ecológica y el desarrollo de competencias digitales en el extranjero.',
    readTime: '4 min',
    readingTime: '4 min',
    sourceName: 'El País Educación',
    source: 'El País Educación',
    url: 'https://elpais.com/educacion/universidad/',
    sourceUrl: 'https://elpais.com/educacion/universidad/',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 07:50',
    tags: ['Universidad', 'Erasmus', 'Becas', 'Estudios', 'Movilidad'],
  },
  {
    id: 'news-6',
    category: 'Desarrollo Web & Ecosistema',
    categoryKey: 'software',
    title: 'Vite y los nuevos bundlers basados en Rust: compilación ultrarrápida y recarga instantánea HMR',
    summary: 'La consolidación de herramientas nativas como Rolldown y esbuild acelera drásticamente el desarrollo en React, minimizando los tiempos de empaquetado y ofreciendo una experiencia fluida a 60 FPS en proyectos frontend.',
    content: 'El ecosistema frontend experimenta una profunda transición hacia compiladores escritos en lenguajes nativos de sistemas. Las nuevas versiones de Vite integran pipelines optimizados con Rust, lo que reduce a milisegundos el tiempo de arranque de servidores de desarrollo y garantiza recargas HMR instantáneas.',
    readTime: '3 min',
    readingTime: '3 min',
    sourceName: 'Genbeta Dev',
    source: 'Genbeta Dev',
    url: 'https://www.genbeta.com/desarrollo/vite-herramientas-frontend',
    sourceUrl: 'https://www.genbeta.com/desarrollo/vite-herramientas-frontend',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    publishedAt: 'Hoy, 11:30',
    tags: ['Vite', 'React', 'Rust', 'Frontend', 'HMR'],
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
            const isValid = val !== null &&
              val !== '' &&
              typeof val !== 'boolean' &&
              !Array.isArray(val) &&
              (typeof val !== 'string' || val.trim() !== '') &&
              Number.isFinite(num) &&
              num > 0
            weights[key] = Math.max(0.1, Math.min(2.5, isValid ? Number(num.toFixed(2)) : 1.0))
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
        const isValid = val !== null &&
          val !== '' &&
          typeof val !== 'boolean' &&
          !Array.isArray(val) &&
          (typeof val !== 'string' || val.trim() !== '') &&
          Number.isFinite(num) &&
          num > 0
        weights[key] = Math.max(0.1, Math.min(2.5, isValid ? Number(num.toFixed(2)) : 1.0))
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
