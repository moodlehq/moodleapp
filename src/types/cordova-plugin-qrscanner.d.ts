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
 * Types for qr scanner plugin.
 *
 * @see https://github.com/moodlemobile/cordova-plugin-qrscanner
 */

type IQRScannerStatus = {
    authorized: boolean;
    denied: boolean;
    restricted: boolean;
    prepared: boolean;
    scanning: boolean;
    previewing: boolean;
    showing: boolean;
    lightEnabled: boolean;
    canOpenSettings: boolean;
    canEnableLight: boolean;
    canChangeCamera: boolean;
    currentCamera: number;
};

type IQRScannerError = {
    name: string;
    code: number;
    _message: string; // eslint-disable-line @typescript-eslint/naming-convention
};

interface Window {

    // eslint-disable-next-line @typescript-eslint/naming-convention
    QRScanner: {
        prepare(onDone?: (error: IQRScannerError, status: IQRScannerStatus) => void): void;
        destroy(onDone?: (status: IQRScannerStatus) => void): void;
        scan(onDone: (error: IQRScannerError, text: string) => void): void;
        cancelScan(onDone?: (status: IQRScannerStatus) => void): void;
        show(onDone?: (status: IQRScannerStatus) => void): void;
        hide(onDone?: (status: IQRScannerStatus) => void): void;
        pausePreview(onDone?: (status: IQRScannerStatus) => void): void;
        resumePreview(onDone?: (status: IQRScannerStatus) => void): void;
        enableLight(onDone?: (error: IQRScannerError, status: IQRScannerStatus) => void): void;
        disableLight(onDone?: (error: IQRScannerError, status: IQRScannerStatus) => void): void;
        useCamera(camera: number, onDone?: (error: IQRScannerError, status: IQRScannerStatus) => void): void;
        useFrontCamera(onDone?: (error: IQRScannerError, status: IQRScannerStatus) => void): void;
        useBackCamera(onDone?: (error: IQRScannerError, status: IQRScannerStatus) => void): void;
        openSettings(onDone?: (error: IQRScannerError, status: IQRScannerStatus) => void): void;
        getStatus(onDone: (status: IQRScannerStatus) => void): void;
    };

}

declare module '@moodlehq/cordova-plugin-qrscanner' {
    export type QRScannerStatus = IQRScannerStatus;
    export type QRScannerError = IQRScannerError;
}
