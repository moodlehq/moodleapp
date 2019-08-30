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
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreBlockDelegate } from '@core/block/providers/delegate';

/**
 * Service that provides helper functions for blocks.
 */
@Injectable()
export class CoreBlockHelperProvider {

    constructor(protected courseProvider: CoreCourseProvider, protected blockDelegate: CoreBlockDelegate) {}

    /**
     * Return if it get course blocks options is enabled for the current site.
     *
     * @return {boolean} true if enabled, false otherwise.
     */
    canGetCourseBlocks(): boolean {
        return this.courseProvider.canGetCourseBlocks() && !this.blockDelegate.areBlocksDisabledInCourses();
    }

    /**
     * Returns the list of blocks for the selected course.
     *
     * @param  {number}       courseId Course ID.
     * @return {Promise<any>}          List of supported blocks.
     */
    getCourseBlocks(courseId: number): Promise<any> {
        const canGetBlocks = this.canGetCourseBlocks();

        if (!canGetBlocks) {
            return Promise.resolve([]);
        }

        return this.courseProvider.getCourseBlocks(courseId).then((blocks) => {
            const hasSupportedBlock = this.blockDelegate.hasSupportedBlock(blocks);

            if (!hasSupportedBlock) {
                return [];
            }

            return blocks;
        });
    }
}
