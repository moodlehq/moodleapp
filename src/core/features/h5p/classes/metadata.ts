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

import { CoreH5PLibraryMetadataSettings } from './validator';

/**
 * Equivalent to H5P's H5PMetadata class.
 */
export class CoreH5PMetadata {

    /**
     * The metadataSettings field in libraryJson uses 1 for true and 0 for false.
     * Here we are converting these to booleans, and also doing JSON encoding.
     *
     * @param metadataSettings Settings.
     * @returns Stringified settings.
     */
    static boolifyAndEncodeSettings(metadataSettings: CoreH5PLibraryMetadataSettings | string): string {
        if (typeof metadataSettings == 'string') {
            return metadataSettings;
        }

        // Convert metadataSettings values to boolean.
        if (metadataSettings.disable !== undefined) {
            metadataSettings.disable = metadataSettings.disable === 1;
        }
        if (metadataSettings.disableExtraTitleField !== undefined) {
            metadataSettings.disableExtraTitleField = metadataSettings.disableExtraTitleField === 1;
        }

        return JSON.stringify(metadataSettings);
    }

}
