package com.moodle.moodlemobile;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.util.TypedValue;
import android.webkit.PermissionRequest;
import android.webkit.WebView;

import androidx.appcompat.app.AlertDialog;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebChromeClient that asks the user for confirmation before the WebView can record audio or video.
 *
 * Capacitor requests the Android runtime permissions and then grants the request without asking, but 3rd party code
 * (e.g. site plugins or iframes) can run in the WebView. In Android we cannot know if the request comes from the main
 * frame or a sub frame, and we only know the host of the requester, not the full URL, so the user is always asked.
 *
 * The confirmation is shown after the Android runtime permissions have been granted. To do so, Capacitor receives a
 * wrapper of the request, so when Capacitor grants it the user is asked, and the real request is granted only if the
 * user allows it. Any other resource (e.g. MIDI or protected media ID) is always denied.
 */
public class MoodleWebChromeClient extends BridgeWebChromeClient {

    private final Bridge bridge;
    // Requests that haven't been answered yet.
    private final Set<PermissionRequest> pendingRequests = ConcurrentHashMap.newKeySet();
    // Confirmation dialogs that are being shown.
    private final Map<PermissionRequest, AlertDialog> dialogs = new ConcurrentHashMap<>();

    public MoodleWebChromeClient(Bridge bridge) {
        super(bridge);

        this.bridge = bridge;
    }

    @Override
    public void onPermissionRequest(final PermissionRequest request) {
        final String mediaName = getRequestedMediaName(request);
        if (mediaName == null) {
            // Only camera and microphone are supported.
            request.deny();

            return;
        }

        final String message = "\"" + getDisplayHost(request) + "\" would like to access the " + mediaName + ".";

        pendingRequests.add(request);
        super.onPermissionRequest(new ConfirmedPermissionRequest(request, message));
    }

    @Override
    public void onPermissionRequestCanceled(PermissionRequest request) {
        // The WebView cancelled the request, so it cannot be granted or denied anymore.
        pendingRequests.remove(request);

        final AlertDialog dialog = dialogs.remove(request);
        final Activity activity = bridge.getActivity();
        if (dialog != null && activity != null) {
            // Dismissing doesn't trigger the cancel listener, so the request isn't answered.
            activity.runOnUiThread(dialog::dismiss);
        }

        super.onPermissionRequestCanceled(request);
    }

    /**
     * Show the confirmation dialog, and grant or deny the request depending on the answer.
     *
     * @param request Real WebView permission request.
     * @param resources Resources to grant if the user allows it.
     * @param message Message to show.
     */
    private void confirmRequest(final PermissionRequest request, final String[] resources, final String message) {
        final Activity activity = bridge.getActivity();
        if (activity == null) {
            denyRequest(request);

            return;
        }

        activity.runOnUiThread(() -> {
            // The request could have been cancelled while waiting for the Android permissions.
            if (!pendingRequests.contains(request)) {
                return;
            }

            if (activity.isFinishing() || activity.isDestroyed()) {
                denyRequest(request);

                return;
            }

            // Set to true when the request has been answered, to avoid answering it again when the dialog is dismissed.
            final boolean[] answered = { false };

            AlertDialog dialog = new AlertDialog.Builder(activity)
                .setMessage(message)
                .setPositiveButton("Allow", (dialogInterface, which) -> {
                    answered[0] = true;
                    dialogs.remove(request);

                    if (pendingRequests.remove(request)) {
                        request.grant(resources);
                    }
                })
                .setNegativeButton("Don't Allow", (dialogInterface, which) -> {
                    answered[0] = true;
                    denyRequest(request);
                })
                .setOnCancelListener(dialogInterface -> {
                    if (!answered[0]) {
                        answered[0] = true;
                        denyRequest(request);
                    }
                })
                .create();

            dialogs.put(request, dialog);
            dialog.show();
            applyRoundedCorners(dialog, activity);
        });
    }

    /**
     * Deny a request, unless it has already been answered or cancelled.
     *
     * @param request Real WebView permission request.
     */
    private void denyRequest(PermissionRequest request) {
        dialogs.remove(request);

        if (pendingRequests.remove(request)) {
            request.deny();
        }
    }

