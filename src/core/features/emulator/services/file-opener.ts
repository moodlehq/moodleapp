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

import { FileOpenerOptions, FileOpenerPlugin } from '@capacitor-community/file-opener';
import { CoreFile } from '@services/file';

/**
 * Emulates the Capacitor File Opener in browser.
 */
export class FileOpenerMock implements FileOpenerPlugin {

    /**
     * @inheritdoc
     */
    async open(options: FileOpenerOptions): Promise<void> {
        const filePath = options.filePath;
        if (!filePath.match(/^filesystem:/)) {
            window.open(filePath, '_blank');

            return;
        }

        try {
            const fileEntry = await CoreFile.getFile(filePath);
            const file = await CoreFile.getFileObjectFromFileEntry(fileEntry);

            window.open(URL.createObjectURL(file), '_blank');
        } catch {
            window.open(filePath, '_blank');
        }
    }

}
