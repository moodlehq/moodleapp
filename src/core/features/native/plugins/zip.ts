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
import { CorePlatform } from '@services/platform';
import { CoreFileUtils } from '@static/file-utils';

/**
 * Zip plugin wrapper.
 *
 * @deprecated since 6.0. Use CoreFile.unzipFile directly instead.
 */
@Injectable({ providedIn: 'root' })
export class Zip {

    /**
     * Extracts files from a ZIP archive.
     *
     * @param source Source ZIP file.
     * @param destination Destination folder.
     * @param onProgress Callback to be called on progress update.
     * @returns 0 is success, -1 is error
     */
    async unzip(source: string, destination: string, onProgress?: (progress: ProgressEvent) => void): Promise<number> {
        try {
            if (CorePlatform.isMobile()) {
                source = source.startsWith('/') ? CoreFileUtils.convertToFileUrl(source) : source;
                destination = destination.startsWith('/') ? CoreFileUtils.convertToFileUrl(destination) : destination;
            }

            await CoreFile.unzipFile(source, destination, onProgress, false);

            return 0;
        } catch {
            return -1;
        }
    }

}
