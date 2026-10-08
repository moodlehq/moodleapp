package com.moodle.moodlemobile;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Necessary for enabling edge-to-edge mode on Android 14 and below.
        EdgeToEdge.enable(this);
    }
}
