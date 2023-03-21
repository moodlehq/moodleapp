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

import { CoreConstants } from '@/core/constants';
import { Params } from '@angular/router';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import { SHAREDFILES_PAGE_NAME } from '@features/sharedfiles/sharedfiles.module';
import { CorePlatform } from '@services/platform';

/**
 * Provides a collection of setting sections.
 */
export class CoreSettingsSectionsSource extends CoreRoutedItemsManagerSource<CoreSettingsSection> {

    /**
     * @inheritdoc
     */
    protected async loadPageItems(): Promise<{ items: CoreSettingsSection[] }> {
        const sections: CoreSettingsSection[] = [
            {
                name: 'core.settings.general',
                path: 'general',
                icon: 'fas-wrench',
            },
            {
                name: 'core.settings.spaceusage',
                path: 'spaceusage',
                icon: 'fas-list-check',
            },
            {
                name: 'core.settings.synchronization',
                path: 'sync',
                icon: CoreConstants.ICON_SYNC,
            },
        ];

        if (CorePlatform.isIOS()) {
            sections.push({
                name: 'core.sharedfiles.sharedfiles',
                path: SHAREDFILES_PAGE_NAME + '/list/root',
                icon: 'fas-folder',
                params: { manage: true },
            });
        }

        sections.push({
            name: 'core.settings.about',
            path: 'about',
            icon: 'fas-id-card',
        });

        return { items: sections };
    }

    /**
     * @inheritdoc
     */
    getItemPath(section: CoreSettingsSection): string {
        return section.path;
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(section: CoreSettingsSection): Params {
        return section.params || {};
    }

}

/**
 * Settings section.
 */
export type CoreSettingsSection = {
    name: string;
    path: string;
    icon: string;
    params?: Params;
};
