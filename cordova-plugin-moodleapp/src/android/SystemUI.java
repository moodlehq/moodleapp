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

package com.moodle.moodlemobile;

import android.graphics.Color;
import android.os.Build;
import android.util.Log;
import android.view.Window;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;

public class SystemUI extends CordovaPlugin {

    private static final String TAG = "SystemUI";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            switch (action) {
                case "setNavigationBarColor":
                    this.setNavigationBarColor(args.getString(0));
                    callbackContext.success();

                    return true;
            }
        } catch (Throwable e) {
            Log.e(TAG, "Failed executing action: " + action, e);
        }

        return false;
    }

    private void setNavigationBarColor(String color) {
        if (Build.VERSION.SDK_INT < 21) {
            return;
        }

        if (color == null || color.isEmpty()) {
            return;
        }

        Log.d(TAG, "Setting navigation bar color to " + color);

        this.cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final int FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS = 0x80000000;
                final int SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR = 0x00000010;
                final Window window = cordova.getActivity().getWindow();
                int uiOptions = window.getDecorView().getSystemUiVisibility();

                uiOptions = uiOptions | FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS;
                uiOptions = uiOptions & ~SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;

                window.getDecorView().setSystemUiVisibility(uiOptions);

                try {
                    // Using reflection makes sure any 5.0+ device will work without having to compile with SDK level 21
                    window.getClass().getDeclaredMethod("setNavigationBarColor", int.class).invoke(window, Color.parseColor(color));
                } catch (IllegalArgumentException ignore) {
                    Log.e(TAG, "Invalid hexString argument, use f.i. '#999999'");
                } catch (Exception ignore) {
                    // this should not happen, only in case Android removes this method in a version > 21
                    Log.w(TAG, "Method window.setNavigationBarColor not found for SDK level " + Build.VERSION.SDK_INT);
                }
            }
        });
    }

}
