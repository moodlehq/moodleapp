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
import { CoreCourse, CoreCourseBlock } from '@features/course/services/course';
import { CoreBlockDelegate } from './block-delegate';
import { makeSingleton } from '@singletons';

/**
 * Service that provides helper functions for blocks.
 */
@Injectable({ providedIn: 'root' })
export class CoreBlockHelperProvider {

    /**
     * Return if it get course blocks options is enabled for the current site.
     *
     * @return true if enabled, false otherwise.
     */
    canGetCourseBlocks(): boolean {
        return CoreCourse.canGetCourseBlocks() && !CoreBlockDelegate.areBlocksDisabledInCourses();
    }

    /**
     * Returns the list of blocks for the selected course.
     *
     * @param courseId Course ID.
     * @return List of supported blocks.
     */
    async getCourseBlocks(courseId: number): Promise<CoreCourseBlock[]> {
        const canGetBlocks = this.canGetCourseBlocks();

        if (!canGetBlocks) {
            return [];
        }

        const blocks = await CoreCourse.getCourseBlocks(courseId);
        const hasSupportedBlock = CoreBlockDelegate.hasSupportedBlock(blocks);
        if (!hasSupportedBlock) {
            return [];
        }

        return blocks;
    }

}

export const CoreBlockHelper = makeSingleton(CoreBlockHelperProvider);
