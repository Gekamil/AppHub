package com.apphub.workspace;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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

        int pendingCount = prefs.getInt("pending_tasks_count", 0);
        views.setTextViewText(R.id.tv_hub_status, pendingCount > 0 ? (pendingCount + " pendientes") : "Al día");

        // Timer action
        Intent timerIntent = new Intent(context, MainActivity.class);
        timerIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        timerIntent.putExtra("route", "/auto-organizer?action=timer");
        views.setOnClickPendingIntent(R.id.btn_action_timer, PendingIntent.getActivity(
                context, 301, timerIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // New Task action
        Intent taskIntent = new Intent(context, MainActivity.class);
        taskIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        taskIntent.putExtra("route", "/auto-organizer?action=new-task");
        views.setOnClickPendingIntent(R.id.btn_action_task, PendingIntent.getActivity(
                context, 302, taskIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // Quick Note action
        Intent noteIntent = new Intent(context, MainActivity.class);
        noteIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        noteIntent.putExtra("route", "/auto-organizer?action=quick-note");
        views.setOnClickPendingIntent(R.id.btn_action_note, PendingIntent.getActivity(
                context, 303, noteIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // My Hub action
        Intent hubIntent = new Intent(context, MainActivity.class);
        hubIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        hubIntent.putExtra("route", "/my-hub");
        views.setOnClickPendingIntent(R.id.btn_action_hub, PendingIntent.getActivity(
                context, 304, hubIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
