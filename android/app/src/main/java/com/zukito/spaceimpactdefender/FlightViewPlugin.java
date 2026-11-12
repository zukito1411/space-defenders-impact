package com.zukito.spaceimpactdefender;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FlightView")
public class FlightViewPlugin extends Plugin {
    @PluginMethod
    public void setOrientation(PluginCall call) {
        final boolean landscape = Boolean.TRUE.equals(call.getBoolean("landscape", false));
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("No active game activity.");
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                activity.setRequestedOrientation(landscape
                    ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                    : ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
                call.resolve();
            } catch (RuntimeException exception) {
                call.reject("Display rotation is unavailable.", exception);
            }
        });
    }
}
