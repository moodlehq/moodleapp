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

import { InjectionToken } from '@angular/core';
import { FileTransfer as CapacitorFileTransfer, type FileTransferPlugin } from '@capacitor/file-transfer';

/**
 * Capacitor FileTransfer error codes.
 */
export const enum FileTransferErrorCode {
    INVALID_PARAMETERS = 'OS-PLUG-FLTR-0004',
    INVALID_URL = 'OS-PLUG-FLTR-0005',
    PERMISSION_DENIED = 'OS-PLUG-FLTR-0006',
    FILE_NOT_FOUND = 'OS-PLUG-FLTR-0007',
    CONNECTION_FAILED = 'OS-PLUG-FLTR-0008',
    NOT_MODIFIED = 'OS-PLUG-FLTR-0009',
    HTTP_ERROR = 'OS-PLUG-FLTR-0010',
    UNKNOWN_ERROR = 'OS-PLUG-FLTR-0011',
}

/**
 * Resolve the native Capacitor FileTransfer implementation.
 *
 * @returns Native Capacitor FileTransfer plugin.
 */
export function resolveCapacitorFileTransfer(): FileTransferPlugin {
    return CapacitorFileTransfer;
}

/**
 * Injection token for the Capacitor FileTransfer instance.
 * This basically converts the Capacitor FileTransfer into an Angular injection token so we can provide a Mock if needed.
 */
export const CAPACITOR_FILE_TRANSFER = new InjectionToken<typeof CapacitorFileTransfer>('CAPACITOR_FILE_TRANSFER', {
    providedIn: 'root',
    factory: () => resolveCapacitorFileTransfer(),
});
