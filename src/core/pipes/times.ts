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

/**
 * Pipe to generate an array of the length of the number passed.
 *
 * Example of use:
 * <div *ngFor="let i of (arrayLength | coreTimes)">This item will be repeated arrayLength times</div>
 *
 * This example will generate an array of numbers from 0 to arrayLength value. So the div will be repeated
 * arrayLength times.
 */
@Pipe({
    name: 'coreTimes',
})
export class CoreTimesPipe implements PipeTransform {

    /**
     * Takes a number and generates an array of the length of the number passed.
     *
     * @param arrayLength  Array length.
     * @returns Array of the length of the number passed.
     */
    transform(arrayLength: number): unknown[] {
        return Array.from({ length: arrayLength }, (_, i) => i);
    }

}
