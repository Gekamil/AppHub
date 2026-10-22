package com.apphub.workspace;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

public class AppWidgetsProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "StudentHubWidgets";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_app_hub);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // Status Badge
        int pendingCount = prefs.getInt("pending_tasks_count", 0);
        views.setTextViewText(R.id.tv_hub_status, pendingCount > 0 ? (pendingCount + " pendientes") : "Al día");

        // Dynamic Accent Color
        String calColorHex = prefs.getString("calendar_color", null);
        int accentColor = context.getResources().getColor(R.color.widget_accent_default);
        boolean hasCalendarColor = false;
        if (calColorHex != null && !calColorHex.trim().isEmpty()) {
            try {
                accentColor = Color.parseColor(calColorHex.trim());
                hasCalendarColor = true;
            } catch (Exception ignored) {
            }
        }

        // Apply dynamic accent tinting
        if (hasCalendarColor) {
            views.setInt(R.id.tv_hub_status, "setBackgroundColor", accentColor);
            views.setTextColor(R.id.tv_action_event_title, accentColor);
            views.setTextColor(R.id.tv_action_task_title, accentColor);
            views.setTextColor(R.id.tv_action_cal_title, accentColor);
            views.setTextColor(R.id.tv_action_view_title, accentColor);
        }

        // 1. Hero Voice Card action: Dictar evento o tarea a la IA
        Intent voiceIntent = new Intent(context, MainActivity.class);
        voiceIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        voiceIntent.putExtra("route", "/calendar?action=voice_copilot&autoRecord=true");
        PendingIntent voicePendingIntent = PendingIntent.getActivity(
                context, 300, voiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_hub_voice_card, voicePendingIntent);

        // 2. New Event (+ Evento)
        Intent eventIntent = new Intent(context, MainActivity.class);
        eventIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        eventIntent.putExtra("route", "/calendar?action=new-event");
        views.setOnClickPendingIntent(R.id.btn_action_event, PendingIntent.getActivity(
                context, 301, eventIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // 3. New Task (+ Tarea)
        Intent taskIntent = new Intent(context, MainActivity.class);
        taskIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        taskIntent.putExtra("route", "/auto-organizer?action=new-task");
        views.setOnClickPendingIntent(R.id.btn_action_task, PendingIntent.getActivity(
                context, 302, taskIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // 4. Open Calendar (Agenda)
        Intent calIntent = new Intent(context, MainActivity.class);
        calIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        calIntent.putExtra("route", "/calendar");
        views.setOnClickPendingIntent(R.id.btn_action_calendar, PendingIntent.getActivity(
                context, 303, calIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // 5. Open Tasks (Organizador)
        Intent tasksIntent = new Intent(context, MainActivity.class);
        tasksIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        tasksIntent.putExtra("route", "/auto-organizer");
        views.setOnClickPendingIntent(R.id.btn_action_tasks_view, PendingIntent.getActivity(
                context, 304, tasksIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
