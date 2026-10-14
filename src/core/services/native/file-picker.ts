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
import { makeSingleton } from '@singletons';
import { FilePicker as CapacitorFilePicker, PickedFile } from '@capawesome/capacitor-file-picker';

/**
 * Service wrapping the Native File Picker plugin.
 */
@Injectable({ providedIn: 'root' })
export class CoreNativeFilePickerService {

    /**
     * Pick a file using the native file picker.
     *
     * @param types The types of files to pick.
     * @param readData Whether to read the file data.
     * @returns The picked file or undefined if no file was picked.
     */
    async pickFile(types?: string[], readData = false): Promise<CorePickedFile | undefined> {
        try {
            const result = await CapacitorFilePicker.pickFiles({
                types,
                limit: 1,
                readData,
            });

            if (!result.files || result.files.length === 0) {
                return undefined;
            }

            return result.files[0];
        } catch (error) {
            if (error instanceof Error && /cancel?/i.test(error.message)) {
                return undefined;
            }

            throw error;
        }
    }

}
export const CoreNativeFilePicker = makeSingleton(CoreNativeFilePickerService);

export type CorePickedFile = PickedFile;
