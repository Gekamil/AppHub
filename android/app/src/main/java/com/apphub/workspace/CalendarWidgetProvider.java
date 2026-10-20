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

    private static final int[] CELL_TEXT_IDS = {
            R.id.tv_cal_d0, R.id.tv_cal_d1, R.id.tv_cal_d2, R.id.tv_cal_d3, R.id.tv_cal_d4, R.id.tv_cal_d5, R.id.tv_cal_d6,
            R.id.tv_cal_d7, R.id.tv_cal_d8, R.id.tv_cal_d9, R.id.tv_cal_d10, R.id.tv_cal_d11, R.id.tv_cal_d12, R.id.tv_cal_d13,
            R.id.tv_cal_d14, R.id.tv_cal_d15, R.id.tv_cal_d16, R.id.tv_cal_d17, R.id.tv_cal_d18, R.id.tv_cal_d19, R.id.tv_cal_d20,
            R.id.tv_cal_d21, R.id.tv_cal_d22, R.id.tv_cal_d23, R.id.tv_cal_d24, R.id.tv_cal_d25, R.id.tv_cal_d26, R.id.tv_cal_d27,
            R.id.tv_cal_d28, R.id.tv_cal_d29, R.id.tv_cal_d30, R.id.tv_cal_d31, R.id.tv_cal_d32, R.id.tv_cal_d33, R.id.tv_cal_d34,
            R.id.tv_cal_d35, R.id.tv_cal_d36, R.id.tv_cal_d37, R.id.tv_cal_d38, R.id.tv_cal_d39, R.id.tv_cal_d40, R.id.tv_cal_d41
    };

    private static final int[] CELL_DOT_IDS = {
            R.id.tv_cal_dot0, R.id.tv_cal_dot1, R.id.tv_cal_dot2, R.id.tv_cal_dot3, R.id.tv_cal_dot4, R.id.tv_cal_dot5, R.id.tv_cal_dot6,
            R.id.tv_cal_dot7, R.id.tv_cal_dot8, R.id.tv_cal_dot9, R.id.tv_cal_dot10, R.id.tv_cal_dot11, R.id.tv_cal_dot12, R.id.tv_cal_dot13,
            R.id.tv_cal_dot14, R.id.tv_cal_dot15, R.id.tv_cal_dot16, R.id.tv_cal_dot17, R.id.tv_cal_dot18, R.id.tv_cal_dot19, R.id.tv_cal_dot20,
            R.id.tv_cal_dot21, R.id.tv_cal_dot22, R.id.tv_cal_dot23, R.id.tv_cal_dot24, R.id.tv_cal_dot25, R.id.tv_cal_dot26, R.id.tv_cal_dot27,
            R.id.tv_cal_dot28, R.id.tv_cal_dot29, R.id.tv_cal_dot30, R.id.tv_cal_dot31, R.id.tv_cal_dot32, R.id.tv_cal_dot33, R.id.tv_cal_dot34,
            R.id.tv_cal_dot35, R.id.tv_cal_dot36, R.id.tv_cal_dot37, R.id.tv_cal_dot38, R.id.tv_cal_dot39, R.id.tv_cal_dot40, R.id.tv_cal_dot41
    };

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
                mode = "MONTH";
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

        String currentMode = prefs.getString("calendar_mode", "MONTH");

        // Format today's date in Spanish for title/subtitle
        SimpleDateFormat sdfMonth = new SimpleDateFormat("MMMM yyyy", new Locale("es", "ES"));
        String monthString = sdfMonth.format(Calendar.getInstance().getTime());
        if (monthString.length() > 0) {
            monthString = Character.toUpperCase(monthString.charAt(0)) + monthString.substring(1);
        }
        views.setTextViewText(R.id.tv_calendar_header_subtitle, monthString);

        // Configure mode tabs
        views.setInt(R.id.btn_mode_month, "setBackgroundResource",
                "MONTH".equalsIgnoreCase(currentMode) ? R.drawable.widget_pill_active : R.drawable.widget_pill_inactive);
        views.setTextColor(R.id.btn_mode_month,
                "MONTH".equalsIgnoreCase(currentMode) ? 0xFFFFFFFF : 0xFF334155);

        views.setInt(R.id.btn_mode_week, "setBackgroundResource",
                "WEEK".equalsIgnoreCase(currentMode) ? R.drawable.widget_pill_active : R.drawable.widget_pill_inactive);
        views.setTextColor(R.id.btn_mode_week,
                "WEEK".equalsIgnoreCase(currentMode) ? 0xFFFFFFFF : 0xFF334155);

        views.setInt(R.id.btn_mode_day, "setBackgroundResource",
                "DAY".equalsIgnoreCase(currentMode) ? R.drawable.widget_pill_active : R.drawable.widget_pill_inactive);
        views.setTextColor(R.id.btn_mode_day,
                "DAY".equalsIgnoreCase(currentMode) ? 0xFFFFFFFF : 0xFF334155);

        // Toggle Views visibility
        views.setViewVisibility(R.id.layout_month_view, "MONTH".equalsIgnoreCase(currentMode) ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.layout_week_view, "WEEK".equalsIgnoreCase(currentMode) ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.layout_day_view, "DAY".equalsIgnoreCase(currentMode) ? View.VISIBLE : View.GONE);

        // Bind data
        bindMonthData(views, prefs);
        bindWeekData(views, prefs);
        bindDayData(views, prefs);

        // Setup PendingIntents for Day / Week / Month tab clicks
        views.setOnClickPendingIntent(R.id.btn_mode_month, createModePendingIntent(context, "MONTH", 103));
        views.setOnClickPendingIntent(R.id.btn_mode_week, createModePendingIntent(context, "WEEK", 102));
        views.setOnClickPendingIntent(R.id.btn_mode_day, createModePendingIntent(context, "DAY", 101));

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

    private static void bindMonthData(RemoteViews views, SharedPreferences prefs) {
        Calendar cal = Calendar.getInstance();
        int currentMonth = cal.get(Calendar.MONTH);
        int currentYear = cal.get(Calendar.YEAR);
        int todayDay = cal.get(Calendar.DAY_OF_MONTH);

        Calendar firstDay = Calendar.getInstance();
        firstDay.set(Calendar.YEAR, currentYear);
        firstDay.set(Calendar.MONTH, currentMonth);
        firstDay.set(Calendar.DAY_OF_MONTH, 1);

        int firstWeekday = firstDay.get(Calendar.DAY_OF_WEEK); // Sunday=1, Monday=2...
        int mondayBasedOffset = (firstWeekday + 5) % 7; // Monday=0, Sunday=6
        int daysInCurrentMonth = firstDay.getActualMaximum(Calendar.DAY_OF_MONTH);

        // Previous month days count
        Calendar prevMonth = (Calendar) firstDay.clone();
        prevMonth.add(Calendar.MONTH, -1);
        int daysInPrevMonth = prevMonth.getActualMaximum(Calendar.DAY_OF_MONTH);

        // Parse month events map: { "YYYY-MM-DD": count } or { "D": count }
        String monthEventsJson = prefs.getString("month_events_map", "{}");
        JSONObject monthEventsMap;
        try {
            monthEventsMap = new JSONObject(monthEventsJson);
        } catch (Exception e) {
            monthEventsMap = new JSONObject();
        }

        boolean row6Needed = false;

        for (int i = 0; i < 42; i++) {
            int dayNum;
            boolean isCurrentMonth;
            if (i < mondayBasedOffset) {
                // Trailing days from previous month
                dayNum = daysInPrevMonth - (mondayBasedOffset - 1 - i);
                isCurrentMonth = false;
            } else if (i < mondayBasedOffset + daysInCurrentMonth) {
                // Current month
                dayNum = i - mondayBasedOffset + 1;
                isCurrentMonth = true;
                if (i >= 35) {
                    row6Needed = true;
                }
            } else {
                // Next month
                dayNum = i - (mondayBasedOffset + daysInCurrentMonth) + 1;
                isCurrentMonth = false;
            }

            views.setTextViewText(CELL_TEXT_IDS[i], String.valueOf(dayNum));

            if (isCurrentMonth) {
                if (dayNum == todayDay) {
                    views.setInt(CELL_TEXT_IDS[i], "setBackgroundResource", R.drawable.widget_day_today_bg);
                    views.setTextColor(CELL_TEXT_IDS[i], 0xFFFFFFFF);
                } else {
                    views.setInt(CELL_TEXT_IDS[i], "setBackgroundResource", 0);
                    views.setTextColor(CELL_TEXT_IDS[i], 0xFF0F172A);
                }

                // Check if day has events
                String dateKey = String.format(Locale.US, "%04d-%02d-%02d", currentYear, currentMonth + 1, dayNum);
                int eventCount = monthEventsMap.optInt(dateKey, 0);
                if (eventCount == 0) {
                    eventCount = monthEventsMap.optInt(String.valueOf(dayNum), 0);
                }

                if (eventCount > 0) {
                    views.setViewVisibility(CELL_DOT_IDS[i], View.VISIBLE);
                } else {
                    views.setViewVisibility(CELL_DOT_IDS[i], View.INVISIBLE);
                }
            } else {
                views.setInt(CELL_TEXT_IDS[i], "setBackgroundResource", 0);
                views.setTextColor(CELL_TEXT_IDS[i], 0xFFCBD5E1);
                views.setViewVisibility(CELL_DOT_IDS[i], View.INVISIBLE);
            }
        }

        views.setViewVisibility(R.id.row_cal_6, row6Needed ? View.VISIBLE : View.GONE);

        // Bind bottom highlight card
        SimpleDateFormat sdfShort = new SimpleDateFormat("d MMM", new Locale("es", "ES"));
        String todayShortStr = sdfShort.format(cal.getTime());

        String todayEventsJson = prefs.getString("today_events", "[]");
        try {
            JSONArray todayArr = new JSONArray(todayEventsJson);
            if (todayArr.length() > 0) {
                views.setTextViewText(R.id.tv_month_event_header, "Hoy (" + todayShortStr + ") • " + todayArr.length() + (todayArr.length() == 1 ? " evento" : " eventos"));
                JSONObject ev1 = todayArr.getJSONObject(0);
                views.setTextViewText(R.id.tv_month_event_1, ev1.optString("time", "Hoy") + " • " + ev1.optString("title", "Evento") + " (" + ev1.optString("tag", "General") + ")");
                views.setViewVisibility(R.id.tv_month_event_1, View.VISIBLE);

                if (todayArr.length() > 1) {
                    JSONObject ev2 = todayArr.getJSONObject(1);
                    views.setTextViewText(R.id.tv_month_event_2, ev2.optString("time", "Hoy") + " • " + ev2.optString("title", "Evento") + " (" + ev2.optString("tag", "General") + ")");
                    views.setViewVisibility(R.id.tv_month_event_2, View.VISIBLE);
                } else {
                    views.setViewVisibility(R.id.tv_month_event_2, View.GONE);
                }
            } else {
                views.setTextViewText(R.id.tv_month_event_header, "Hoy (" + todayShortStr + ") • Sin eventos pendientes");
                views.setTextViewText(R.id.tv_month_event_1, "Todo al día en StudentHub.");
                views.setViewVisibility(R.id.tv_month_event_1, View.VISIBLE);
                views.setViewVisibility(R.id.tv_month_event_2, View.GONE);
            }
        } catch (Exception ignored) {
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
}
