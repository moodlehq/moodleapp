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
// eslint-disable-next-line no-restricted-imports
import { Filesystem, type FilesystemPlugin } from '@capacitor/filesystem';

/**
 * Capacitor Filesystem error codes.
 */
export const enum FilesystemErrorCode {
    BRIDGE_NOT_INITIALIZED = 'OS-PLUG-FILE-0004',
    INVALID_PARAMETERS = 'OS-PLUG-FILE-0005',
    INVALID_PATH = 'OS-PLUG-FILE-0006',
    PERMISSION_DENIED = 'OS-PLUG-FILE-0007',
    FILE_NOT_FOUND = 'OS-PLUG-FILE-0008',
    OPERATION_NOT_SUPPORTED = 'OS-PLUG-FILE-0009',
    DIRECTORY_ALREADY_EXISTS = 'OS-PLUG-FILE-0010',
    MISSING_PARENT_DIRECTORY = 'OS-PLUG-FILE-0011',
    DIRECTORY_NOT_EMPTY = 'OS-PLUG-FILE-0012',
    UNKNOWN_ERROR = 'OS-PLUG-FILE-0013',
}

/**
 * Resolve the native Capacitor Filesystem implementation.
 *
 * @returns Native Capacitor Filesystem plugin.
 */
export function resolveCapacitorFilesystem(): FilesystemPlugin {
    return Filesystem;
}

/**
 * Injection token for the Capacitor Filesystem instance.
 * This basically converts the Capacitor Filesystem into an Angular injection token so we can provide a Mock if needed.
 */
export const CAPACITOR_FILESYSTEM = new InjectionToken<typeof Filesystem>('CAPACITOR_FILESYSTEM', {
    providedIn: 'root',
    factory: () => resolveCapacitorFilesystem(),
});
