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

/*
 * Imports
 */
import static android.content.Context.BATTERY_SERVICE;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;


import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaInterface;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.Manifest;
import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.net.ConnectivityManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.util.Log;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.provider.Settings;


import androidx.core.app.ActivityCompat;

/**
 * Diagnostic plugin implementation for Android
 */
public class Diagnostic extends CordovaPlugin{


    /*************
     * Constants *
     *************/

    /**
     * Tag for debug log messages
     */
    public static final String TAG = "Diagnostic";


    /**
     * Map of "dangerous" permissions that need to be requested at run-time (Android 6.0/API 23 and above)
     * See http://developer.android.com/guide/topics/security/permissions.html#perm-groups
     */
    protected static final Map<String, String> permissionsMap;
    static {
        Map<String, String> _permissionsMap = new HashMap <String, String>();

        // API 1-22+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ACCESS_COARSE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ACCESS_FINE_LOCATION", "android.permission.ACCESS_FINE_LOCATION");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ADD_VOICEMAIL", "android.permission.ADD_VOICEMAIL");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "BODY_SENSORS", "android.permission.BODY_SENSORS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "CALL_PHONE", "android.permission.CALL_PHONE");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "CAMERA", "android.permission.CAMERA");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "GET_ACCOUNTS", "android.permission.GET_ACCOUNTS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "PROCESS_OUTGOING_CALLS", "android.permission.PROCESS_OUTGOING_CALLS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_CALENDAR", "android.permission.READ_CALENDAR");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_CALL_LOG", "android.permission.READ_CALL_LOG");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_CONTACTS", "android.permission.READ_CONTACTS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_EXTERNAL_STORAGE", "android.permission.READ_EXTERNAL_STORAGE");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_PHONE_STATE", "android.permission.READ_PHONE_STATE");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_SMS", "android.permission.READ_SMS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "RECEIVE_MMS", "android.permission.RECEIVE_MMS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "RECEIVE_SMS", "android.permission.RECEIVE_SMS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "RECEIVE_WAP_PUSH", "android.permission.RECEIVE_WAP_PUSH");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "RECORD_AUDIO", "android.permission.RECORD_AUDIO");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "SEND_SMS", "android.permission.SEND_SMS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "USE_SIP", "android.permission.USE_SIP");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "WRITE_CALENDAR", "android.permission.WRITE_CALENDAR");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "WRITE_CALL_LOG", "android.permission.WRITE_CALL_LOG");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "WRITE_CONTACTS", "android.permission.WRITE_CONTACTS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "WRITE_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE");

        // API 26+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ANSWER_PHONE_CALLS", "android.permission.ANSWER_PHONE_CALLS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_PHONE_NUMBERS", "android.permission.READ_PHONE_NUMBERS");

        // API 28+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ACCEPT_HANDOVER", "android.permission.ACCEPT_HANDOVER");

        // API 29+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ACCESS_BACKGROUND_LOCATION", "android.permission.ACCESS_BACKGROUND_LOCATION");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ACCESS_MEDIA_LOCATION", "android.permission.ACCESS_MEDIA_LOCATION");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ACTIVITY_RECOGNITION", "android.permission.ACTIVITY_RECOGNITION");

        // API 31+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "BLUETOOTH_ADVERTISE", "android.permission.BLUETOOTH_ADVERTISE");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "BLUETOOTH_CONNECT", "android.permission.BLUETOOTH_CONNECT");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "BLUETOOTH_SCAN", "android.permission.BLUETOOTH_SCAN");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "UWB_RANGING", "android.permission.UWB_RANGING");

        // API 33+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "BODY_SENSORS_BACKGROUND", "android.permission.BODY_SENSORS_BACKGROUND");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "NEARBY_WIFI_DEVICES", "android.permission.NEARBY_WIFI_DEVICES");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "POST_NOTIFICATIONS", "android.permission.POST_NOTIFICATIONS");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_MEDIA_AUDIO", "android.permission.READ_MEDIA_AUDIO");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_MEDIA_IMAGES", "android.permission.READ_MEDIA_IMAGES");
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_MEDIA_VIDEO", "android.permission.READ_MEDIA_VIDEO");

        permissionsMap = Collections.unmodifiableMap(_permissionsMap);
    }

