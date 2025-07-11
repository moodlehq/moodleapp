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

import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreSettingsSection, CoreSettingsSectionsSource } from '@features/settings/classes/settings-sections-source';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSharedModule } from '@/core/shared.module';

@Component({
    selector: 'page-core-settings-index',
    templateUrl: 'index.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreSettingsIndexPage implements AfterViewInit, OnDestroy {

    sections: CoreListItemsManager<CoreSettingsSection>;

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    constructor() {
        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreSettingsSectionsSource, []);

        this.sections = new CoreListItemsManager(source, CoreSettingsIndexPage);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.sections.load();
        await this.sections.start(this.splitView);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.sections.destroy();
    }

}
