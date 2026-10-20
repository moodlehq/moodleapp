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

import android.util.Log;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MoodleAppInstallReferrer")
public class InstallReferrerPlugin extends Plugin implements InstallReferrerStateListener {

    private static final String TAG = "InstallReferrer";
    private static final String UNKNOWN_ERROR = "UNKNOWN_ERROR";
    private static final String FEATURE_NOT_SUPPORTED = "FEATURE_NOT_SUPPORTED";
    private static final String SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE";

    private InstallReferrerClient referrerClient;
    private PluginCall pendingCall;
    private JSObject referrerResult;

    /**
     * Connect to the referrer client and obtain the referrer data when connected.
     *
     * @param call The plugin call.
     */
    @PluginMethod
    public void getReferrer(PluginCall call) {
        if (referrerResult != null) {
            call.resolve(referrerResult);

            return;
        }

        pendingCall = call;

        try {
            if (referrerClient == null) {
                referrerClient = InstallReferrerClient.newBuilder(getContext().getApplicationContext()).build();
            }

            referrerClient.startConnection(this);
        } catch (Exception exception) {
            Log.e(TAG, "startConnection error: " + exception.getMessage());
            rejectPendingCall(exception.getMessage(), UNKNOWN_ERROR);
        }
    }

    /**
     * Get referral data from an already established connection and pass it to the pending call.
     */
    private void getReferralData() {
        try {
            ReferrerDetails response = referrerClient.getInstallReferrer();
            JSObject result = new JSObject();

            result.put("referrer", response.getInstallReferrer());
            result.put("clickTime", response.getReferrerClickTimestampSeconds());
            result.put("appInstallTime", response.getInstallBeginTimestampSeconds());
            result.put("instantExperienceLaunched", response.getGooglePlayInstantParam());
            referrerResult = result;

            if (pendingCall != null) {
                pendingCall.resolve(referrerResult);
                pendingCall = null;
            }
        } catch (Exception exception) {
            Log.e(TAG, "getReferralData error: " + exception.getMessage());
            rejectPendingCall(exception.getMessage(), UNKNOWN_ERROR);
        }

        try {
            referrerClient.endConnection();
        } catch (Exception exception) {
            // Ignore errors.
        }
    }

    /**
     * Reject the pending call, if any.
     *
     * @param message Error message.
     * @param code Error code.
     */
    private void rejectPendingCall(String message, String code) {
        if (pendingCall == null) {
            return;
        }

        pendingCall.reject(message, code);
        pendingCall = null;
    }

    @Override
    public void onInstallReferrerSetupFinished(int responseCode) {
        switch (responseCode) {
            case InstallReferrerClient.InstallReferrerResponse.OK:
                getReferralData();
                break;
            case InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED:
                // API not available on the current Play Store app.
                rejectPendingCall("Referrer feature not supported.", FEATURE_NOT_SUPPORTED);
                break;
            case InstallReferrerClient.InstallReferrerResponse.SERVICE_UNAVAILABLE:
                rejectPendingCall("Referrer service unavailable.", SERVICE_UNAVAILABLE);
                break;
            default:
                rejectPendingCall("Unknown referrer response code: " + responseCode, UNKNOWN_ERROR);
        }
    }

    @Override
    public void onInstallReferrerServiceDisconnected() {
        // Nothing to do.
    }

}
