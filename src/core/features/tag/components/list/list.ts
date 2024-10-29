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

import { Component, Input } from '@angular/core';
import { CoreTagItem } from '@features/tag/services/tag';
import { Params } from '@angular/router';
import { CoreNavigator } from '@services/navigator';

/**
 * Component that displays the list of tags of an item.
 */
@Component({
    selector: 'core-tag-list',
    templateUrl: 'core-tag-list.html',
    styleUrl: 'list.scss',
})
export class CoreTagListComponent {

    @Input() tags: CoreTagItem[] = [];

    /**
     * Go to tag index page.
     */
    openTag(tag: CoreTagItem): void {
        const params: Params = {
            tagId: tag.id,
            tagName: tag.rawname,
            collectionId: tag.tagcollid,
            fromContextId: tag.taginstancecontextid,
        };

        CoreNavigator.navigateToSitePath('/tag/index', { params });
    }

}
