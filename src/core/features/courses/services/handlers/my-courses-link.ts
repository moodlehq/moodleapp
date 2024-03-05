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
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { makeSingleton } from '@singletons';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreNavigator } from '@services/navigator';
/**
 * Handler to treat links to my courses page.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesMyCoursesLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreCoursesMyCoursesLinkHandler';
    pattern = /\/my\/courses\.php/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: async (): Promise<void> => {
                await CoreNavigator.navigate(
                    '/main/courses/my',
                    {
                        params: {
                            sort: params.sort || undefined,
                            filter: params.filter || undefined,
                            search: params.search || undefined,
                            layout: params.layout || undefined,
                        },
                    },
                );
            },
        }];
    }

}

export const CoreCoursesMyCoursesLinkHandler = makeSingleton(CoreCoursesMyCoursesLinkHandlerService);
