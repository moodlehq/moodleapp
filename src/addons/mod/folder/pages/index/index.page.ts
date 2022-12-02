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

import { Component, OnInit, ViewChild } from '@angular/core';
import { CoreCourseModuleMainActivityPage } from '@features/course/classes/main-activity-page';
import { CoreNavigator } from '@services/navigator';
import { AddonModFolderIndexComponent } from '../../components/index';
import { AddonModFolderFolder } from '../../services/folder';
import { AddonModFolderFolderFormattedData } from '../../services/folder-helper';

/**
 * Page that displays a folder.
 */
@Component({
    selector: 'page-addon-mod-folder-index',
    templateUrl: 'index.html',
})
export class AddonModFolderIndexPage extends CoreCourseModuleMainActivityPage<AddonModFolderIndexComponent> implements OnInit {

    @ViewChild(AddonModFolderIndexComponent) activityComponent?: AddonModFolderIndexComponent;

    folderInstance?: AddonModFolderFolder;
    subfolder?: AddonModFolderFolderFormattedData;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        super.ngOnInit();
        this.folderInstance = CoreNavigator.getRouteParam<AddonModFolderFolder>('folderInstance');
        this.subfolder = CoreNavigator.getRouteParam<AddonModFolderFolderFormattedData>('subfolder');

        this.title = this.subfolder?.filename || this.module.name;
    }

}
