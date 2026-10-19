package com.apphub.workspace;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

public class CalendarWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_SET_MODE = "com.apphub.workspace.ACTION_CALENDAR_SET_MODE";
    public static final String EXTRA_MODE = "mode";
    private static final String PREFS_NAME = "StudentHubWidgets";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_SET_MODE.equals(intent.getAction())) {
            String mode = intent.getStringExtra(EXTRA_MODE);
            if (mode == null) {
                mode = "DAY";
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString("calendar_mode", mode).apply();

            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, CalendarWidgetProvider.class);
            int[] allIds = manager.getAppWidgetIds(thisWidget);
            for (int widgetId : allIds) {
                updateWidget(context, manager, widgetId);
            }
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String currentMode = prefs.getString("calendar_mode", "DAY");

        // Format today's date in Spanish (e.g., Lunes, 19 Oct)
        SimpleDateFormat sdf = new SimpleDateFormat("EEEE, d MMM", new Locale("es", "ES"));
        String todayString = sdf.format(Calendar.getInstance().getTime());
        if (todayString.length() > 0) {
            todayString = Character.toUpperCase(todayString.charAt(0)) + todayString.substring(1);
        }
        views.setTextViewText(R.id.tv_calendar_header_subtitle, todayString);

        // Configure mode tabs
        views.setInt(R.id.btn_mode_day, "setBackgroundResource",
                "DAY".equalsIgnoreCase(currentMode) ? R.drawable.widget_pill_active : R.drawable.widget_pill_inactive);
        views.setTextColor(R.id.btn_mode_day,
                "DAY".equalsIgnoreCase(currentMode) ? 0xFFFFFFFF : 0xFF334155);

        views.setInt(R.id.btn_mode_week, "setBackgroundResource",
                "WEEK".equalsIgnoreCase(currentMode) ? R.drawable.widget_pill_active : R.drawable.widget_pill_inactive);
        views.setTextColor(R.id.btn_mode_week,
                "WEEK".equalsIgnoreCase(currentMode) ? 0xFFFFFFFF : 0xFF334155);

        views.setInt(R.id.btn_mode_month, "setBackgroundResource",
                "MONTH".equalsIgnoreCase(currentMode) ? R.drawable.widget_pill_active : R.drawable.widget_pill_inactive);
        views.setTextColor(R.id.btn_mode_month,
                "MONTH".equalsIgnoreCase(currentMode) ? 0xFFFFFFFF : 0xFF334155);

        // Toggle Views visibility
        views.setViewVisibility(R.id.layout_day_view, "DAY".equalsIgnoreCase(currentMode) ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.layout_week_view, "WEEK".equalsIgnoreCase(currentMode) ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.layout_month_view, "MONTH".equalsIgnoreCase(currentMode) ? View.VISIBLE : View.GONE);

        // Bind Day View data
        bindDayData(views, prefs);

        // Bind Week View data
        bindWeekData(views, prefs);

        // Bind Month View data
        bindMonthData(views, prefs);

        // Setup PendingIntents for Day / Week / Month tab clicks
        views.setOnClickPendingIntent(R.id.btn_mode_day, createModePendingIntent(context, "DAY", 101));
        views.setOnClickPendingIntent(R.id.btn_mode_week, createModePendingIntent(context, "WEEK", 102));
        views.setOnClickPendingIntent(R.id.btn_mode_month, createModePendingIntent(context, "MONTH", 103));

        // Open Main App when clicking footer
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openAppIntent.putExtra("route", "/calendar");
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 100, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_open_calendar_app, openAppPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent createModePendingIntent(Context context, String mode, int requestCode) {
        Intent intent = new Intent(context, CalendarWidgetProvider.class);
        intent.setAction(ACTION_SET_MODE);
        intent.putExtra(EXTRA_MODE, mode);
        return PendingIntent.getBroadcast(
                context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static void bindDayData(RemoteViews views, SharedPreferences prefs) {
        String eventsJson = prefs.getString("today_events", "[]");
        try {
            JSONArray array = new JSONArray(eventsJson);
            if (array.length() == 0) {
                views.setViewVisibility(R.id.tv_day_empty, View.VISIBLE);
                views.setViewVisibility(R.id.item_day_1, View.GONE);
                views.setViewVisibility(R.id.item_day_2, View.GONE);
                views.setViewVisibility(R.id.item_day_3, View.GONE);
                return;
            }

            views.setViewVisibility(R.id.tv_day_empty, View.GONE);

            // Item 1
            if (array.length() > 0) {
                JSONObject obj1 = array.getJSONObject(0);
                views.setViewVisibility(R.id.item_day_1, View.VISIBLE);
                views.setTextViewText(R.id.tv_day_time_1, obj1.optString("time", "Todo el día"));
                views.setTextViewText(R.id.tv_day_title_1, obj1.optString("title", "Evento"));
                views.setTextViewText(R.id.tv_day_tag_1, obj1.optString("tag", "General"));
            } else {
                views.setViewVisibility(R.id.item_day_1, View.GONE);
            }

            // Item 2
            if (array.length() > 1) {
                JSONObject obj2 = array.getJSONObject(1);
                views.setViewVisibility(R.id.item_day_2, View.VISIBLE);
                views.setTextViewText(R.id.tv_day_time_2, obj2.optString("time", "Todo el día"));
                views.setTextViewText(R.id.tv_day_title_2, obj2.optString("title", "Evento"));
                views.setTextViewText(R.id.tv_day_tag_2, obj2.optString("tag", "General"));
            } else {
                views.setViewVisibility(R.id.item_day_2, View.GONE);
            }

            // Item 3
            if (array.length() > 2) {
                JSONObject obj3 = array.getJSONObject(2);
                views.setViewVisibility(R.id.item_day_3, View.VISIBLE);
                views.setTextViewText(R.id.tv_day_time_3, obj3.optString("time", "Todo el día"));
                views.setTextViewText(R.id.tv_day_title_3, obj3.optString("title", "Evento"));
                views.setTextViewText(R.id.tv_day_tag_3, obj3.optString("tag", "General"));
            } else {
                views.setViewVisibility(R.id.item_day_3, View.GONE);
            }
        } catch (Exception e) {
            views.setViewVisibility(R.id.tv_day_empty, View.VISIBLE);
            views.setViewVisibility(R.id.item_day_1, View.GONE);
            views.setViewVisibility(R.id.item_day_2, View.GONE);
            views.setViewVisibility(R.id.item_day_3, View.GONE);
        }
    }

    private static void bindWeekData(RemoteViews views, SharedPreferences prefs) {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY);

        int[] numIds = {
                R.id.tv_week_num_1, R.id.tv_week_num_2, R.id.tv_week_num_3,
                R.id.tv_week_num_4, R.id.tv_week_num_5, R.id.tv_week_num_6, R.id.tv_week_num_7
        };

        for (int i = 0; i < 7; i++) {
            int dayNum = cal.get(Calendar.DAY_OF_MONTH);
            views.setTextViewText(numIds[i], String.valueOf(dayNum));
            cal.add(Calendar.DAY_OF_MONTH, 1);
        }

        String summary = prefs.getString("week_summary", "Vista rápida de tus compromisos de la semana.");
        views.setTextViewText(R.id.tv_week_summary, summary);
    }

    private static void bindMonthData(RemoteViews views, SharedPreferences prefs) {
        SimpleDateFormat sdf = new SimpleDateFormat("MMMM yyyy", new Locale("es", "ES"));
        String monthName = sdf.format(Calendar.getInstance().getTime());
        if (monthName.length() > 0) {
            monthName = Character.toUpperCase(monthName.charAt(0)) + monthName.substring(1);
        }
        views.setTextViewText(R.id.tv_month_title, monthName + " • Vista General");

        int totalEvents = prefs.getInt("month_events_count", 0);
        views.setTextViewText(R.id.tv_month_total_events,
                totalEvents > 0 ? (totalEvents + " eventos programados este mes") : "Sin eventos este mes");

        String highlights = prefs.getString("month_highlights", "Planifica tus fechas y entregas desde StudentHub.");
        views.setTextViewText(R.id.tv_month_highlights, highlights);
    }
}
