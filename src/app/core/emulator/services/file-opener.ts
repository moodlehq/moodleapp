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
import { FileOpener } from '@ionic-native/file-opener/ngx';

/**
 * Emulates the FileOpener plugin in browser.
 */
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
@Injectable()
export class FileOpenerMock extends FileOpener {

    /**
     * Check if an app is already installed.
     *
     * @param packageId Package ID.
     * @return Promise resolved when done.
     */
    appIsInstalled(packageId: string): Promise<any> {
        return Promise.reject('appIsInstalled not supported in browser.');
    }

    /**
     * Open an file.
     *
     * @param filePath File path.
     * @param fileMIMEType File MIME type.
     * @return Promise resolved when done.
     */
    async open(filePath: string, fileMIMEType: string): Promise<any> {
        window.open(filePath, '_blank');
    }

    /**
     * Uninstalls a package.
     *
     * @param packageId Package ID.
     * @return Promise resolved when done.
     */
    uninstall(packageId: string): Promise<any> {
        return Promise.reject('uninstall not supported in browser.');
    }

}
