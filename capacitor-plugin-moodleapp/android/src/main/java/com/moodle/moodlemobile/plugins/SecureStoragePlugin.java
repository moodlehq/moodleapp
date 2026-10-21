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

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Iterator;

/**
 * Stores values in the shared preferences collections previously used by the Cordova plugin.
 */
@CapacitorPlugin(name = "MoodleAppSecureStorage")
public class SecureStoragePlugin extends Plugin {

    private static final String TAG = "SecureStorage";
    private static final String SHARED_PREFS_NAME = "moodlemobile_shared_prefs";

    /**
     * Get one or more values from a collection.
     *
     * @param call The plugin call.
     */
    @PluginMethod
    public void get(PluginCall call) {
        JSArray names = call.getArray("names");
        String collection = call.getString("collection", "");

        if (names == null) {
            call.reject("Names are required.");

            return;
        }

        JSObject result = new JSObject();
        SharedPreferences sharedPreferences = getSharedPreferences(collection);

        Log.d(TAG, "Get values with names " + names);

        for (int index = 0; index < names.length(); index++) {
            String name = names.optString(index);
            if (name == null || name.isEmpty()) {
                continue;
            }

            String rawValue = sharedPreferences.getString(name, null);
            if (rawValue == null) {
                continue;
            }

            // @todo Capacitor
            // result.put(name, EncryptionHandler.Companion.decrypt(context, rawValue));
            result.put(name, rawValue);
        }

        call.resolve(result);
    }

    /**
     * Store values in a collection.
     *
     * @param call The plugin call.
     */
    @PluginMethod
    public void store(PluginCall call) {
        JSObject data = call.getObject("data");
        String collection = call.getString("collection", "");

        if (data == null) {
            call.reject("Data is required.");

            return;
        }

        SharedPreferences.Editor editor = getSharedPreferences(collection).edit();

        Log.d(TAG, "Store values with names " + data.names());

        Iterator<String> names = data.keys();
        while (names.hasNext()) {
            String name = names.next();
            if (!name.isEmpty()) {
                // @todo Capacitor
                // editor.putString(name, EncryptionHandler.Companion.encrypt(context, data.getString(name)));
                editor.putString(name, data.getString(name));
            }
        }

        editor.apply();
        call.resolve();
    }

    /**
     * Delete values from a collection.
     *
     * @param call The plugin call.
     */
    @PluginMethod
    public void delete(PluginCall call) {
        JSArray names = call.getArray("names");
        String collection = call.getString("collection", "");

        if (names == null) {
            call.reject("Names are required.");

            return;
        }

        SharedPreferences.Editor editor = getSharedPreferences(collection).edit();

        Log.d(TAG, "Delete values with names " + names);

        for (int index = 0; index < names.length(); index++) {
            String name = names.optString(index);
            if (name != null && !name.isEmpty()) {
                editor.remove(name);
            }
        }

        editor.apply();
        call.resolve();
    }

    /**
     * Delete all values in a collection.
     *
     * @param call The plugin call.
     */
    @PluginMethod
    public void deleteCollection(PluginCall call) {
        String collection = call.getString("collection", "");

        Log.d(TAG, "Delete all values in collection " + collection);

        getSharedPreferences(collection).edit().clear().apply();
        call.resolve();
    }

    /**
     * Get a shared preferences collection.
     *
     * @param collection Collection name.
     * @return Shared preferences collection.
     */
    private SharedPreferences getSharedPreferences(String collection) {
        return getContext().getSharedPreferences(SHARED_PREFS_NAME + "_" + collection, Context.MODE_PRIVATE);
    }

}
