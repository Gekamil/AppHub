package com.apphub.workspace;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONArray;

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

        // Read calendar accent color
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

        // Populate weekly plan counts & pending badge
        String weeklyPlanJson = prefs.getString("weekly_plan_distribution", "[]");
        int totalPending = prefs.getInt("pending_tasks_count", 0);
        views.setTextViewText(R.id.tv_wp_pending_badge, totalPending + (totalPending == 1 ? " tarea" : " tareas"));

        if (hasCalendarColor) {
            views.setInt(R.id.tv_wp_pending_badge, "setBackgroundColor", accentColor);
        } else {
            views.setInt(R.id.tv_wp_pending_badge, "setBackgroundResource", R.drawable.widget_pill_active);
        }

        int mutedColor = context.getResources().getColor(R.color.widget_text_muted);
        int activeCountColor = accentColor;

        try {
            JSONArray countsArray = new JSONArray(weeklyPlanJson);
            for (int i = 0; i < 7 && i < countsArray.length(); i++) {
                int count = countsArray.optInt(i, 0);
                views.setTextViewText(countIds[i], String.valueOf(count));
                views.setTextColor(countIds[i], count > 0 ? activeCountColor : mutedColor);
            }
        } catch (Exception ignored) {
        }

        // Tint footer button text
        views.setTextColor(R.id.tv_wp_btn_open_tasks, accentColor);
        if (hasCalendarColor) {
            views.setInt(R.id.btn_weekly_voice_add, "setBackgroundColor", accentColor);
        }

        // Connect RemoteViewsService to ListView
        Intent serviceIntent = new Intent(context, WeeklyPlanWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.lv_weekly_plan, serviceIntent);
        views.setEmptyView(R.id.lv_weekly_plan, R.id.tv_wp_empty);

        // Open App PendingIntent for footer & strip
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openAppIntent.putExtra("route", "/auto-organizer");
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 200, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_open_tasks_app, openAppPendingIntent);

        // Setup voice add button pending intent: opens MainActivity with route to voice copilot
        Intent voiceIntent = new Intent(context, MainActivity.class);
        voiceIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        voiceIntent.putExtra("route", "/calendar?action=voice_copilot&autoRecord=true");
        PendingIntent voicePendingIntent = PendingIntent.getActivity(
                context, 205, voiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_weekly_voice_add, voicePendingIntent);

        // PendingIntent template for ListView items
        Intent itemClickIntent = new Intent(context, MainActivity.class);
        itemClickIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent itemClickPendingIntent = PendingIntent.getActivity(
                context, 201, itemClickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
        views.setPendingIntentTemplate(R.id.lv_weekly_plan, itemClickPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
