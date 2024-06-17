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

/**
 * Checks whether device hardware features are enabled or available to the app, e.g. camera, GPS, wifi.
 * Most of this code was copied from https://github.com/dpa99c/cordova-diagnostic-plugin
 */
export class Diagnostic {

    /**
     * Constants for requesting and reporting the various permission states.
     */
    declare permissionStatus: typeof permissionStatus;

    /**
     * ANDROID ONLY
     * "Dangerous" permissions that need to be requested at run-time (Android 6.0/API 23 and above)
     * See http://developer.android.com/guide/topics/security/permissions.html#perm-groups
     *
     */
    declare permission: typeof permission;

    declare protected requestInProgress: boolean;

    constructor() {
        this.permissionStatus = permissionStatus;
        this.permission = permission;

        this.requestInProgress = false;
    }

    /**
     * Checks if the device location setting is enabled.
     * On iOS, returns true if Location Services is enabled.
     * On Android, returns true if Location Mode is enabled and any mode is selected (e.g. Battery saving, Device only, ...).
     *
     * @returns True if location setting is enabled.
     */
    isLocationEnabled(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => cordova.exec(resolve, reject, 'Diagnostic_Location', 'isLocationEnabled'));
    }

    /**
     * Android only. Switches to the Location page in the Settings app.
     *
     * @returns Promise resolved when done.
     */
    switchToLocationSettings(): Promise<void> {
        if (cordova.platformId !== 'android') {
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) =>
            cordova.exec(resolve, reject, 'Diagnostic_Location', 'switchToLocationSettings'));
    }

    /**
     * Opens settings page for this app.
     */
    switchToSettings(): Promise<void> {
        return new Promise<void>((resolve, reject) => cordova.exec(resolve, reject, 'Diagnostic', 'switchToSettings'));
    }

    /**
     * Returns the location authorization status for the application.
     *
     * @returns Authorization status.
     */
    getLocationAuthorizationStatus(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (cordova.platformId === 'ios') {
                cordova.exec(resolve, reject, 'Diagnostic_Location', 'getLocationAuthorizationStatus');

                return;
            }

            this.getPermissionsAuthorizationStatus([
                permission.accessCoarseLocation,
                permission.accessFineLocation,
                permission.accessBackgroundLocation,
            ]).then(statuses => {
                const coarseStatus = statuses[permission.accessCoarseLocation];
                const fineStatus = statuses[permission.accessFineLocation];
                const backgroundStatus = typeof statuses[permission.accessBackgroundLocation] !== 'undefined' ?
                    statuses[permission.accessBackgroundLocation] : true;

                let status: string = permissionStatus.notRequested;

                if (coarseStatus === permissionStatus.granted || fineStatus === permissionStatus.granted) {
                    status = backgroundStatus === permissionStatus.granted ?
                        permissionStatus.granted : permissionStatus.grantedWhenInUse;
                } else if (coarseStatus === permissionStatus.deniedOnce || fineStatus === permissionStatus.deniedOnce) {
                    status = permissionStatus.deniedOnce;
                } else if (coarseStatus === permissionStatus.deniedAlways || fineStatus === permissionStatus.deniedAlways) {
                    status = permissionStatus.deniedAlways;
                }

                resolve(status);

                return;
            }).catch(reject);
        });
    }

    /**
     * Requests location authorization for the application.
     * Authorization can be requested to use location either "when in use" (only foreground) or "always" (foreground & background).
     * Should only be called if authorization status is NOT_REQUESTED. Calling it when in any other state will have no effect.
     *
     * @returns Permission status.
     */
    requestLocationAuthorization(): Promise<string> {
        return new Promise<string>((resolve, reject) =>
            cordova.exec(
                status => resolve(this.convertPermissionStatus(status)),
                reject,
                'Diagnostic_Location',
                'requestLocationAuthorization',
                [false, true],
            ));
    }

    /**
     * Requests access to microphone if authorization was never granted nor denied, will only return access status otherwise.
     *
     * @returns Permission status.
     */
    requestMicrophoneAuthorization(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (cordova.platformId === 'ios') {
                cordova.exec(
                    (isGranted) => resolve(isGranted ? permissionStatus.granted : permissionStatus.deniedAlways),
                    reject,
                    'Diagnostic_Microphone',
                    'requestMicrophoneAuthorization',
                );

                return;
            }

            this.requestRuntimePermission(permission.recordAudio).then(resolve).catch(reject);
        });
    }

    /**
     * Android only. Given a list of permissions, returns the status for each permission.
     *
     * @param permissions Permissions to check.
     * @returns Status for each permission.
     */
    protected getPermissionsAuthorizationStatus(permissions: string[]): Promise<Record<string, string>> {
        return new Promise<Record<string, string>>((resolve, reject) => {
            if (cordova.platformId !== 'android') {
                resolve({});

                return;
            }

            cordova.exec(
                (statuses) => {
                    for (const permission in statuses) {
                        statuses[permission] = this.convertPermissionStatus(statuses[permission]);
                    }

                    resolve(statuses);
                },
                reject,
                'Diagnostic',
                'getPermissionsAuthorizationStatus',
                [permissions],
            );
        });
    }

    /**
     * Android only. Requests app to be granted authorisation for a runtime permission.
     *
     * @param permission Permissions to request.
     * @returns Status for each permission.
     */
    protected requestRuntimePermission(permission: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (cordova.platformId !== 'android') {
                resolve(permissionStatus.granted);

                return;
            }

            if (this.requestInProgress) {
                reject('A runtime permissions request is already in progress');
            }

            this.requestInProgress = true;

            cordova.exec(
                (statuses) => {
                    this.requestInProgress = false;
                    resolve(this.convertPermissionStatus(statuses[permission]));
                },
                (error) => {
                    this.requestInProgress = false;
                    reject(error);
                },
                'Diagnostic',
                'requestRuntimePermission',
                [permission],
            );
        });
    }

    /**
     * Convert a permission status so it has the same value in all platforms.
     * Each platform can return a different value for a status, e.g. a granted permission returns 'authorized' in iOS and
     * 'GRANTED' in Android. This function will convert the status so it uses the iOS value in all platforms, unless it's an
     * Android specific value.
     *
     * @param status Original status.
     * @returns Converted status.
     */
    protected convertPermissionStatus(status: string): string {
        for (const name in androidPermissionStatus) {
            const androidStatus = androidPermissionStatus[name as keyof typeof androidPermissionStatus];
            const iosStatus = iosPermissionStatus[name as keyof typeof iosPermissionStatus];

            if (status === androidStatus && iosStatus !== undefined) {
                // Always use the iOS status if the status exists both in Android and iOS.
                return iosStatus;
            }
        }

        return status;
    }

}