    /**
     * Map of minimum build SDK version supported by defined permissions
     */
    protected static final Map<String, Integer> minSdkPermissionMap;
    static {
        Map<String, Integer> _permissionsMap = new HashMap <String, Integer>();

        // API 26+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ANSWER_PHONE_CALLS", 26);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_PHONE_NUMBERS", 26);

        // API 28+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ACCEPT_HANDOVER", 28);

        // API 29+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ACCESS_BACKGROUND_LOCATION", 29);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ACCESS_MEDIA_LOCATION", 29);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "ACTIVITY_RECOGNITION", 29);

        // API 31+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "BLUETOOTH_ADVERTISE", 31);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "BLUETOOTH_CONNECT",   31);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "BLUETOOTH_SCAN",    31);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "UWB_RANGING",      31);

        // API 33+
        Diagnostic.addBiDirMapEntry(_permissionsMap, "BODY_SENSORS_BACKGROUND", 33);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "NEARBY_WIFI_DEVICES", 33);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "POST_NOTIFICATIONS", 33);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_MEDIA_AUDIO", 33);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_MEDIA_IMAGES", 33);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_MEDIA_VIDEO", 33);

        minSdkPermissionMap = Collections.unmodifiableMap(_permissionsMap);
    }

    /**
     * Map of maximum build SDK version supported by defined permissions
     */
    protected static final Map<String, Integer> maxSdkPermissionMap;
    static {
        Map<String, Integer> _permissionsMap = new HashMap <String, Integer>();

        Diagnostic.addBiDirMapEntry(_permissionsMap, "READ_EXTERNAL_STORAGE", 32);
        Diagnostic.addBiDirMapEntry(_permissionsMap, "WRITE_EXTERNAL_STORAGE", 29);

        maxSdkPermissionMap = Collections.unmodifiableMap(_permissionsMap);
    }


    /*
     * Map of permission request code to callback context
     */
    protected HashMap<String, CallbackContext> callbackContexts = new HashMap<String, CallbackContext>();

    /*
     * Map of permission request code to permission statuses
     */
    protected HashMap<String, JSONObject> permissionStatuses = new HashMap<String, JSONObject>();


    /**
     * User authorised permission
     */
    protected static final String STATUS_GRANTED = "GRANTED";

    /**
     * User denied permission (without checking "never ask again")
     */
    protected static final String STATUS_DENIED_ONCE = "DENIED_ONCE";

    /**
     * User denied permission and checked "never ask again"
     */
    protected static final String STATUS_DENIED_ALWAYS = "DENIED_ALWAYS";

    /**
     * Authorisation has not yet been requested for permission
     */
    protected static final String STATUS_NOT_REQUESTED = "NOT_REQUESTED";

    public static final String CPU_ARCH_UNKNOWN = "unknown";
    public static final String CPU_ARCH_ARMv6 = "ARMv6";
    public static final String CPU_ARCH_ARMv7 = "ARMv7";
    public static final String CPU_ARCH_ARMv8 = "ARMv8";
    public static final String CPU_ARCH_X86 = "X86";
    public static final String CPU_ARCH_X86_64 = "X86_64";
    public static final String CPU_ARCH_MIPS = "MIPS";
    public static final String CPU_ARCH_MIPS_64 = "MIPS_64";

    protected static final String externalStorageClassName = "cordova.plugins.Diagnostic_External_Storage";
    protected static final Integer GET_EXTERNAL_SD_CARD_DETAILS_PERMISSION_REQUEST = 1000;

    /*************
     * Variables *
     *************/

    /**
     * Singleton class instance
     */
    public static Diagnostic instance = null;

    boolean debugEnabled = false;


    /**
     * Current Cordova callback context (on this thread)
     */
    protected CallbackContext currentContext;

    protected Context applicationContext;

    protected SharedPreferences sharedPref;
    protected SharedPreferences.Editor editor;

    /*************
     * Public API
     ************/

    /**
     * Constructor.
     */
    public Diagnostic() {}

    public static Diagnostic getInstance(){
        return instance;
    }

    /**
     * Sets the context of the Command. This can then be used to do things like
     * get file paths associated with the Activity.
     *
     * @param cordova The context of the main Activity.
     * @param webView The CordovaWebView Cordova is running in.
     */
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        Log.d(TAG, "initialize()");
        instance = this;

        applicationContext = this.cordova.getActivity().getApplicationContext();
        sharedPref = cordova.getActivity().getSharedPreferences(TAG, Activity.MODE_PRIVATE);
        editor = sharedPref.edit();

        super.initialize(cordova, webView);
    }

    /**
     * Executes the request and returns PluginResult.
     *
     * @param action            The action to execute.
     * @param args              JSONArry of arguments for the plugin.
     * @param callbackContext   The callback id used when calling back into JavaScript.
     * @return                  True if the action was valid, false if not.
     */
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        currentContext = callbackContext;

        try {
            if (action.equals("enableDebug")){
                debugEnabled = true;
                logDebug("Debug enabled");
                callbackContext.success();
            } else if (action.equals("switchToSettings")){
                switchToAppSettings();
                callbackContext.success();
            } else if (action.equals("switchToMobileDataSettings")){
                switchToMobileDataSettings();
                callbackContext.success();
            } else if (action.equals("switchToWirelessSettings")){
                switchToWirelessSettings();
                callbackContext.success();
            } else if(action.equals("isDataRoamingEnabled")) {
                if(Build.VERSION.SDK_INT <= 32) { // Android 12L
                    callbackContext.success(isDataRoamingEnabled() ? 1 : 0);
                } else {
                    callbackContext.error("Data roaming setting not available on Android 12L / API32+");
                }
                callbackContext.success(isDataRoamingEnabled() ? 1 : 0);
            } else if(action.equals("getPermissionAuthorizationStatus")) {
                this.getPermissionAuthorizationStatus(args);
            } else if(action.equals("getPermissionsAuthorizationStatus")) {
                this.getPermissionsAuthorizationStatus(args);
            } else if(action.equals("requestRuntimePermission")) {
                this.requestRuntimePermission(args);
            } else if(action.equals("requestRuntimePermissions")) {
                this.requestRuntimePermissions(args);
            } else if(action.equals("requestMicrophoneAuthorization")) {
                this.requestRuntimePermission("RECORD_AUDIO");
            } else if(action.equals("isADBModeEnabled")) {
                callbackContext.success(isADBModeEnabled() ? 1 : 0);
            } else if(action.equals("isDeviceRooted")) {
                callbackContext.success(isDeviceRooted() ? 1 : 0);
            } else if(action.equals("isMobileDataEnabled")) {
                callbackContext.success(isMobileDataEnabled() ? 1 : 0);
            } else if(action.equals("restart")) {
                this.restart(args);
            } else if(action.equals("getArchitecture")) {
                callbackContext.success(getCPUArchitecture());
            } else if(action.equals("getCurrentBatteryLevel")) {
                callbackContext.success(getCurrentBatteryLevel());
            } else if(action.equals("isAirplaneModeEnabled")) {
                callbackContext.success(isAirplaneModeEnabled() ? 1 : 0);
            } else if(action.equals("getDeviceOSVersion")) {
                callbackContext.success(getDeviceOSVersion());
            } else if(action.equals("getBuildOSVersion")) {
                callbackContext.success(getBuildOSVersion());
            } else {
                handleError("Invalid action");
                return false;
            }
        }catch(Exception e ) {
            handleError("Exception occurred: ".concat(e.getMessage()));
            return false;
        }
        return true;
    }

    public void restart(JSONArray args) throws Exception{
        boolean cold = args.getBoolean(0);
        if(cold){
            doColdRestart();
        }else{
            doWarmRestart();
        }
    }


    public boolean isDataRoamingEnabled() throws Exception {
        return Settings.Global.getInt(this.cordova.getActivity().getContentResolver(), Settings.Global.DATA_ROAMING, 0) == 1;
    }

    public void switchToAppSettings() {
        logDebug("Switch to App Settings");
        Intent appIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", cordova.getActivity().getPackageName(), null);
        appIntent.setData(uri);
        cordova.getActivity().startActivity(appIntent);
    }


    public void switchToMobileDataSettings() {
        logDebug("Switch to Mobile Data Settings");
        Intent settingsIntent = new Intent(Settings.ACTION_DATA_ROAMING_SETTINGS);
        cordova.getActivity().startActivity(settingsIntent);
    }

    public void switchToWirelessSettings() {
        logDebug("Switch to wireless Settings");
        Intent settingsIntent = new Intent(Settings.ACTION_WIRELESS_SETTINGS);
        cordova.getActivity().startActivity(settingsIntent);
    }

    public void getPermissionsAuthorizationStatus(JSONArray args) throws Exception{
        JSONArray permissions = args.getJSONArray(0);
        JSONObject statuses = _getPermissionsAuthorizationStatus(jsonArrayToStringArray(permissions));
        currentContext.success(statuses);
    }

    public void getPermissionAuthorizationStatus(JSONArray args) throws Exception{
        String permission = args.getString(0);
        JSONArray permissions = new JSONArray();
        permissions.put(permission);
        JSONObject statuses = _getPermissionsAuthorizationStatus(jsonArrayToStringArray(permissions));
        currentContext.success(statuses.getString(permission));
    }

    public void requestRuntimePermissions(JSONArray args) throws Exception{
        JSONArray permissions = args.getJSONArray(0);
        int requestId = storeCurrentContextByRequestId();
        _requestRuntimePermissions(permissions, requestId);
    }

    public void requestRuntimePermission(JSONArray args) throws Exception{
        requestRuntimePermission(args.getString(0));
    }

    public void requestRuntimePermission(String permission) throws Exception{
        requestRuntimePermission(permission, storeCurrentContextByRequestId());
    }

    public void requestRuntimePermission(String permission, int requestId) throws Exception{
        JSONArray permissions = new JSONArray();
        permissions.put(permission);
        _requestRuntimePermissions(permissions, requestId);
    }

    /**
     * get device ADB mode info
     */
    public int getADBMode(){
        int mode;
        if (Build.VERSION.SDK_INT >= 17){ // Jelly_Bean_MR1 and above
            mode = Settings.Global.getInt(applicationContext.getContentResolver(), Settings.Global.ADB_ENABLED, 0);
        } else { // Pre-Jelly_Bean_MR1
            mode = Settings.Secure.getInt(applicationContext.getContentResolver(), Settings.Secure.ADB_ENABLED, 0);
        }
        return mode;
    }

    /**
     * checks if ADB mode is on
     * especially for debug mode check
     */
    public boolean isADBModeEnabled(){
        boolean result = false;
        try {
            result = getADBMode() == 1;
        } catch (Exception e) {
            logError(e.getMessage());
        }
        logDebug("ADB mode enabled: " + result);
        return result;
    }

    /**
     * checks if device is rooted
     * refer to: https://stackoverflow.com/questions/1101380
     */
    public boolean isDeviceRooted(){
        // from build info
        String buildTags = android.os.Build.TAGS;
        if (buildTags != null && buildTags.contains("test-keys")) {
            return true;
        }

        // from binary exists
        try {
            String[] paths = { "/system/app/Superuser.apk", "/sbin/su", "/system/bin/su", "/system/xbin/su", "/data/local/xbin/su",
                    "/data/local/bin/su", "/system/sd/xbin/su", "/system/bin/failsafe/su", "/data/local/su" };
            for (String path : paths) {
                if (new File(path).exists()) {
                    return true;
                }
            }
        } catch (Exception e) {
            logDebug(e.getMessage());
        }

        // from command authority
        Process process = null;
        try {
            process = Runtime.getRuntime().exec(new String[] { "/system/xbin/which", "su" });
            BufferedReader in = new BufferedReader(new InputStreamReader(process.getInputStream()));
            if (in.readLine() != null) {
                return true;
            }
        } catch (Exception e) {
            logDebug(e.getMessage());
        } finally {
            if (process != null) process.destroy();
        }

        return false;
    }

    // https://stackoverflow.com/a/12864897/777265
    public boolean isMobileDataEnabled(){
        boolean mobileDataEnabled = false; // Assume disabled
        ConnectivityManager cm = (ConnectivityManager) cordova.getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        try {
            Class cmClass = Class.forName(cm.getClass().getName());
            Method method = cmClass.getDeclaredMethod("getMobileDataEnabled");
            method.setAccessible(true);
            mobileDataEnabled = (Boolean)method.invoke(cm);
        } catch (Exception e) {
            logDebug(e.getMessage());
        }
        return mobileDataEnabled;
    }

    /************
     * Internals
     ***********/

    public void logDebug(String msg) {
        if(msg == null) return;
        if(debugEnabled){
            Log.d(TAG, msg);
            executeGlobalJavascript("console.log(\""+TAG+"[native]: "+escapeDoubleQuotes(msg)+"\")");
        }
    }

    public void logInfo(String msg){
        if(msg == null) return;
        Log.i(TAG, msg);
        if(debugEnabled){
            executeGlobalJavascript("console.info(\""+TAG+"[native]: "+escapeDoubleQuotes(msg)+"\")");
        }
    }

    public void logWarning(String msg){
        if(msg == null) return;
        Log.w(TAG, msg);
        if(debugEnabled){
            executeGlobalJavascript("console.warn(\""+TAG+"[native]: "+escapeDoubleQuotes(msg)+"\")");
        }
    }

    public void logError(String msg){
        if(msg == null) return;
        Log.e(TAG, msg);
        if(debugEnabled){
            executeGlobalJavascript("console.error(\""+TAG+"[native]: "+escapeDoubleQuotes(msg)+"\")");
        }
    }

    public String escapeDoubleQuotes(String string){
        String escapedString = string.replace("\"", "\\\"");
        escapedString = escapedString.replace("%22", "\\%22");
        return escapedString;
    }

    /**
     * Handles an error while executing a plugin API method  in the specified context.
     * Calls the registered Javascript plugin error handler callback.
     * @param errorMsg Error message to pass to the JS error handler
     */
    public void handleError(String errorMsg, CallbackContext context){
        try {
            logError(errorMsg);
            context.error(errorMsg);
        } catch (Exception e) {
            logError(e.toString());
        }
    }

    /**
     * Handles an error while executing a plugin API method in the current context.
     * Calls the registered Javascript plugin error handler callback.
     * @param errorMsg Error message to pass to the JS error handler
     */
    public void handleError(String errorMsg) {
        handleError(errorMsg, currentContext);
    }

    /**
     * Handles error during a runtime permissions request.
     * Calls the registered Javascript plugin error handler callback
     * then removes entries associated with the request ID.
     * @param errorMsg Error message to pass to the JS error handler
     * @param requestId The ID of the runtime request
     */
    public void handleError(String errorMsg, int requestId){
        CallbackContext context;
        String sRequestId = String.valueOf(requestId);
        if (callbackContexts.containsKey(sRequestId)) {
            context = callbackContexts.get(sRequestId);
        }else{
            context = currentContext;
        }
        handleError(errorMsg, context);
        clearRequest(requestId);
    }

    protected JSONObject _getPermissionsAuthorizationStatus(String[] permissions) throws Exception{
        JSONObject statuses = new JSONObject();
        for(int i=0; i<permissions.length; i++){
            String permission = permissions[i];
            if(!permissionsMap.containsKey(permission)){
                throw new Exception("Permission name '"+permission+"' is not a valid permission");
            }
            String androidPermission = permissionsMap.get(permission);
            Log.v(TAG, "Get authorisation status for "+androidPermission);
            boolean granted = hasRuntimePermission(androidPermission);
            if(granted || isPermissionImplicitlyGranted(permission)){
                statuses.put(permission, Diagnostic.STATUS_GRANTED);
            }else{
                boolean showRationale = shouldShowRequestPermissionRationale(this.cordova.getActivity(), androidPermission);
                if(!showRationale){
                    if(isPermissionRequested(permission)){
                        statuses.put(permission, Diagnostic.STATUS_DENIED_ALWAYS);
                    }else{
                        statuses.put(permission, Diagnostic.STATUS_NOT_REQUESTED);
                    }
                }else{
                    statuses.put(permission, Diagnostic.STATUS_DENIED_ONCE);
                }
            }
        }
        return statuses;
    }

    protected void _requestRuntimePermissions(JSONArray permissions, int requestId) throws Exception{
        JSONObject currentPermissionsStatuses = _getPermissionsAuthorizationStatus(jsonArrayToStringArray(permissions));
        JSONArray permissionsToRequest = new JSONArray();
        for(int i = 0; i<currentPermissionsStatuses.names().length(); i++){
            String permission = currentPermissionsStatuses.names().getString(i);

            if(!permissionsMap.containsKey(permission)){
                throw new Exception("Permission name '"+permission+"' is not a supported permission");
            }

            boolean granted = currentPermissionsStatuses.getString(permission) == Diagnostic.STATUS_GRANTED;
            if(granted || isPermissionImplicitlyGranted(permission)){
                Log.d(TAG, "Permission already granted for "+permission);
                JSONObject requestStatuses = permissionStatuses.get(String.valueOf(requestId));
                requestStatuses.put(permission, Diagnostic.STATUS_GRANTED);
                permissionStatuses.put(String.valueOf(requestId), requestStatuses);
            }else{

                if(minSdkPermissionMap.containsKey(permission) && getDeviceRuntimeSdkVersion() < minSdkPermissionMap.get(permission)){
                    throw new Exception("Permission "+permission+" not supported for build SDK version "+getDeviceRuntimeSdkVersion());
                }

                if(maxSdkPermissionMap.containsKey(permission) && getDeviceRuntimeSdkVersion() > maxSdkPermissionMap.get(permission)){
                    throw new Exception("Permission "+permission+" not supported for build SDK version "+getDeviceRuntimeSdkVersion());
                }

                String androidPermission = permissionsMap.get(permission);
                Log.d(TAG, "Requesting permission for "+androidPermission);
                permissionsToRequest.put(androidPermission);
            }
        }
        if(permissionsToRequest.length() > 0){
            Log.v(TAG, "Requesting permissions");
            requestPermissions(this, requestId, jsonArrayToStringArray(permissionsToRequest));

        }else{
            Log.d(TAG, "No permissions to request: returning result");
            sendRuntimeRequestResult(requestId);
        }
    }

    protected boolean isPermissionImplicitlyGranted(String permission) throws Exception{
        boolean isImplicitlyGranted = false;
        int buildTargetSdkVersion = getBuildTargetSdkVersion();
        int deviceRuntimeSdkVersion = getDeviceRuntimeSdkVersion();

        if(minSdkPermissionMap.containsKey(permission)){
            int minSDKForPermission = minSdkPermissionMap.get(permission);
            if(buildTargetSdkVersion >= minSDKForPermission && deviceRuntimeSdkVersion < minSDKForPermission) {
                isImplicitlyGranted = true;
                Log.v(TAG, "Permission "+permission+" is implicitly granted because while it's defined in build SDK version "+buildTargetSdkVersion+", the device runtime SDK version "+deviceRuntimeSdkVersion+" does not support it.");
            }
        }

        return isImplicitlyGranted;
    }

    protected void sendRuntimeRequestResult(int requestId){
        String sRequestId = String.valueOf(requestId);
        CallbackContext context = callbackContexts.get(sRequestId);
        JSONObject statuses = permissionStatuses.get(sRequestId);
        Log.v(TAG, "Sending runtime request result for id="+sRequestId);
        context.success(statuses);
    }

    protected int storeCurrentContextByRequestId(){
        return storeContextByRequestId(currentContext);
    }

    protected int storeContextByRequestId(CallbackContext callbackContext){
        String requestId = generateRandomRequestId();
        callbackContexts.put(requestId, callbackContext);
        permissionStatuses.put(requestId, new JSONObject());
        return Integer.valueOf(requestId);
    }

    protected String generateRandomRequestId(){
        String requestId = null;

        while(requestId == null){
            requestId = generateRandom();
            if(callbackContexts.containsKey(requestId)){
                requestId = null;
            }
        }
        return requestId;
    }

    protected String generateRandom(){
        Random rn = new Random();
        int random = rn.nextInt(1000000) + 1;
        return Integer.toString(random);
    }

    protected String[] jsonArrayToStringArray(JSONArray array) throws JSONException{
        if(array==null)
            return null;

        String[] arr=new String[array.length()];
        for(int i=0; i<arr.length; i++) {
            arr[i]=array.optString(i);
        }
        return arr;
    }

    protected JSONArray stringArrayToJsonArray(String[] array) throws JSONException{
        if(array==null)
            return null;

        JSONArray arr = new JSONArray();
        for(int i=0; i<array.length; i++) {
            arr.put(i, array[i]);
        }
        return arr;
    }

    protected CallbackContext getContextById(String requestId) throws Exception{
        if (!callbackContexts.containsKey(requestId)) {
            throw new Exception("No context found for request id=" + requestId);
        }
        return callbackContexts.get(requestId);
    }

    protected void clearRequest(int requestId){
        String sRequestId = String.valueOf(requestId);
        if (!callbackContexts.containsKey(sRequestId)) {
            return;
        }
        callbackContexts.remove(sRequestId);
        permissionStatuses.remove(sRequestId);
    }

    /**
     * Adds a bi-directional entry to a map in the form on 2 entries: key>value and value>key
     * @param map
     * @param key
     * @param value
     */
    protected static void addBiDirMapEntry(Map map, Object key, Object value){
        map.put(key, value);
        map.put(value, key);
    }

    protected boolean hasRuntimePermission(String permission) throws Exception{
        boolean hasRuntimePermission = true;
        Method method = null;
        try {
            method = cordova.getClass().getMethod("hasPermission", permission.getClass());
            Boolean bool = (Boolean) method.invoke(cordova, permission);
            hasRuntimePermission = bool.booleanValue();
        } catch (NoSuchMethodException e) {
            logWarning("Cordova v" + CordovaWebView.CORDOVA_VERSION + " does not support runtime permissions so defaulting to GRANTED for " + permission);
        }
        return hasRuntimePermission;
    }

    protected void requestPermissions(CordovaPlugin plugin, int requestCode, String [] permissions) throws Exception{
        try {
            java.lang.reflect.Method method = cordova.getClass().getMethod("requestPermissions", org.apache.cordova.CordovaPlugin.class ,int.class, java.lang.String[].class);
            method.invoke(cordova, plugin, requestCode, permissions);
            for(String permission : permissions){
                setPermissionRequested(permissionsMap.get(permission));
            }
        } catch (NoSuchMethodException e) {
            throw new Exception("requestPermissions() method not found in CordovaInterface implementation of Cordova v" + CordovaWebView.CORDOVA_VERSION);
        }
    }

    protected boolean shouldShowRequestPermissionRationale(Activity activity, String permission) throws Exception{
        boolean shouldShow;
        try {
            java.lang.reflect.Method method = ActivityCompat.class.getMethod("shouldShowRequestPermissionRationale", Activity.class, java.lang.String.class);
            Boolean bool = (Boolean) method.invoke(null, activity, permission);
            shouldShow = bool.booleanValue();
        } catch (NoSuchMethodException e) {
            throw new Exception("shouldShowRequestPermissionRationale() method not found in ActivityCompat class.");
        }
        return shouldShow;
    }

    public void executeGlobalJavascript(final String jsString){
        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                webView.loadUrl("javascript:" + jsString);
            }
        });
    }

    public void executePluginJavascript(final String jsString){
        executeGlobalJavascript("cordova.plugins.diagnostic." + jsString);
    }

    /**
     * Performs a warm app restart - restarts only Cordova main activity
     */
    protected void doWarmRestart() {
        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    logInfo("Warm restarting main activity");
                    instance.cordova.getActivity().recreate();
                } catch (Exception ex) {
                    handleError("Unable to warm restart main activity: " + ex.getMessage());
                }
            }
        });
    }

    /**
     * Performs a full cold app restart - restarts application
     * https://stackoverflow.com/a/58530756/777265
     */
    protected void doColdRestart() {
        String baseError = "Unable to cold restart application: ";
        try {
            logInfo("Cold restarting application");
            Activity activity = instance.cordova.getActivity();
            if (activity != null) {
                // Systems at 29/Q and later don't allow relaunch, but System.exit(0) on
                // all supported systems will relaunch ... but by killing the process, then
                // restarting the process with the back stack intact. We must make sure that
                // the launch activity is the only thing in the back stack before exiting.
                final PackageManager pm = activity.getPackageManager();
                final Intent intent = pm.getLaunchIntentForPackage(activity.getPackageName());
                activity.finishAffinity(); // Finishes all activities.
                activity.startActivity(intent);    // Start the launch activity
                System.exit(0);    // System finishes and automatically relaunches us.
            } else {
                handleError(baseError+"Activity is null");
            }
        } catch (Exception ex) {
            handleError(baseError+ ex.getMessage());
        }
    }

    protected String getCPUArchitecture(){
        String arch = CPU_ARCH_UNKNOWN;

        String abi = null;

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            abi = Build.CPU_ABI;
        } else {
            abi = Build.SUPPORTED_ABIS[0];
        }


        if (abi == "armeabi") {
            arch = CPU_ARCH_ARMv6;
        } else if (abi.equals("armeabi-v7a")) {
            arch = CPU_ARCH_ARMv7;
        } else if (abi.equals("arm64-v8a")) {
            arch = CPU_ARCH_ARMv8;
        } else if (abi.equals("x86")) {
            arch = CPU_ARCH_X86;
        } else if (abi.equals("x86_64")) {
            arch = CPU_ARCH_X86_64;
        } else if (abi.equals("mips")) {
            arch = CPU_ARCH_MIPS;
        } else if (abi.equals("mips64")) {
            arch = CPU_ARCH_MIPS_64;
        }

        return arch;
    }

    protected void setPermissionRequested(String permission){
        editor.putBoolean(permission, true);
        boolean success = editor.commit();
        if(!success){
            handleError("Failed to set permission requested flag for " + permission);
        }
    }

    protected boolean isPermissionRequested(String permission){
        return sharedPref.getBoolean(permission, false);
    }

    protected int getCurrentBatteryLevel(){
        BatteryManager bm = (BatteryManager) cordova.getContext().getApplicationContext().getSystemService(BATTERY_SERVICE);
        return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
    }

    // https://stackoverflow.com/a/18237962/777265
    protected boolean hasBuildPermission(String permission)
    {
        try {
            PackageInfo info = this.cordova.getActivity().getPackageManager().getPackageInfo(this.cordova.getContext().getPackageName(), PackageManager.GET_PERMISSIONS);
            if (info.requestedPermissions != null) {
                for (String p : info.requestedPermissions) {
                    if (p.equals("android.permission."+permission)) {
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    public boolean isAirplaneModeEnabled() {
        return Settings.Global.getInt(this.cordova.getActivity().getContentResolver(),
                Settings.Global.AIRPLANE_MODE_ON, 0) != 0;
    }

    public JSONObject getDeviceOSVersion() throws Exception{
        JSONObject details = new JSONObject();
        details.put("version", Build.VERSION.RELEASE);
        int buildVersion = getDeviceRuntimeSdkVersion();
        details.put("apiLevel", buildVersion);
        details.put("apiName", getNameForApiLevel(buildVersion));
        return details;
    }

    protected int getDeviceRuntimeSdkVersion() {
        return Build.VERSION.SDK_INT;
    }

    public JSONObject getBuildOSVersion() throws Exception{
        JSONObject details = new JSONObject();
        int targetVersion = getBuildTargetSdkVersion();
        int minVersion = getBuildMinimumSdkVersion();

        details.put("targetApiLevel", targetVersion);
        details.put("targetApiName", getNameForApiLevel(targetVersion));
        details.put("minApiLevel", minVersion);
        details.put("minApiName", getNameForApiLevel(minVersion));
        return details;
    }

    protected int getBuildTargetSdkVersion() throws Exception{
        int targetVersion = 0;
        Activity activity = instance.cordova.getActivity();
        ApplicationInfo applicationInfo = activity.getPackageManager().getApplicationInfo(activity.getPackageName(), 0);
        if (applicationInfo != null) {
            targetVersion = applicationInfo.targetSdkVersion;
        }
        return targetVersion;
    }

    protected int getBuildMinimumSdkVersion() throws Exception{
        int minVersion = 0;
        Activity activity = instance.cordova.getActivity();
        ApplicationInfo applicationInfo = activity.getPackageManager().getApplicationInfo(activity.getPackageName(), 0);
        if (applicationInfo != null) {
            if(Build.VERSION.SDK_INT >= 24){
                minVersion = applicationInfo.minSdkVersion;
            }
        }
        return minVersion;
    }


    // https://stackoverflow.com/a/55946200/777265
    protected String getNameForApiLevel(int apiLevel) throws Exception{
        Field[] fields = Build.VERSION_CODES.class.getFields();
        String codeName = "UNKNOWN";
        for (Field field : fields) {
            if (field.getInt(Build.VERSION_CODES.class) == apiLevel) {
                codeName = field.getName();
            }
        }
        return codeName;
    }

    protected String[] concatStrings(String[] A, String[] B) {
        int aLen = A.length;
        int bLen = B.length;
        String[] C= new String[aLen+bLen];
        System.arraycopy(A, 0, C, 0, aLen);
        System.arraycopy(B, 0, C, aLen, bLen);
        return C;
    }

    /************
     * Overrides
     ***********/

    /**
     * Callback received when a runtime permissions request has been completed.
     * Retrieves the stateful Cordova context and permission statuses associated with the requestId,
     * then updates the list of status based on the grantResults before passing the result back via the context.
     *
     * @param requestCode - ID that was used when requesting permissions
     * @param permissions - list of permissions that were requested
     * @param grantResults - list of flags indicating if above permissions were granted or denied
     */
    public void onRequestPermissionResult(int requestCode, String[] permissions, int[] grantResults) throws JSONException {
        String sRequestId = String.valueOf(requestCode);
        Log.v(TAG, "Received result for permissions request id=" + sRequestId);
        try {

            CallbackContext context = getContextById(sRequestId);
            JSONObject statuses = permissionStatuses.get(sRequestId);

            for (int i = 0, len = permissions.length; i < len; i++) {
                String androidPermission = permissions[i];
                String permission = permissionsMap.get(androidPermission);
                if(Build.VERSION.SDK_INT < 29 && permission.equals("ACCESS_BACKGROUND_LOCATION")){
                    // This version of Android doesn't support background location permission so use standard coarse location permission
                    permission = "ACCESS_COARSE_LOCATION";
                }
                if(Build.VERSION.SDK_INT < 29 && permission.equals("ACTIVITY_RECOGNITION")){
                    // This version of Android doesn't support activity recognition permission so check for body sensors permission
                    permission = "BODY_SENSORS";
                }
                String status;
                if (grantResults[i] == PackageManager.PERMISSION_DENIED) {
                    boolean showRationale = shouldShowRequestPermissionRationale(this.cordova.getActivity(), androidPermission);
                    if (!showRationale) {
                        if(isPermissionRequested(permission)){
                            // user denied WITH "never ask again"
                            status = Diagnostic.STATUS_DENIED_ALWAYS;
                        }else{
                            // The app doesn't have permission and the user has not been asked for the permission before
                            status = Diagnostic.STATUS_NOT_REQUESTED;
                        }
                    } else {
                        // user denied WITHOUT "never ask again"
                        status = Diagnostic.STATUS_DENIED_ONCE;
                    }
                } else {
                    // Permission granted
                    status = Diagnostic.STATUS_GRANTED;
                }
                statuses.put(permission, status);
                Log.v(TAG, "Authorisation for " + permission + " is " + statuses.get(permission));
                clearRequest(requestCode);
            }

            Class<?> externalStorageClass = null;
            try {
                externalStorageClass = Class.forName(externalStorageClassName);
            } catch( ClassNotFoundException e ){}

            if(requestCode == GET_EXTERNAL_SD_CARD_DETAILS_PERMISSION_REQUEST && externalStorageClass != null){
                Method method = externalStorageClass.getMethod("onReceivePermissionResult");
                method.invoke(null);
            }else{
                context.success(statuses);
            }
        }catch(Exception e ) {
            handleError("Exception occurred onRequestPermissionsResult: ".concat(e.getMessage()), requestCode);
        }
    }

}
