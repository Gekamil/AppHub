package com.apphub.workspace;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StrikethroughSpan;
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

        // Format today's date in Spanish for title/subtitle
        SimpleDateFormat sdfMonth = new SimpleDateFormat("MMMM yyyy", new Locale("es", "ES"));
        String monthString = sdfMonth.format(Calendar.getInstance().getTime());
        if (monthString.length() > 0) {
            monthString = Character.toUpperCase(monthString.charAt(0)) + monthString.substring(1);
        }
        views.setTextViewText(R.id.tv_calendar_header_subtitle, monthString);

        // Configure mode tabs
        int inactiveTabBg = R.drawable.widget_pill_inactive;
        int inactiveTextColor = context.getResources().getColor(R.color.widget_pill_inactive_text);

        // Month tab
        if ("MONTH".equalsIgnoreCase(currentMode)) {
            if (hasCalendarColor) {
                views.setInt(R.id.btn_mode_month, "setBackgroundColor", accentColor);
            } else {
                views.setInt(R.id.btn_mode_month, "setBackgroundResource", R.drawable.widget_pill_active);
            }
            views.setTextColor(R.id.btn_mode_month, 0xFFFFFFFF);
        } else {
            views.setInt(R.id.btn_mode_month, "setBackgroundResource", inactiveTabBg);
            views.setTextColor(R.id.btn_mode_month, inactiveTextColor);
        }

        // Week tab
        if ("WEEK".equalsIgnoreCase(currentMode)) {
            if (hasCalendarColor) {
                views.setInt(R.id.btn_mode_week, "setBackgroundColor", accentColor);
            } else {
                views.setInt(R.id.btn_mode_week, "setBackgroundResource", R.drawable.widget_pill_active);
            }
            views.setTextColor(R.id.btn_mode_week, 0xFFFFFFFF);
        } else {
            views.setInt(R.id.btn_mode_week, "setBackgroundResource", inactiveTabBg);
            views.setTextColor(R.id.btn_mode_week, inactiveTextColor);
        }

        // Day tab
        if ("DAY".equalsIgnoreCase(currentMode)) {
            if (hasCalendarColor) {
                views.setInt(R.id.btn_mode_day, "setBackgroundColor", accentColor);
            } else {
                views.setInt(R.id.btn_mode_day, "setBackgroundResource", R.drawable.widget_pill_active);
            }
            views.setTextColor(R.id.btn_mode_day, 0xFFFFFFFF);
        } else {
            views.setInt(R.id.btn_mode_day, "setBackgroundResource", inactiveTabBg);
            views.setTextColor(R.id.btn_mode_day, inactiveTextColor);
        }

        // Toggle Views visibility
        views.setViewVisibility(R.id.layout_month_view, "MONTH".equalsIgnoreCase(currentMode) ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.layout_week_view, "WEEK".equalsIgnoreCase(currentMode) ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.layout_day_view, "DAY".equalsIgnoreCase(currentMode) ? View.VISIBLE : View.GONE);

        // Bind data
        bindMonthData(views, prefs, context, accentColor);
        bindWeekData(views, prefs);
        bindDayData(views, prefs, context, accentColor);

        // Setup PendingIntents for Day / Week / Month tab clicks
        views.setOnClickPendingIntent(R.id.btn_mode_month, createModePendingIntent(context, "MONTH", 103));
        views.setOnClickPendingIntent(R.id.btn_mode_week, createModePendingIntent(context, "WEEK", 102));
        views.setOnClickPendingIntent(R.id.btn_mode_day, createModePendingIntent(context, "DAY", 101));

        // Setup voice add button pending intent: opens MainActivity with route to voice copilot
        Intent voiceIntent = new Intent(context, MainActivity.class);
        voiceIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        voiceIntent.putExtra("route", "/calendar?action=voice_copilot&autoRecord=true");
        PendingIntent voicePendingIntent = PendingIntent.getActivity(
                context, 105, voiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_calendar_voice_add, voicePendingIntent);

        // Open Main App when clicking footer
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openAppIntent.putExtra("route", "/calendar");
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 100, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_open_calendar_app, openAppPendingIntent);

        // Dynamic footer link text tinting
        views.setTextColor(R.id.tv_btn_open_calendar, accentColor);
        if (hasCalendarColor) {
            views.setInt(R.id.btn_calendar_voice_add, "setBackgroundColor", accentColor);
        }

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

    private static void bindMonthData(RemoteViews views, SharedPreferences prefs, Context context, int accentColor) {
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
        int primaryTextColor = context.getResources().getColor(R.color.widget_text_primary);
        int trailingTextColor = context.getResources().getColor(R.color.widget_text_trailing);

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
                    views.setInt(CELL_TEXT_IDS[i], "setBackgroundColor", accentColor);
                    views.setTextColor(CELL_TEXT_IDS[i], 0xFFFFFFFF);
                } else {
                    views.setInt(CELL_TEXT_IDS[i], "setBackgroundColor", Color.TRANSPARENT);
                    views.setInt(CELL_TEXT_IDS[i], "setBackgroundResource", 0);
                    views.setTextColor(CELL_TEXT_IDS[i], primaryTextColor);
                }

                // Check if day has events
                String dateKey = String.format(Locale.US, "%04d-%02d-%02d", currentYear, currentMonth + 1, dayNum);
                int eventCount = monthEventsMap.optInt(dateKey, 0);
                if (eventCount == 0) {
                    eventCount = monthEventsMap.optInt(String.valueOf(dayNum), 0);
                }

                if (eventCount > 0) {
                    views.setTextColor(CELL_DOT_IDS[i], accentColor);
                    views.setViewVisibility(CELL_DOT_IDS[i], View.VISIBLE);
                } else {
                    views.setViewVisibility(CELL_DOT_IDS[i], View.INVISIBLE);
                }
            } else {
                views.setInt(CELL_TEXT_IDS[i], "setBackgroundColor", Color.TRANSPARENT);
                views.setInt(CELL_TEXT_IDS[i], "setBackgroundResource", 0);
                views.setTextColor(CELL_TEXT_IDS[i], trailingTextColor);
                views.setViewVisibility(CELL_DOT_IDS[i], View.INVISIBLE);
            }
        }

        views.setViewVisibility(R.id.row_cal_6, row6Needed ? View.VISIBLE : View.GONE);

        // Bind bottom highlight card
        SimpleDateFormat sdfShort = new SimpleDateFormat("d MMM", new Locale("es", "ES"));
        String todayShortStr = sdfShort.format(cal.getTime());

        String todayEventsJson = prefs.getString("today_events_full", null);
        if (todayEventsJson == null || todayEventsJson.isEmpty() || "[]".equals(todayEventsJson)) {
            todayEventsJson = prefs.getString("today_events", "[]");
        }

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

    private static void bindDayData(RemoteViews views, SharedPreferences prefs, Context context, int accentColor) {
        int[] itemIds = { R.id.item_day_1, R.id.item_day_2, R.id.item_day_3, R.id.item_day_4 };
        int[] timeIds = { R.id.tv_day_time_1, R.id.tv_day_time_2, R.id.tv_day_time_3, R.id.tv_day_time_4 };
        int[] barIds = { R.id.iv_day_bar_1, R.id.iv_day_bar_2, R.id.iv_day_bar_3, R.id.iv_day_bar_4 };
        int[] titleIds = { R.id.tv_day_title_1, R.id.tv_day_title_2, R.id.tv_day_title_3, R.id.tv_day_title_4 };
        int[] tagIds = { R.id.tv_day_tag_1, R.id.tv_day_tag_2, R.id.tv_day_tag_3, R.id.tv_day_tag_4 };
        int[] statusIds = { R.id.tv_day_status_1, R.id.tv_day_status_2, R.id.tv_day_status_3, R.id.tv_day_status_4 };

        String eventsJson = prefs.getString("today_events_full", null);
        if (eventsJson == null || eventsJson.isEmpty() || "[]".equals(eventsJson)) {
            eventsJson = prefs.getString("today_events", "[]");
        }

        try {
            JSONArray array = new JSONArray(eventsJson);
            if (array.length() == 0) {
                views.setViewVisibility(R.id.tv_day_empty, View.VISIBLE);
                for (int itemId : itemIds) {
                    views.setViewVisibility(itemId, View.GONE);
                }
                return;
            }

            views.setViewVisibility(R.id.tv_day_empty, View.GONE);

            Calendar now = Calendar.getInstance();
            int currentMinutesOfDay = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);

            int primaryTextColor = context.getResources().getColor(R.color.widget_text_primary);
            int secondaryTextColor = context.getResources().getColor(R.color.widget_text_secondary);
            int mutedColor = context.getResources().getColor(R.color.widget_text_muted);
            int doneGreenColor = Color.parseColor("#10B981");

            for (int i = 0; i < itemIds.length; i++) {
                if (i < array.length()) {
                    JSONObject obj = array.getJSONObject(i);
                    views.setViewVisibility(itemIds[i], View.VISIBLE);

                    String time = obj.optString("time", "Todo el día");
                    String title = obj.optString("title", "Evento");
                    String tag = obj.optString("tag", "General");
                    boolean isFinished = obj.optBoolean("isFinished", false) || obj.optBoolean("completed", false);

                    views.setTextViewText(timeIds[i], time);
                    views.setTextViewText(tagIds[i], tag);

                    if (isFinished) {
                        SpannableString span = new SpannableString(title);
                        span.setSpan(new StrikethroughSpan(), 0, span.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                        views.setTextViewText(titleIds[i], span);

                        views.setTextViewText(statusIds[i], "Hecho");
                        views.setTextColor(statusIds[i], doneGreenColor);

                        views.setTextColor(titleIds[i], mutedColor);
                        views.setTextColor(timeIds[i], mutedColor);
                        views.setTextColor(tagIds[i], mutedColor);
                        views.setInt(barIds[i], "setBackgroundColor", mutedColor);
                    } else {
                        views.setTextViewText(titleIds[i], title);
                        views.setTextColor(titleIds[i], primaryTextColor);
                        views.setTextColor(tagIds[i], secondaryTextColor);
                        views.setTextColor(timeIds[i], accentColor);
                        views.setInt(barIds[i], "setBackgroundColor", accentColor);

                        // Check if ongoing (time started) vs upcoming
                        boolean hasStarted = false;
                        if (time != null && time.contains(":")) {
                            try {
                                String[] parts = time.trim().split("[-–]");
                                String startPart = parts[0].trim();
                                String[] timePieces = startPart.split(":");
                                if (timePieces.length >= 2) {
                                    int startH = Integer.parseInt(timePieces[0].replaceAll("[^0-9]", ""));
                                    int startM = Integer.parseInt(timePieces[1].replaceAll("[^0-9]", ""));
                                    int eventStartMinutes = startH * 60 + startM;
                                    if (currentMinutesOfDay >= eventStartMinutes) {
                                        hasStarted = true;
                                    }
                                }
                            } catch (Exception ignored) {
                            }
                        }

                        if (hasStarted) {
                            views.setTextViewText(statusIds[i], "En curso");
                            views.setTextColor(statusIds[i], accentColor);
                        } else {
                            views.setTextViewText(statusIds[i], "Pendiente");
                            views.setTextColor(statusIds[i], mutedColor);
                        }
                    }
                } else {
                    views.setViewVisibility(itemIds[i], View.GONE);
                }
            }
        } catch (Exception e) {
            views.setViewVisibility(R.id.tv_day_empty, View.VISIBLE);
            for (int itemId : itemIds) {
                views.setViewVisibility(itemId, View.GONE);
            }
        }
    }
}
