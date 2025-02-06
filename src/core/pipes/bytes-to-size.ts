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

import { Pipe, PipeTransform } from '@angular/core';

import { CoreLogger } from '@singletons/logger';
import { CoreText } from '@singletons/text';

/**
 * Pipe to turn a number in bytes to a human readable size (e.g. 5,25 MB).
 */
@Pipe({
    name: 'coreBytesToSize',
    standalone: true,
})
export class CoreBytesToSizePipe implements PipeTransform {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreBytesToSizePipe');
    }

    /**
     * Takes a number and turns it to a human readable size.
     *
     * @param value The bytes to convert.
     * @returns Readable bytes.
     */
    transform(value: number | string): string {
        if (typeof value == 'string') {
            // Convert the value to a number.
            const numberValue = parseInt(value, 10);
            if (isNaN(numberValue)) {
                this.logger.error('Invalid value received', value);

                return value;
            }
            value = numberValue;
        }

        return CoreText.bytesToSize(value);
    }

}
