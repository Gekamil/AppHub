package com.apphub.workspace;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    private static final String PREFS_NAME = "StudentHubWidgets";
    private static WidgetBridgePlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void notifyRoute(String route) {
        if (instance != null && route != null) {
            JSObject data = new JSObject();
            data.put("route", route);
            instance.notifyListeners("onWidgetRoute", data);
        }
    }

    @PluginMethod
    public void getInitialRoute(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("route", MainActivity.initialRoute);
        MainActivity.initialRoute = null;
        call.resolve(ret);
    }

    @PluginMethod
    public void updateWidgetsData(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        String todayEvents = call.getString("todayEvents");
        if (todayEvents != null) {
            editor.putString("today_events", todayEvents);
        }

        String todayEventsFull = call.getString("todayEventsFull");
        if (todayEventsFull != null) {
            editor.putString("today_events_full", todayEventsFull);
        }

        String calendarColor = call.getString("calendarColor");
        if (calendarColor != null) {
            editor.putString("calendar_color", calendarColor);
        }

        String weeklyDistribution = call.getString("weeklyDistribution");
        if (weeklyDistribution != null) {
            editor.putString("weekly_plan_distribution", weeklyDistribution);
        }

        String focusTaskTitle = call.getString("focusTaskTitle");
        if (focusTaskTitle != null) {
            editor.putString("focus_task_title", focusTaskTitle);
        }

        String focusTaskSub = call.getString("focusTaskSub");
        if (focusTaskSub != null) {
            editor.putString("focus_task_sub", focusTaskSub);
        }

        String weeklyEvents = call.getString("weeklyEvents");
        if (weeklyEvents != null) {
            editor.putString("weekly_events", weeklyEvents);
        }

        String weeklyEventsFlat = call.getString("weeklyEventsFlat");
        if (weeklyEventsFlat != null) {
            editor.putString("weekly_events_flat_list", weeklyEventsFlat);
        }

        String monthEventsMap = call.getString("monthEventsMap");
        if (monthEventsMap != null) {
            editor.putString("month_events_map", monthEventsMap);
        }

        Integer pendingCount = call.getInt("pendingCount");
        if (pendingCount != null) {
            editor.putInt("pending_tasks_count", pendingCount);
        }

        Integer monthEventsCount = call.getInt("monthEventsCount");
        if (monthEventsCount != null) {
            editor.putInt("month_events_count", monthEventsCount);
        }

        String weekSummary = call.getString("weekSummary");
        if (weekSummary != null) {
            editor.putString("week_summary", weekSummary);
        }

        String monthHighlights = call.getString("monthHighlights");
        if (monthHighlights != null) {
            editor.putString("month_highlights", monthHighlights);
        }

        editor.apply();

        // Refresh all widgets
        AppWidgetManager manager = AppWidgetManager.getInstance(context);

        ComponentName calComponent = new ComponentName(context, CalendarWidgetProvider.class);
        int[] calIds = manager.getAppWidgetIds(calComponent);
        for (int id : calIds) {
            CalendarWidgetProvider.updateWidget(context, manager, id);
        }

        ComponentName wpComponent = new ComponentName(context, WeeklyPlanWidgetProvider.class);
        int[] wpIds = manager.getAppWidgetIds(wpComponent);
        manager.notifyAppWidgetViewDataChanged(wpIds, R.id.lv_weekly_plan);
        for (int id : wpIds) {
            WeeklyPlanWidgetProvider.updateWidget(context, manager, id);
        }

        ComponentName hubComponent = new ComponentName(context, AppWidgetsProvider.class);
        int[] hubIds = manager.getAppWidgetIds(hubComponent);
        for (int id : hubIds) {
            AppWidgetsProvider.updateWidget(context, manager, id);
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("calendarWidgetsUpdated", calIds.length);
        ret.put("weeklyWidgetsUpdated", wpIds.length);
        ret.put("hubWidgetsUpdated", hubIds.length);
        call.resolve(ret);
    }

    @PluginMethod
    public void getWidgetStatus(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] calIds = manager.getAppWidgetIds(new ComponentName(context, CalendarWidgetProvider.class));
        int[] wpIds = manager.getAppWidgetIds(new ComponentName(context, WeeklyPlanWidgetProvider.class));
        int[] hubIds = manager.getAppWidgetIds(new ComponentName(context, AppWidgetsProvider.class));

        JSObject ret = new JSObject();
        ret.put("isAvailable", true);
        ret.put("calendarWidgetsCount", calIds.length);
        ret.put("weeklyWidgetsCount", wpIds.length);
        ret.put("hubWidgetsCount", hubIds.length);
        call.resolve(ret);
    }
}
