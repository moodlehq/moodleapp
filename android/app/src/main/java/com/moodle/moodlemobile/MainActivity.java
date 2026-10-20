package com.moodle.moodlemobile;

import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		WebSettings settings = getBridge().getWebView().getSettings();
		settings.setBuiltInZoomControls(true);
		settings.setDefaultZoom(WebSettings.ZoomDensity.MEDIUM);
		settings.setDisplayZoomControls(false);
		settings.setSupportZoom(true);
	}

}
