package com.moodle.moodlemobile;

import android.os.Bundle;
import android.webkit.WebSettings;

import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		// Replace Capacitor's WebChromeClient with one that asks for confirmation before recording audio or video.
		getBridge().getWebView().setWebChromeClient(new MoodleWebChromeClient(getBridge()));

		WebSettings settings = getBridge().getWebView().getSettings();
		settings.setBuiltInZoomControls(true);
		settings.setDefaultZoom(WebSettings.ZoomDensity.MEDIUM);
		settings.setDisplayZoomControls(false);
		settings.setSupportZoom(true);

        // Necessary for enabling edge-to-edge mode on Android 14 and below.
        EdgeToEdge.enable(this);
	}

}
