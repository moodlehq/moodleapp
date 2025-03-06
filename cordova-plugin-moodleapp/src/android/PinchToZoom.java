// (C) Copyright 2025 Moodle Pty Ltd.
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

import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;

import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebSettings.ZoomDensity;
import android.webkit.WebView;

public class PinchToZoom extends CordovaPlugin {

    public static final String TAG = "PinchToZoom";

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        Log.d(TAG, "Initializing pinch-to-zoom");

        super.initialize(cordova, webView);

        WebSettings settings = ((WebView) webView.getView()).getSettings();
        settings.setBuiltInZoomControls(true);
        settings.setDefaultZoom(WebSettings.ZoomDensity.MEDIUM);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(true);
    }
}
