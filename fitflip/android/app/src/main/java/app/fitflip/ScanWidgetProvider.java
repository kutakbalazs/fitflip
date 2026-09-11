package app.fitflip;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * Home-screen widget: one tap, camera open.
 *
 * The tile shows what the wardrobe was worth the last time the app ran, and
 * says in words that tapping opens the camera — a widget that silently fires
 * a camera is startling the first time, and the label is what turns it into
 * a promise instead of a surprise.
 *
 * It deliberately holds no logic of its own. Widgets render outside the app,
 * on the system's schedule, with no session and often no network, so anything
 * it needs has to already be on disk.
 */
public class ScanWidgetProvider extends AppWidgetProvider {

    /**
     * Capacitor's Preferences plugin writes here. Reading its file directly
     * couples us to that name, which is the trade for not having to build and
     * maintain a bridge of our own for one string.
     */
    private static final String PREFS = "CapacitorStorage";
    private static final String KEY = "ff-wardrobe";

    /** Where a tap goes. The web app opens the camera on arrival. */
    private static final String TARGET = "https://www.fitflip.app/scan/new";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int id : widgetIds) {
            manager.updateAppWidget(id, build(context));
        }
    }

    /** Redraws every placed instance. Called after the app stores a new value. */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName name = new ComponentName(context, ScanWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(name);
        if (ids == null || ids.length == 0) return;
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    private static RemoteViews build(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.scan_widget);

        long totalHuf = 0;
        int itemCount = 0;
        int streak = 0;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY, null);
            if (raw != null) {
                JSONObject json = new JSONObject(raw);
                totalHuf = json.optLong("totalHuf", 0);
                itemCount = json.optInt("itemCount", 0);
                streak = json.optInt("streak", 0);
            }
        } catch (Exception ignored) {
            // No stored value yet, or it's unreadable. The widget still has a
            // job to do — opening the camera — so it falls through to the
            // invitation below rather than showing an error.
        }

        if (itemCount > 0 && totalHuf > 0) {
            views.setTextViewText(R.id.widget_value, formatHuf(totalHuf));
            views.setTextViewText(
                    R.id.widget_sub,
                    context.getString(R.string.widget_items, itemCount));
        } else {
            views.setTextViewText(R.id.widget_value, context.getString(R.string.widget_empty_title));
            views.setTextViewText(R.id.widget_sub, context.getString(R.string.widget_empty_sub));
        }

        // Hidden entirely when there is no streak: a flame showing 0 reads as
        // a reproach rather than an encouragement.
        if (streak > 0) {
            views.setTextViewText(R.id.widget_streak, String.valueOf(streak));
            views.setViewVisibility(R.id.widget_streak, android.view.View.VISIBLE);
            views.setViewVisibility(R.id.widget_flame, android.view.View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_streak, android.view.View.GONE);
            views.setViewVisibility(R.id.widget_flame, android.view.View.GONE);
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse(TARGET));
        // Explicit component plus these flags: without them the tap can land
        // on a browser instead of the app, or resume a stale task showing the
        // screen the user left rather than the camera.
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pending = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        return views;
    }

    /** "340 000 Ft" — the same shape the app shows, so the two agree. */
    private static String formatHuf(long value) {
        NumberFormat fmt = NumberFormat.getInstance(new Locale("hu", "HU"));
        return fmt.format(value).replace(' ', ' ') + " Ft";
    }
}
