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
import { CoreTagAreaHandler } from '@features/tag/services/tag-area-delegate';
import { CoreTagFeedElement, CoreTagHelper } from '@features/tag/services/tag-helper';
import { makeSingleton } from '@singletons';

/**
 * Handler to support tags.
 */
@Injectable({ providedIn: 'root' })
export class AddonModGlossaryTagAreaHandlerService implements CoreTagAreaHandler {

    name = 'AddonModGlossaryTagAreaHandler';
    type = 'mod_glossary/glossary_entries';

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    parseContent(content: string): CoreTagFeedElement[] {
        return CoreTagHelper.parseFeedContent(content);
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { CoreTagFeedComponent } = await import('@features/tag/components/feed/feed');

        return CoreTagFeedComponent;
    }

}

export const AddonModGlossaryTagAreaHandler = makeSingleton(AddonModGlossaryTagAreaHandlerService);
