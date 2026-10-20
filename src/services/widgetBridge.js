import { Capacitor, registerPlugin } from '@capacitor/core';

const WidgetBridge = registerPlugin('WidgetBridge');

const DAY_NAMES = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday is day 0, Sunday is day 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function syncWidgetData({ tasks = [], calendars = [] } = {}) {
  try {
    const today = new Date();
    const todayKey = formatDateKey(today);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const pendingTasks = tasks.filter(t => !t.completed && !t.done);

    // 1. Today events
    let todayTasks = tasks.filter(t => {
      if (!t.date) return false;
      return t.date === todayKey || t.date.startsWith(todayKey);
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    if (todayTasks.length === 0) {
      // Fallback: pick the first 3 pending tasks
      todayTasks = pendingTasks.slice(0, 3);
    }

    const todayEvents = todayTasks.slice(0, 4).map(t => ({
      time: t.time || 'Hoy',
      title: t.title || 'Tarea',
      tag: t.role || t.context || t.calendarName || 'General',
      completed: !!(t.completed || t.done),
    }));

    // 2. Weekly Distribution and Complete Events by Day (Lun -> Dom)
    const monday = getStartOfWeek(today);
    const weeklyDistribution = [0, 0, 0, 0, 0, 0, 0];
    const weeklyEvents = [];
    const weeklyEventsFlat = [];

    const SPANISH_DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const SPANISH_DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const SPANISH_MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const dayKey = formatDateKey(dayDate);
      const dayNum = dayDate.getDate();
      const monthShort = SPANISH_MONTHS_SHORT[dayDate.getMonth()];
      const isToday = dayKey === todayKey;

      const dayTasks = tasks
        .filter(t => t.date && t.date.startsWith(dayKey))
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      weeklyDistribution[i] = dayTasks.length;

      const dayEventsList = dayTasks.map(t => ({
        id: t.id,
        time: t.time || 'Todo el día',
        title: t.title || 'Tarea',
        tag: t.role || t.context || t.calendarName || 'General',
        completed: !!(t.completed || t.done),
      }));

      weeklyEvents.push({
        dayIndex: i,
        dayName: SPANISH_DAYS_FULL[i],
        dayShort: SPANISH_DAYS_SHORT[i],
        dayNumber: dayNum,
        monthShort,
        dateKey: dayKey,
        isToday,
        events: dayEventsList,
      });

      // Flat list for ListView in Android Widget
      weeklyEventsFlat.push({
        type: 'HEADER',
        title: `${SPANISH_DAYS_FULL[i]}, ${dayNum} ${monthShort}`,
        count: `${dayTasks.length} ${dayTasks.length === 1 ? 'tarea' : 'tareas'}`,
        isToday,
      });

      if (dayEventsList.length === 0) {
        weeklyEventsFlat.push({
          type: 'EMPTY',
          text: 'Sin eventos programados',
        });
      } else {
        dayEventsList.forEach(ev => {
          weeklyEventsFlat.push({
            type: 'EVENT',
            time: ev.time,
            title: ev.title,
            tag: ev.tag,
            completed: ev.completed,
          });
        });
      }
    }

    // 3. Month Events Map (for Calendar Grid dots)
    const monthEventsMap = {};
    tasks.forEach(t => {
      if (!t.date) return;
      const key = t.date.slice(0, 10);
      monthEventsMap[key] = (monthEventsMap[key] || 0) + 1;
      const d = new Date(key);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const dayStr = String(d.getDate());
        monthEventsMap[dayStr] = (monthEventsMap[dayStr] || 0) + 1;
      }
    });

    // 4. Focus task
    const highPriorityTask = pendingTasks.find(t => t.effort === 'high' || t.priority === 'urgent' || t.priority === 'high') || pendingTasks[0];
    const focusTaskTitle = highPriorityTask ? highPriorityTask.title : 'Sin tareas pendientes';
    const focusTaskSub = highPriorityTask
      ? `${highPriorityTask.role || highPriorityTask.context || 'General'} • ${highPriorityTask.time || 'Prioritaria'}`
      : 'Todo al día en StudentHub';

    // 5. Month count and highlights
    const monthTasks = pendingTasks.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthEventsCount = monthTasks.length;
    const weekTotal = weeklyDistribution.reduce((a, b) => a + b, 0);
    const weekSummary = `${weekTotal} ${weekTotal === 1 ? 'tarea programada' : 'tareas programadas'} para esta semana`;
    const monthHighlights = monthTasks.length > 0
      ? `Próxima entrega: ${monthTasks[0].title}`
      : 'No hay entregas pendientes este mes.';

    const payload = {
      todayEvents: JSON.stringify(todayEvents),
      weeklyDistribution: JSON.stringify(weeklyDistribution),
      weeklyEvents: JSON.stringify(weeklyEvents),
      weeklyEventsFlat: JSON.stringify(weeklyEventsFlat),
      monthEventsMap: JSON.stringify(monthEventsMap),
      focusTaskTitle,
      focusTaskSub,
      pendingCount: pendingTasks.length,
      monthEventsCount,
      weekSummary,
      monthHighlights,
    };

    // Cache locally for web or in-app preview
    localStorage.setItem('studenthub_widgets_data', JSON.stringify({
      ...payload,
      todayEventsList: todayEvents,
      weeklyDistributionList: weeklyDistribution,
      weeklyEventsList: weeklyEvents,
      weeklyEventsFlatList: weeklyEventsFlat,
      monthEventsMapping: monthEventsMap,
      lastUpdated: new Date().toISOString(),
    }));

    // If native Capacitor Android, push to Android Widget SharedPreferences
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      await WidgetBridge.updateWidgetsData(payload);
    }

    return { success: true };
  } catch (err) {
    console.warn('[WidgetBridge] Sync warning:', err);
    return { success: false, error: err.message };
  }
}

export function getCachedWidgetData() {
  try {
    const raw = localStorage.getItem('studenthub_widgets_data');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function checkInitialWidgetRoute(navigate) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
  try {
    const res = await WidgetBridge.getInitialRoute();
    if (res && res.route && typeof navigate === 'function') {
      navigate(res.route);
    }
  } catch (err) {
    console.debug('[WidgetBridge] getInitialRoute error:', err);
  }
}

export function listenWidgetRoute(navigate) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return () => {};
  try {
    const handle = WidgetBridge.addListener('onWidgetRoute', (data) => {
      if (data && data.route && typeof navigate === 'function') {
        navigate(data.route);
      }
    });
    return () => {
      handle.then((h) => h.remove()).catch(() => {});
    };
  } catch (err) {
    console.debug('[WidgetBridge] listenWidgetRoute error:', err);
    return () => {};
  }
}

