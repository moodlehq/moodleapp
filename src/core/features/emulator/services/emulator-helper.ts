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

import { CoreFile } from '@services/file';
import { File, makeSingleton } from '@singletons';
import { CoreLogger } from '@static/logger';
import { FileMock } from './file';
import { FileTransferErrorMock, FileTransferMock } from './file-transfer';

/**
 * Helper service for the emulator feature. It also acts as an init handler.
 */
@Injectable({ providedIn: 'root' })
export class CoreEmulatorHelperProvider {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreEmulatorHelper');
    }

    /**
     * Load the Mocks that need it.
     *
     * @returns Promise resolved when loaded.
     */
    async load(): Promise<void> {
        window.FileTransferError = FileTransferErrorMock;
        window.FileTransfer = FileTransferMock;

        const fileService = File.instance;

        if (fileService instanceof FileMock) {
            const basePath = await fileService.load();

            CoreFile.setHTMLBasePath(basePath);
        }
    }

}

export const CoreEmulatorHelper = makeSingleton(CoreEmulatorHelperProvider);