const permission = {
    acceptHandover: 'ACCEPT_HANDOVER',
    accessBackgroundLocation: 'ACCESS_BACKGROUND_LOCATION',
    accessCoarseLocation: 'ACCESS_COARSE_LOCATION',
    accessFineLocation: 'ACCESS_FINE_LOCATION',
    accessMediaLocation: 'ACCESS_MEDIA_LOCATION',
    bodySensors: 'BODY_SENSORS',
    bodySensorsBackground: 'BODY_SENSORS_BACKGROUND',
    getAccounts: 'GET_ACCOUNTS',
    readExternalStorage: 'READ_EXTERNAL_STORAGE',
    readMediaAudio: 'READ_MEDIA_AUDIO',
    readMediaImages: 'READ_MEDIA_IMAGES',
    readMediaVideo: 'READ_MEDIA_VIDEO',
    readPhoneState: 'READ_PHONE_STATE',
    readSms: 'READ_SMS',
    receiveMms: 'RECEIVE_MMS',
    receiveSms: 'RECEIVE_SMS',
    receiveWapPush: 'RECEIVE_WAP_PUSH',
    recordAudio: 'RECORD_AUDIO',
    sendSms: 'SEND_SMS',
    useSip: 'USE_SIP',
    uwbRanging: 'UWB_RANGING',
    writeExternalStorage: 'WRITE_EXTERNAL_STORAGE',
} as const;

const androidPermissionStatus = {
    //  Location permission requested and
    //      app build SDK/user device is Android >10 and user granted background location ("all the time") permission,
    //      or app build SDK/user device is Android 6-9 and user granted location permission,
    //  or non-location permission requested
    //      and app build SDK/user device is Android >=6 and user granted permission
    //  or app build SDK/user device is Android <6
    granted: 'GRANTED',
    //  Location permission requested
    //  and app build SDK/user device is Android >10
    //  and user granted background foreground location ("while-in-use") permission
    grantedWhenInUse: 'authorized_when_in_use',
    deniedOnce: 'DENIED_ONCE', // User denied access to this permission.
    deniedAlways: 'DENIED_ALWAYS', // User denied access to this permission and checked "Never Ask Again" box.
    notRequested: 'NOT_REQUESTED', // App has not yet requested access to this permission.
} as const;

const iosPermissionStatus = {
    notRequested: 'not_determined', // App has not yet requested this permission
    deniedAlways: 'denied_always', // User denied access to this permission
    restricted: 'restricted', // Permission is unavailable and user cannot enable it. For example, when parental controls are on.
    granted: 'authorized', //  User granted access to this permission.
    grantedWhenInUse: 'authorized_when_in_use', //  User granted access use location permission only when app is in use
    ephimeral: 'ephemeral', // The app is authorized to schedule or receive notifications for a limited amount of time.
    provisional: 'provisional', // The application is provisionally authorized to post non-interruptive user notifications.
    limited: 'limited', // The app has limited access to the Photo Library.
} as const;

const permissionStatus = {
    ...androidPermissionStatus,
    ...iosPermissionStatus,
} as const;
