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

package com.bitkea.scholarlms;

import android.util.Log;
import android.os.RemoteException;
import org.json.JSONArray;
import org.json.JSONObject;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;

public class InstallReferrer extends CordovaPlugin implements InstallReferrerStateListener {

    private static final String TAG = "InstallReferrer";
    private static final int UNKNOWN_ERROR = 1;
    private static final int FEATURE_NOT_SUPPORTED = 2;
    private static final int SERVICE_UNAVAILABLE = 3;

    private InstallReferrerClient referrerClient;
    private CallbackContext callbackContext;
    private JSONObject referrerResult;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            switch (action) {
                case "getReferrer":
                    this.getReferrer(callbackContext);

                    return true;
            }
        } catch (Throwable e) {
            Log.e(TAG, "Failed executing action: " + action, e);
            callbackContext.error(e.getMessage());
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, UNKNOWN_ERROR));
        }

        return false;
    }

    /**
     * Connect to the referrer client and obtain the referrer data when connected.
     *
     * @param callbackContext The callback context used when calling back into JavaScript.
     */
    private void getReferrer(CallbackContext callbackContext) {
        if (this.referrerResult != null) {
            callbackContext.success(this.referrerResult);

            return;
        }

        this.callbackContext = callbackContext;

        try {
            if (this.referrerClient == null) {
                this.referrerClient = InstallReferrerClient.newBuilder(this.cordova.getActivity().getApplicationContext()).build();
            }

            this.referrerClient.startConnection(this);
        } catch (Exception exception) {
            Log.e(TAG, "startConnection error: " + exception.getMessage());
            callbackContext.error(exception.getMessage());
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, UNKNOWN_ERROR));
        }
    }

    /**
     * Get referral data from an already established connection and pass it to current callback context.
     */
    private void getReferralData() {
        try {
            ReferrerDetails response = referrerClient.getInstallReferrer();
            JSONObject referrerResult = new JSONObject();

            referrerResult.put("referrer", response.getInstallReferrer());
            referrerResult.put("clickTime", response.getReferrerClickTimestampSeconds());
            referrerResult.put("appInstallTime", response.getInstallBeginTimestampSeconds());
            referrerResult.put("instantExperienceLaunched", response.getGooglePlayInstantParam());
            this.referrerResult = referrerResult;

            if (this.callbackContext != null) {
                this.callbackContext.success(this.referrerResult);
            }
        } catch (Exception exception) {
            Log.e(TAG, "getReferralData error: " + exception.getMessage());
            if (this.callbackContext != null) {
                this.callbackContext.error(exception.getMessage());
                this.callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, UNKNOWN_ERROR));
            }

            this.referrerClient.endConnection();
        }

        try {
            this.referrerClient.endConnection();
        } catch (Exception exception) {
            // Ignore errors.
        }
    }

    @Override
    public void onInstallReferrerSetupFinished(int responseCode) {
        switch (responseCode) {
            case InstallReferrerClient.InstallReferrerResponse.OK:
                // Connection established.
                this.getReferralData();
                break;
            case InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED:
                // API not available on the current Play Store app.
                if (this.callbackContext != null) {
                    this.callbackContext.error("Referrer feature not supported.");
                    this.callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, FEATURE_NOT_SUPPORTED));
                }
                break;
            case InstallReferrerClient.InstallReferrerResponse.SERVICE_UNAVAILABLE:
                // Connection couldn't be established.
                if (this.callbackContext != null) {
                    this.callbackContext.error("Referrer service unavailable.");
                    this.callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, SERVICE_UNAVAILABLE));
                }
                break;
        }
    }

    @Override
    public void onInstallReferrerServiceDisconnected() {
        // Nothing to do.
    }

}
