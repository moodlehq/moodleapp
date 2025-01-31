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

import { Component, OnInit } from '@angular/core';

import { CoreFileUtils } from '@singletons/file-utils';
import { CoreNavigator } from '@services/navigator';
import { Translate } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreSharedFilesListComponent } from '../../components/list/list';

/**
 * Page to display the list of shared files.
 */
@Component({
    selector: 'page-core-shared-files-list',
    templateUrl: 'list.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreSharedFilesListComponent,
    ],
})
export class CoreSharedFilesListPage implements OnInit {

    siteId?: string;
    mimetypes?: string[];
    manage = false;
    showSitePicker = false;
    path = '';
    title?: string;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.siteId = CoreNavigator.getRouteParam('siteId');
        this.mimetypes = CoreNavigator.getRouteParam('mimetypes');
        this.manage = !!CoreNavigator.getRouteBooleanParam('manage');
        this.path = CoreNavigator.getRouteParam('path') || '';
        this.showSitePicker = !CoreNavigator.getRouteParam('hideSitePicker');

        this.calculateTitle(this.path);
    }

    /**
     * Calculate the title.
     *
     * @param path Path to use.
     */
    calculateTitle(path?: string): void {
        if (path) {
            this.title = CoreFileUtils.getFileAndDirectoryFromPath(path).name;
        } else {
            this.title = Translate.instant('core.sharedfiles.sharedfiles');
        }
    }

}
