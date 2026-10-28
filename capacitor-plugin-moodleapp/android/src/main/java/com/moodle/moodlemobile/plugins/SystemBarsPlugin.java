// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.moodle.moodlemobile.plugins;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.view.Window;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Supplies the legacy Android navigation background missing from Capacitor SystemBars.
 */
@CapacitorPlugin(name = "MoodleAppSystemBars")
public class SystemBarsPlugin extends Plugin {

    private Integer navigationColor;

    /**
     * Set the navigation background where Android still supports it.
     *
     * @param call Call containing an opaque six-digit hexadecimal colour.
     */
    @PluginMethod
    public void setNavigationBarColor(PluginCall call) {
        String color = call.getString("color");
        if (color == null || !color.matches("#[0-9a-fA-F]{6}")) {
            call.reject("Expected an opaque #RRGGBB colour.", "INVALID_PARAMETER");
            return;
        }

        int parsedColor = Color.parseColor(color);
        getBridge().executeOnMainThread(() -> {
            boolean supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM;
            if (supported) {
                navigationColor = parsedColor;
                applyNavigationColor();
            }
            JSObject result = new JSObject();
            result.put("applied", supported);
            call.resolve(result);
        });
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        getBridge().executeOnMainThread(this::applyNavigationColor);
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration configuration) {
        super.handleOnConfigurationChanged(configuration);
        getBridge().executeOnMainThread(this::applyNavigationColor);
    }

    /**
     * Restore the requested legacy background without modifying system bar icon styles.
     */
    @SuppressWarnings("deprecation")
    private void applyNavigationColor() {
        if (navigationColor != null) {
            Window window = getActivity().getWindow();
            window.setNavigationBarColor(navigationColor);
        }
    }

}
