package com.apphub.workspace;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

public class VoiceCopilotWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "StudentHubWidgets";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String voiceResponse = prefs.getString("voice_copilot_response", "Pulsa para hablar con el Asistente IA de StudentHub");
        String calendarColor = prefs.getString("calendar_color", "#0071E3");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_voice_copilot);

        // Actualizar texto de respuesta o sugerencia
        views.setTextViewText(R.id.tv_voice_response, voiceResponse);

        // Color de acento dinámico (modo oscuro/claro y personalización de usuario)
        try {
            int accent = Color.parseColor(calendarColor);
            views.setTextColor(R.id.tv_voice_label, accent);
        } catch (Exception ignored) {
        }

        // PendingIntent para abrir la app y activar la escucha inmediata de voz
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openAppIntent.putExtra("route", "/calendar?action=voice_copilot&autoRecord=true");

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_voice_root, pendingIntent);
        views.setOnClickPendingIntent(R.id.btn_voice_record, pendingIntent);
        views.setOnClickPendingIntent(R.id.card_voice_info, pendingIntent);

        manager.updateAppWidget(appWidgetId, views);
    }
}
