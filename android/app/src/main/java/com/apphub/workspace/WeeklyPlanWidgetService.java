package com.apphub.workspace;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StrikethroughSpan;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class WeeklyPlanWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WeeklyPlanRemoteViewsFactory(this.getApplicationContext());
    }
}

class WeeklyPlanRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private final List<JSONObject> items = new ArrayList<>();
    private int accentColor;
    private boolean hasCalendarColor = false;

    public WeeklyPlanRemoteViewsFactory(Context context) {
        this.context = context;
    }

    @Override
    public void onCreate() {
        loadData();
    }

    @Override
    public void onDataSetChanged() {
        loadData();
    }

    private void loadData() {
        items.clear();
        SharedPreferences prefs = context.getSharedPreferences("StudentHubWidgets", Context.MODE_PRIVATE);
        String jsonStr = prefs.getString("weekly_events_flat_list", "[]");
        try {
            JSONArray arr = new JSONArray(jsonStr);
            for (int i = 0; i < arr.length(); i++) {
                items.add(arr.getJSONObject(i));
            }
        } catch (Exception ignored) {
        }

        String calColorHex = prefs.getString("calendar_color", null);
        accentColor = context.getResources().getColor(R.color.widget_accent_default);
        hasCalendarColor = false;
        if (calColorHex != null && !calColorHex.trim().isEmpty()) {
            try {
                accentColor = Color.parseColor(calColorHex.trim());
                hasCalendarColor = true;
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    public void onDestroy() {
        items.clear();
    }

    @Override
    public int getCount() {
        return items.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position < 0 || position >= items.size()) {
            return null;
        }

        JSONObject item = items.get(position);
        String type = item.optString("type", "EVENT");

        if ("HEADER".equals(type)) {
            RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.widget_weekly_header);
            String title = item.optString("title", "");
            String count = item.optString("count", "");
            boolean isToday = item.optBoolean("isToday", false);

            rv.setTextViewText(R.id.tv_header_day, title);
            rv.setTextViewText(R.id.tv_header_count, count);
            rv.setViewVisibility(R.id.tv_header_today_badge, isToday ? View.VISIBLE : View.GONE);

            if (isToday) {
                if (hasCalendarColor) {
                    rv.setInt(R.id.tv_header_today_badge, "setBackgroundColor", accentColor);
                } else {
                    rv.setInt(R.id.tv_header_today_badge, "setBackgroundResource", R.drawable.widget_pill_active);
                }
            }

            Intent fillInIntent = new Intent();
            fillInIntent.putExtra("route", "/auto-organizer");
            rv.setOnClickFillInIntent(R.id.item_header_root, fillInIntent);
            return rv;
        } else if ("EMPTY".equals(type)) {
            RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.widget_weekly_empty);
            rv.setTextViewText(R.id.tv_empty_text, item.optString("text", "Sin eventos programados"));

            Intent fillInIntent = new Intent();
            fillInIntent.putExtra("route", "/auto-organizer");
            rv.setOnClickFillInIntent(R.id.item_empty_root, fillInIntent);
            return rv;
        } else {
            // EVENT
            RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.widget_weekly_event_item);
            String time = item.optString("time", "Todo el día");
            String title = item.optString("title", "Tarea");
            String tag = item.optString("tag", "General");
            boolean completed = item.optBoolean("completed", false) || item.optBoolean("isFinished", false);

            rv.setTextViewText(R.id.tv_item_time, time.isEmpty() ? "Todo el día" : time);
            rv.setTextViewText(R.id.tv_item_tag, tag);

            int mutedColor = context.getResources().getColor(R.color.widget_text_muted);
            int primaryTextColor = context.getResources().getColor(R.color.widget_text_primary);
            int secondaryTextColor = context.getResources().getColor(R.color.widget_text_secondary);
            int eventAccent = hasCalendarColor ? accentColor : context.getResources().getColor(R.color.widget_accent_default);

            if (completed) {
                SpannableString spannableTitle = new SpannableString(title);
                spannableTitle.setSpan(new StrikethroughSpan(), 0, spannableTitle.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                rv.setTextViewText(R.id.tv_item_title, spannableTitle);

                rv.setTextColor(R.id.tv_item_title, mutedColor);
                rv.setTextColor(R.id.tv_item_time, mutedColor);
                rv.setTextColor(R.id.tv_item_tag, mutedColor);
                rv.setInt(R.id.iv_item_bar, "setBackgroundColor", mutedColor);
            } else {
                rv.setTextViewText(R.id.tv_item_title, title);
                rv.setTextColor(R.id.tv_item_title, primaryTextColor);
                rv.setTextColor(R.id.tv_item_time, eventAccent);
                rv.setTextColor(R.id.tv_item_tag, secondaryTextColor);
                rv.setInt(R.id.iv_item_bar, "setBackgroundColor", eventAccent);
            }

            Intent fillInIntent = new Intent();
            fillInIntent.putExtra("route", "/auto-organizer");
            rv.setOnClickFillInIntent(R.id.item_event_root, fillInIntent);
            return rv;
        }
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 3;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }
}
