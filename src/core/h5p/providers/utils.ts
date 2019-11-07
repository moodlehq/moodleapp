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

/**
 * Utils service with helper functions for H5P.
 */
@Injectable()
export class CoreH5PUtilsProvider {

    constructor() {
        // Nothing to do.
    }

    /**
     * The metadataSettings field in libraryJson uses 1 for true and 0 for false.
     * Here we are converting these to booleans, and also doing JSON encoding.
     *
     * @param metadataSettings Settings.
     * @return Stringified settings.
     */
    boolifyAndEncodeMetadataSettings(metadataSettings: any): string {
        // Convert metadataSettings values to boolean.
        if (typeof metadataSettings.disable != 'undefined') {
            metadataSettings.disable = metadataSettings.disable === 1;
        }
        if (typeof metadataSettings.disableExtraTitleField != 'undefined') {
            metadataSettings.disableExtraTitleField = metadataSettings.disableExtraTitleField === 1;
        }

        return JSON.stringify(metadataSettings);
    }

    /**
     * Convert list of library parameter values to csv.
     *
     * @param libraryData Library data as found in library.json files.
     * @param key Key that should be found in libraryData.
     * @param searchParam The library parameter (Default: 'path').
     * @return Library parameter values separated by ', '
     */
    libraryParameterValuesToCsv(libraryData: any, key: string, searchParam: string = 'path'): string {
        if (typeof libraryData[key] != 'undefined') {
            const parameterValues = [];

            libraryData[key].forEach((file) => {
                for (const index in file) {
                    if (index === searchParam) {
                        parameterValues.push(file[index]);
                    }
                }
            });

            return parameterValues.join(',');
        }

        return '';
    }
}
