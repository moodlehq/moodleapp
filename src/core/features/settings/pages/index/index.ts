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
import { CoreSettingsConstants, CoreSettingsSection } from '@features/settings/constants';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { ActivatedRouteSnapshot } from '@angular/router';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

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
        this.sections.setItems(CoreSettingsConstants.SECTIONS);
        this.sections.watchSplitViewOutlet(this.splitView);
        this.sections.start();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.sections.destroy();
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
    protected getSelectedItemPath(route: ActivatedRouteSnapshot): string | null {
        return route.parent?.routeConfig?.path ?? null;
    }

}
