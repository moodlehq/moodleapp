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
import { FileOpener } from '@ionic-native/file-opener';
import { CoreAppProvider } from '@providers/app';

/**
 * Emulates the FileOpener plugin in desktop apps and in browser.
 */
@Injectable()
export class FileOpenerMock extends FileOpener {

    constructor(private appProvider: CoreAppProvider) {
        super();
    }

    /**
     * Check if an app is already installed.
     *
     * @param packageId Package ID.
     * @return Promise resolved when done.
     */
    appIsInstalled(packageId: string): Promise<any> {
        return Promise.reject('appIsInstalled not supported in browser or dekstop.');
    }

    /**
     * Open an file.
     *
     * @param filePath File path.
     * @param fileMIMEType File MIME type.
     * @return Promise resolved when done.
     */
    open(filePath: string, fileMIMEType: string): Promise<any> {
        if (this.appProvider.isDesktop()) {
            // It's a desktop app, send an event so the file is opened.
            // Opening the file from here (renderer process) doesn't focus the opened app, that's why an event is needed.
            // Use sendSync so we can receive the result.
            if (!require('electron').ipcRenderer.sendSync('openItem', filePath)) {
                return Promise.reject('Error opening file');
            }
        } else {
            window.open(filePath, '_blank');
        }

        return Promise.resolve();
    }

    /**
     * Uninstalls a package.
     *
     * @param packageId Package ID.
     * @return Promise resolved when done.
     */
    uninstall(packageId: string): Promise<any> {
        return Promise.reject('uninstall not supported in browser or dekstop.');
    }
}
