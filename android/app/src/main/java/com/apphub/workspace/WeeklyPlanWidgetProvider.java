package com.apphub.workspace;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

public class WeeklyPlanWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "StudentHubWidgets";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_weekly_plan);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // Format week range subtitle
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY);
        SimpleDateFormat sdfDay = new SimpleDateFormat("d", new Locale("es", "ES"));
        SimpleDateFormat sdfMonth = new SimpleDateFormat("MMM", new Locale("es", "ES"));
        String startDay = sdfDay.format(cal.getTime());

        int[] numIds = {
                R.id.tv_wp_day_lun_num, R.id.tv_wp_day_mar_num, R.id.tv_wp_day_mie_num,
                R.id.tv_wp_day_jue_num, R.id.tv_wp_day_vie_num, R.id.tv_wp_day_sab_num, R.id.tv_wp_day_dom_num
        };

        int[] countIds = {
                R.id.tv_wp_day_lun_count, R.id.tv_wp_day_mar_count, R.id.tv_wp_day_mie_count,
                R.id.tv_wp_day_jue_count, R.id.tv_wp_day_vie_count, R.id.tv_wp_day_sab_count, R.id.tv_wp_day_dom_count
        };

        // Populate 7 days numbers
        for (int i = 0; i < 7; i++) {
            int d = cal.get(Calendar.DAY_OF_MONTH);
            views.setTextViewText(numIds[i], String.valueOf(d));
            cal.add(Calendar.DAY_OF_MONTH, 1);
        }

        cal.add(Calendar.DAY_OF_MONTH, -1);
        String endDay = sdfDay.format(cal.getTime());
        String monthName = sdfMonth.format(cal.getTime());
        views.setTextViewText(R.id.tv_wp_subtitle, startDay + " - " + endDay + " " + monthName + " • Vista Semanal");

        // Populate weekly plan counts
        String weeklyPlanJson = prefs.getString("weekly_plan_distribution", "[]");
        int totalPending = prefs.getInt("pending_tasks_count", 0);
        views.setTextViewText(R.id.tv_wp_pending_badge, totalPending + (totalPending == 1 ? " tarea" : " tareas"));

        try {
            JSONArray countsArray = new JSONArray(weeklyPlanJson);
            for (int i = 0; i < 7 && i < countsArray.length(); i++) {
                int count = countsArray.optInt(i, 0);
                views.setTextViewText(countIds[i], String.valueOf(count));
                views.setTextColor(countIds[i], count > 0 ? 0xFF0071E3 : 0xFF94A3B8);
            }
        } catch (Exception ignored) {
        }

        // Focus card
        String focusTitle = prefs.getString("focus_task_title", "Sin tareas pendientes urgentes");
        String focusSub = prefs.getString("focus_task_sub", "Todo al día en StudentHub");
        views.setTextViewText(R.id.tv_wp_focus_title, focusTitle);
        views.setTextViewText(R.id.tv_wp_focus_sub, focusSub);

        // Open App PendingIntent
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openAppIntent.putExtra("route", "/auto-organizer");
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 200, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_open_tasks_app, openAppPendingIntent);
        views.setOnClickPendingIntent(R.id.wp_card_today, openAppPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
