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

package com.ictkerala.ksfe;

import android.os.Build;
import android.util.Log;
import android.content.Context;
import android.content.SharedPreferences;
import java.security.GeneralSecurityException;
import java.io.IOException;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;

import com.adobe.phonegap.push.EncryptionHandler;

public class SecureStorage extends CordovaPlugin {

    private static final String TAG = "SecureStorage";
    private static final String SHARED_PREFS_NAME = "moodlemobile_shared_prefs";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            switch (action) {
                case "get":
                    callbackContext.success(this.get(args.getJSONArray(0), args.getString(1)));

                    return true;
                case "store":
                    this.store(args.getJSONObject(0), args.getString(1));
                    callbackContext.success();

                    return true;
                case "delete":
                    this.delete(args.getJSONArray(0), args.getString(1));
                    callbackContext.success();

                    return true;
                case "deleteCollection":
                    this.deleteCollection(args.getString(0));
                    callbackContext.success();

                    return true;
            }
        } catch (Throwable e) {
            Log.e(TAG, "Failed executing action: " + action, e);
            callbackContext.error(e.getMessage());
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR));
        }

        return false;
    }

    /**
     * Get several values from secure storage.
     *
     * @param names List of names to get.
     * @param collection The collection where the values are stored.
     * @return Values for each name.
     */
    private JSONObject get(JSONArray names, String collection) throws GeneralSecurityException, IOException, JSONException {
        Context context = this.cordova.getActivity().getApplicationContext();
        SharedPreferences sharedPreferences = getSharedPreferences(collection);
        JSONObject result = new JSONObject();

        Log.d(TAG, "Get values with names " + names.toString());

        for(int i = 0; i < names.length(); i++) {
            String name = names.optString(i);

            if (name == null || name.isEmpty()) {
                continue;
            }

            String rawValue = sharedPreferences.getString(name, null);
            if (rawValue == null) {
                continue;
            }

            result.put(name, EncryptionHandler.Companion.decrypt(context, rawValue));
        }

        return result;
    }

    /**
     * Store data in secure storage.
     *
     * @param data Data to store, using a name -> value format.
     * @param collection The collection where to store the values.
     */
    private void store(JSONObject data, String collection) throws GeneralSecurityException, IOException, JSONException {
        Context context = this.cordova.getActivity().getApplicationContext();
        SharedPreferences sharedPreferences = getSharedPreferences(collection);
        SharedPreferences.Editor editor = sharedPreferences.edit();
        JSONArray names = data.names();

        Log.d(TAG, "Store values with names " + names.toString());

        for(int i = 0; i < names.length(); i++) {
            String name = names.optString(i);

            if (name != null && !name.isEmpty()) {
                editor.putString(name, EncryptionHandler.Companion.encrypt(context, data.getString(name)));
            }
        }

        editor.apply();
    }

    /**
     * Delete some values from secure storage.
     *
     * @param names Names to delete.
     * @param collection The collection where to delete the values.
     */
    private void delete(JSONArray names, String collection) throws GeneralSecurityException, IOException {
        Log.d(TAG, "Delete value with names " + names.toString());

        SharedPreferences sharedPreferences = getSharedPreferences(collection);
        SharedPreferences.Editor editor = sharedPreferences.edit();

        for(int i = 0; i < names.length(); i++) {
            String name = names.optString(i);

            if (name != null && !name.isEmpty()) {
                editor.remove(name);
            }
        }

        editor.apply();
    }

    /**
     * Delete all values from a collection.
     *
     * @param collection The collection to delete.
     */
    private void deleteCollection(String collection) throws GeneralSecurityException, IOException {
        Log.d(TAG, "Delete all values in collection " + collection);

        SharedPreferences sharedPreferences = getSharedPreferences(collection);
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.clear();
        editor.apply();
    }

    /**
     * Get shared preferences instance.
     *
     * @param collection The collection to use.
     * @return Shared preferences instance.
     */
    private SharedPreferences getSharedPreferences(String collection) {
        return this.cordova.getActivity().getApplicationContext().getSharedPreferences(
            SHARED_PREFS_NAME + "_" + collection,
            Context.MODE_PRIVATE
        );
    }

}
