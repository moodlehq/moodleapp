// (C) Copyright 2015 Martin Dougiamas
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
import { CoreFileProvider } from '../../../providers/file';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { File } from '@ionic-native/file';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { CoreInitDelegate, CoreInitHandler } from '../../../providers/init';
import { FileTransferErrorMock } from './file-transfer';

/**
 * Emulates the Cordova Zip plugin in desktop apps and in browser.
 */
@Injectable()
export class CoreEmulatorHelperProvider implements CoreInitHandler {
    name = 'CoreEmulator';
    priority = CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 500;
    blocking = true;

    constructor(private file: File, private fileProvider: CoreFileProvider, private utils: CoreUtilsProvider,
            initDelegate: CoreInitDelegate, private localNotif: LocalNotifications) {}

    /**
     * Load the Mocks that need it.
     *
     * @return {Promise<void>} Promise resolved when loaded.
     */
    load() : Promise<void> {
        let promises = [];

        promises.push((<any>this.file).load().then((basePath: string) => {
            this.fileProvider.setHTMLBasePath(basePath);
        }));
        promises.push((<any>this.localNotif).load());

        (<any>window).FileTransferError = FileTransferErrorMock;

        return this.utils.allPromises(promises);
    }
}
