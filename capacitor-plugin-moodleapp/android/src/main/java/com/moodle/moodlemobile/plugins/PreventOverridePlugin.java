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

import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Objects;

@CapacitorPlugin(name = "MoodleAppPreventOverride")
public class PreventOverridePlugin extends Plugin {

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        String scheme = url.getScheme();
        Uri appUrl = Uri.parse(getBridge().getAppUrl());

        if (
            "data".equalsIgnoreCase(scheme) ||
            "blob".equalsIgnoreCase(scheme) ||
            (
                Objects.equals(appUrl.getScheme(), scheme) &&
                Objects.equals(appUrl.getHost(), url.getHost()) &&
                appUrl.getPort() == url.getPort()
            )
        ) {
            return null;
        }

        JSObject data = new JSObject();
        data.put("url", url.toString());
        notifyListeners("overrideUrlLoading", data, true);

        return true;
    }
}
