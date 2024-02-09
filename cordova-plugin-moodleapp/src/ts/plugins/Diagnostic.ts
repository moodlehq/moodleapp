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
 * Checks whether device hardware features are enabled or available to the app, e.g. camera, GPS, wifi
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

    constructor() {
        this.permissionStatus = permissionStatus;
        this.permission = permission;
    }

    isLocationEnabled(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => cordova.exec(resolve, reject, 'Diagnostic', 'isLocationEnabled'));
    }

    switchToLocationSettings(): Promise<void> {
        return new Promise<void>((resolve, reject) => cordova.exec(resolve, reject, 'Diagnostic', 'switchToLocationSettings'));
    }

    switchToSettings(): Promise<void> {
        return new Promise<void>((resolve, reject) => cordova.exec(resolve, reject, 'Diagnostic', 'switchToSettings'));
    }

    getLocationAuthorizationStatus(): Promise<unknown> {
        return new Promise<unknown>((resolve, reject) =>
            cordova.exec(resolve, reject, 'Diagnostic', 'getLocationAuthorizationStatus'));
    }

    requestLocationAuthorization(): Promise<void> {
        return new Promise<void>((resolve, reject) => cordova.exec(resolve, reject, 'Diagnostic', 'requestLocationAuthorization'));
    }

    requestMicrophoneAuthorization(): Promise<string> {
        return new Promise<string>((resolve, reject) =>
            cordova.exec(resolve, reject, 'Diagnostic', 'requestMicrophoneAuthorization'));
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

const permissionStatus = {
    // Android only
    deniedOnce: 'DENIED_ONCE',

    // iOS only
    restricted: 'restricted',
    ephimeral: 'ephemeral',
    provisional: 'provisional',

    // Both iOS and Android
    granted: 'authorized' || 'GRANTED',
    grantedWhenInUse: 'authorized_when_in_use',
    notRequested: 'not_determined' || 'NOT_REQUESTED',
    deniedAlways: 'denied_always' || 'DENIED_ALWAYS',
} as const;
