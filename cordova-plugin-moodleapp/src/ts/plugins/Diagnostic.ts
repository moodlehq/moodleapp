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
     * Opens settings page for this app.
     */
    switchToSettings(): Promise<void> {
        return new Promise<void>((resolve, reject) => cordova.exec(resolve, reject, 'Diagnostic', 'switchToSettings'));
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
    recordAudio: 'RECORD_AUDIO',
} as const;

const androidPermissionStatus = {
    granted: 'GRANTED', // User granted access to this permission.
    grantedWhenInUse: 'authorized_when_in_use', // User granted access to this permission only when app is in use.
    deniedOnce: 'DENIED_ONCE', // User denied access to this permission.
    deniedAlways: 'DENIED_ALWAYS', // User denied access to this permission and checked "Never Ask Again" box.
    notRequested: 'NOT_REQUESTED', // App has not yet requested access to this permission.
} as const;

const iosPermissionStatus = {
    notRequested: 'not_determined', // App has not yet requested this permission
    deniedAlways: 'denied_always', // User denied access to this permission
    restricted: 'restricted', // Permission is unavailable and user cannot enable it. For example, when parental controls are on.
    granted: 'authorized', //  User granted access to this permission.
    grantedWhenInUse: 'authorized_when_in_use', //  User granted access to this permission only when app is in use
    ephimeral: 'ephemeral', // The app is authorized to schedule or receive notifications for a limited amount of time.
    provisional: 'provisional', // The application is provisionally authorized to post non-interruptive user notifications.
    limited: 'limited', // The app has limited access to the Photo Library.
} as const;

const permissionStatus = {
    ...androidPermissionStatus,
    ...iosPermissionStatus,
} as const;
