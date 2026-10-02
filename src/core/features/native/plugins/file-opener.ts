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

import { Injectable } from '@angular/core';
import { CoreOpener, OpenFileAction } from '@static/opener';

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Compatibility wrapper for the Cordova File Opener API.
 *
 * @deprecated since 6.0. Use CoreOpener.openFile() instead.
 */
@Injectable({ providedIn: 'root' })
export class FileOpener {

    /**
     * Open a file with its default application.
     *
     * @param filePath File path.
     * @returns Promise resolved when the file is opened.
     * @deprecated since 6.0. Use CoreOpener.openFile() instead.
     */
    open(filePath: string): Promise<any> {
         return CoreOpener.openFile(filePath, { iOSOpenFileAction: OpenFileAction.OPEN });
    }

    /**
     * Open a file, retaining the old system-dialog method name.
     *
     * @param filePath File path.
     * @returns Promise resolved when the file is opened.
     * @deprecated since 6.0. Use CoreOpener.openFile() instead.
     */
    showOpenWithDialog(filePath: string): Promise<any> {
        return CoreOpener.openFile(filePath, { iOSOpenFileAction: OpenFileAction.OPEN_WITH });
    }

    /**
     * Check whether an application is installed.
     *
     * @param packageId Application package ID.
     * @returns Rejected promise because File Viewer does not support app discovery.
     * @deprecated since 6.0. No replacement is available.
     */
    appIsInstalled(packageId: string): Promise<any> {
        return Promise.reject(new Error(`Checking whether app "${packageId}" is installed is not supported.`));
    }

    /**
     * Uninstall an application.
     *
     * @param packageId Application package ID.
     * @returns Rejected promise because File Viewer does not support app management.
     * @deprecated since 6.0. No replacement is available.
     */
    uninstall(packageId: string): Promise<any> {
        return Promise.reject(new Error(`Uninstalling app "${packageId}" is not supported.`));
    }

}
