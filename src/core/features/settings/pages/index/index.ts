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

import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { Params } from '@angular/router';

import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreConstants } from '@/core/constants';
import { SHAREDFILES_PAGE_NAME } from '@features/sharedfiles/sharedfiles.module';
import { CoreApp } from '@services/app';

@Component({
    selector: 'page-core-settings-index',
    templateUrl: 'index.html',
})
export class CoreSettingsIndexPage implements AfterViewInit, OnDestroy {

    sections: CoreSettingsSectionsManager = new CoreSettingsSectionsManager(CoreSettingsIndexPage);

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        this.sections.setItems(this.getSections());
        this.sections.start(this.splitView);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.sections.destroy();
    }

    /**
     * Get the sections.
     *
     * @returns Sections.
     */
    protected getSections(): CoreSettingsSection[] {
        const sections: CoreSettingsSection[] = [
            {
                name: 'core.settings.general',
                path: 'general',
                icon: 'fas-wrench',
            },
            {
                name: 'core.settings.spaceusage',
                path: 'spaceusage',
                icon: 'fas-tasks',
            },
            {
                name: 'core.settings.synchronization',
                path: 'sync',
                icon: CoreConstants.ICON_SYNC,
            },
        ];

        if (CoreApp.isIOS()) {
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

        return sections;
    }

}

/**
 * Helper class to manage sections.
 */
class CoreSettingsSectionsManager extends CorePageItemsListManager<CoreSettingsSection> {

    /**
     * @inheritdoc
     */
    protected getItemPath(section: CoreSettingsSection): string {
        return section.path;
    }

    /**
     * @inheritdoc
     */
    protected getItemQueryParams(section: CoreSettingsSection): Params {
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