    /**
     * Wrapper of a permission request that asks the user for confirmation when the request is granted.
     */
    private class ConfirmedPermissionRequest extends PermissionRequest {

        private final PermissionRequest request;
        private final String message;

        ConfirmedPermissionRequest(PermissionRequest request, String message) {
            this.request = request;
            this.message = message;
        }

        @Override
        public Uri getOrigin() {
            return request.getOrigin();
        }

        @Override
        public String[] getResources() {
            // Only expose the camera and microphone, so any other resource requested along with them is not granted.
            final List<String> captureResources = new ArrayList<>();

            for (String resource : request.getResources()) {
                if (
                    PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                    || PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                ) {
                    captureResources.add(resource);
                }
            }

            return captureResources.toArray(new String[0]);
        }

        @Override
        public void grant(String[] resources) {
            confirmRequest(request, resources, message);
        }

        @Override
        public void deny() {
            denyRequest(request);
        }

    }

    /**
     * Get a user-friendly name of the media that is being requested.
     *
     * @param request WebView permission request.
     * @return Media name, or null if the request doesn't involve audio or video capture.
     */
    private String getRequestedMediaName(PermissionRequest request) {
        boolean hasAudio = false;
        boolean hasVideo = false;

        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                hasAudio = true;
            } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                hasVideo = true;
            }
        }

        if (hasAudio && hasVideo) {
            return "camera and microphone";
        }

        if (hasVideo) {
            return "camera";
        }

        return hasAudio ? "microphone" : null;
    }

    /**
     * Get the name to display in the prompt: the app name if the request comes from the URL loaded in the WebView,
     * otherwise the host of the requester.
     *
     * @param request WebView permission request.
     * @return Name to display.
     */
    private String getDisplayHost(PermissionRequest request) {
        final Uri origin = request.getOrigin();
        final String requestHost = origin != null ? origin.getHost() : null;

        if (requestHost == null || requestHost.isEmpty()) {
            return getAppName();
        }

        final Uri webViewUri = getWebViewUri();
        final boolean isWebViewHost = webViewUri != null
            && requestHost.equalsIgnoreCase(webViewUri.getHost())
            && origin.getScheme() != null
            && origin.getScheme().equalsIgnoreCase(webViewUri.getScheme());

        return isWebViewHost ? getAppName() : requestHost;
    }

    /**
     * Get the URL currently loaded in the WebView.
     *
     * @return URL, or null if it isn't available.
     */
    private Uri getWebViewUri() {
        final WebView webView = bridge.getWebView();
        final String url = webView != null ? webView.getUrl() : null;

        return url != null && !url.isEmpty() ? Uri.parse(url) : null;
    }

    /**
     * Get the app name.
     *
     * @return App name.
     */
    private String getAppName() {
        final Activity activity = bridge.getActivity();
        if (activity != null) {
            final ApplicationInfo info = activity.getApplicationInfo();
            final CharSequence label = info.loadLabel(activity.getPackageManager());
            if (label != null && !label.toString().trim().isEmpty()) {
                return label.toString().trim();
            }
        }

        return "this app";
    }

    /**
     * Apply rounded corners to the dialog, using the theme background colour.
     *
     * @param dialog Dialog to style.
     * @param activity Activity used to resolve the theme and the display metrics.
     */
    private void applyRoundedCorners(AlertDialog dialog, Activity activity) {
        if (dialog.getWindow() == null) {
            return;
        }

        final TypedValue typedValue = new TypedValue();
        int backgroundColor = Color.WHITE;
        if (activity.getTheme().resolveAttribute(android.R.attr.colorBackgroundFloating, typedValue, true)
                || activity.getTheme().resolveAttribute(android.R.attr.colorBackground, typedValue, true)) {
            backgroundColor = typedValue.data;
        }

        final GradientDrawable background = new GradientDrawable();
        background.setShape(GradientDrawable.RECTANGLE);
        background.setColor(backgroundColor);
        background.setCornerRadius(TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            20f,
            activity.getResources().getDisplayMetrics()
        ));

        dialog.getWindow().setBackgroundDrawable(background);
    }

}
