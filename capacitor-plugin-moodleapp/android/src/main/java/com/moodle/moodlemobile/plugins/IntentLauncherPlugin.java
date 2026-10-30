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

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Launches Android activities.
 */
@CapacitorPlugin(name = "MoodleAppIntentLauncher")
public class IntentLauncherPlugin extends Plugin {

    /**
     * Start an activity with the action VIEW.
     *
     * @param call The plugin call.
     */
    @PluginMethod
    public void startViewActivity(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Must provide a URL.");

            return;
        }

        Uri uri = Uri.parse(url);
        String type = call.getString("type");
        Intent intent = new Intent(Intent.ACTION_VIEW);

        if (type != null && !type.isEmpty()) {
            intent.setDataAndType(uri, type);
        } else {
            intent.setData(uri);
        }

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getContext().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException exception) {
            call.reject("No app found to open the URL.", "ACTIVITY_NOT_FOUND", exception);
        } catch (Exception exception) {
            call.reject("Unable to open the URL.", exception);
        }
    }

}
