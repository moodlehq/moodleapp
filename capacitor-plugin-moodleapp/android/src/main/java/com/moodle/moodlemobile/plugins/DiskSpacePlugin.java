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

import android.os.StatFs;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * Retrieves the free space of the storage volume where the app stores its files.
 */
@CapacitorPlugin(name = "MoodleAppDiskSpace")
public class DiskSpacePlugin extends Plugin {

    /**
     * Get the free space in bytes of the whole volume that contains the app external files folder.
     *
     * @param call The plugin call.
     */
    @PluginMethod
    public void getFreeSpace(PluginCall call) {
        try {
            File directory = getContext().getExternalFilesDir(null);
            if (directory == null) {
                // External storage not available, use the internal one.
                directory = getContext().getFilesDir();
            }

            JSObject result = new JSObject();
            result.put("free", new StatFs(directory.getPath()).getAvailableBytes());
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Unable to get free disk space.", exception);
        }
    }

}
