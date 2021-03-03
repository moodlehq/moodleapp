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

import { Injectable, Type } from '@angular/core';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreTagAreaHandler } from '@features/tag/services/tag-area-delegate';
import { CoreUserTagAreaComponent } from '@features/user/components/tag-area/tag-area';
import { CoreTagFeedElement } from '@features/tag/services/tag-helper';
import { CoreUserBasicData } from '../user';
import { makeSingleton } from '@singletons';

/**
 * Handler to support tags.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserTagAreaHandlerService implements CoreTagAreaHandler {

    name = 'CoreUserTagAreaHandler';
    type = 'core/user';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Parses the rendered content of a tag index and returns the items.
     *
     * @param content Rendered content.
     * @return Area items (or promise resolved with the items).
     */
    parseContent(content: string): CoreUserTagFeedElement[] {
        const items: CoreUserTagFeedElement[] = [];
        const element = CoreDomUtils.convertToElement(content);

        Array.from(element.querySelectorAll('div.user-box')).forEach((userbox: HTMLElement) => {
            const avatarLink = userbox.querySelector('a:first-child');
            if (!avatarLink) {
                return;
            }

            const profileUrl = avatarLink.getAttribute('href') || '';
            const match = profileUrl.match(/.*\/user\/(?:profile|view)\.php\?id=(\d+)/);
            if (!match) {
                return;
            }

            const avatarImg = avatarLink.querySelector('img.userpicture');
            const avatarUrl = avatarImg ? avatarImg.getAttribute('src') : '';

            items.push({
                avatarUrl,
                heading: userbox.innerText,
                details: [],
                user: {
                    id: Number(match[1]),
                    profileimageurl: avatarUrl || '',
                    fullname: userbox.innerText,
                },
            });
        });

        return items;
    }

    /**
     * Get the component to use to display items.
     *
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<unknown> | Promise<Type<unknown>> {
        return CoreUserTagAreaComponent;
    }

}

export const CoreUserTagAreaHandler = makeSingleton(CoreUserTagAreaHandlerService);

export type CoreUserTagFeedElement = CoreTagFeedElement & {
    user: CoreUserBasicData;
};
