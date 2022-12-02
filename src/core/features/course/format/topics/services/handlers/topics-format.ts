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

import { CoreCourseFormatHandler } from '@features/course/services/format-delegate';
import { makeSingleton } from '@singletons';

/**
 * Handler to support topics course format.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseFormatTopicsHandlerService implements CoreCourseFormatHandler {

    name = 'CoreCourseFormatTopics';
    format = 'topics';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}

export const CoreCourseFormatTopicsHandler = makeSingleton(CoreCourseFormatTopicsHandlerService);
