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
/* eslint-disable no-restricted-imports */
import {
    Camera as CapacitorCamera,
    type CameraPlugin,
} from '@capacitor/camera';
import { FileOpener, type FileOpenerPlugin } from '@capacitor-community/file-opener';
import { FileTransfer as CapacitorFileTransfer, type FileTransferPlugin } from '@capacitor/file-transfer';
import { Filesystem, type FilesystemPlugin } from '@capacitor/filesystem';
import { CapacitorZip, type CapacitorZipPlugin } from '@capgo/capacitor-zip';
/* eslint-enable no-restricted-imports */

/**
 * Resolve the native Capacitor Camera implementation.
 *
 * @returns Native Capacitor Camera plugin.
 */
export function resolveCapacitorCamera(): CameraPlugin {
    return CapacitorCamera;
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
 * Resolve the native Capacitor FileTransfer implementation.
 *
 * @returns Native Capacitor FileTransfer plugin.
 */
export function resolveCapacitorFileTransfer(): FileTransferPlugin {
    return CapacitorFileTransfer;
}

/**
 * Resolve the native Capacitor File Opener implementation.
 *
 * @returns Native Capacitor File Opener plugin.
 */
export function resolveCapacitorFileOpener(): FileOpenerPlugin {
    return FileOpener;
}

/**
 * Resolve the native Capacitor Zip implementation.
 *
 * @returns Native Capacitor Zip plugin.
 */
export function resolveCapacitorZip(): CapacitorZipPlugin {
    return CapacitorZip;
}

/**
 * Injection token for the Capacitor Camera instance.
 * This basically converts the Capacitor Camera into an Angular injection token so we can provide a Mock if needed.
 */
export const CAPACITOR_CAMERA = new InjectionToken<typeof CapacitorCamera>('CAPACITOR_CAMERA', {
    providedIn: 'root',
    factory: () => resolveCapacitorCamera(),
});

/**
 * Injection token for the Capacitor Filesystem instance.
 * This basically converts the Capacitor Filesystem into an Angular injection token so we can provide a Mock if needed.
 */
export const CAPACITOR_FILESYSTEM = new InjectionToken<typeof Filesystem>('CAPACITOR_FILESYSTEM', {
    providedIn: 'root',
    factory: () => resolveCapacitorFilesystem(),
});

/**
 * Injection token for the Capacitor FileTransfer instance.
 * This basically converts the Capacitor FileTransfer into an Angular injection token so we can provide a Mock if needed.
 */
export const CAPACITOR_FILE_TRANSFER = new InjectionToken<typeof CapacitorFileTransfer>('CAPACITOR_FILE_TRANSFER', {
    providedIn: 'root',
    factory: () => resolveCapacitorFileTransfer(),
});

/**
 * Injection token for the Capacitor File Opener instance, allowing browser emulation.
 */
export const CAPACITOR_FILE_OPENER = new InjectionToken<FileOpenerPlugin>('CAPACITOR_FILE_OPENER', {
    providedIn: 'root',
    factory: () => resolveCapacitorFileOpener(),
});

/**
 * Injection token for the Capacitor Zip instance, allowing browser emulation.
 */
export const CAPACITOR_ZIP = new InjectionToken<CapacitorZipPlugin>('CAPACITOR_ZIP', {
    providedIn: 'root',
    factory: () => resolveCapacitorZip(),
});
