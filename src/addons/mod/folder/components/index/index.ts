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

import { Component, Input, OnInit, Optional } from '@angular/core';
import { Params } from '@angular/router';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { Md5 } from 'ts-md5';
import { AddonModFolder, AddonModFolderFolder } from '../../services/folder';
import { AddonModFolderFolderFormattedData, AddonModFolderHelper } from '../../services/folder-helper';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { ADDON_MOD_FOLDER_COMPONENT, ADDON_MOD_FOLDER_PAGE_NAME } from '../../constants';

/**
 * Component that displays a folder.
 *
 * @todo Adding a new file in a folder updates the revision of all the files, so they're all shown as outdated.
 *       To ignore revision in folders we'll have to modify CoreCourseModulePrefetchDelegate, core-file and CoreFilepoolProvider.
 */
@Component({
    selector: 'addon-mod-folder-index',
    templateUrl: 'addon-mod-folder-index.html',
})
export class AddonModFolderIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    @Input() folderInstance?: AddonModFolderFolder; // The mod_folder instance.
    @Input() subfolder?: AddonModFolderFolderFormattedData; // Subfolder to show.

    component = ADDON_MOD_FOLDER_COMPONENT;
    pluginName = 'folder';
    contents?: AddonModFolderFolderFormattedData;

    constructor(@Optional() courseContentsPage?: CoreCourseContentsPage) {
        super('AddonModFolderIndexComponent', courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        if (this.subfolder) {
            this.description = this.folderInstance ? this.folderInstance.intro : this.module.description;
            this.contents = this.subfolder;
            this.sortFilesAndFolders();

            this.showLoading = false;

            return;
        }

        try {
            await this.loadContent();
        } finally {
            this.showLoading = false;
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        await AddonModFolder.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh = false): Promise<void> {
        this.folderInstance = await AddonModFolder.getFolder(this.courseId, this.module.id);

        const contents = await CoreCourse.getModuleContents(this.module, undefined, undefined, false, refresh);

        this.dataRetrieved.emit(this.folderInstance || this.module);

        this.description = this.folderInstance ? this.folderInstance.intro : this.module.description;
        this.contents = AddonModFolderHelper.formatContents(contents);
        this.sortFilesAndFolders();
    }

    /**
     * Sort files and folders alphabetically.
     */
    protected sortFilesAndFolders(): void {
        if (!this.contents) {
            return;
        }

        this.contents.folders.sort((a, b) => {
            const compareA = a.filename.toLowerCase();
            const compareB = b.filename.toLowerCase();

            return compareA.localeCompare(compareB);
        });

        this.contents.files.sort((a, b) => {
            const compareA = a.filename.toLowerCase();
            const compareB = b.filename.toLowerCase();

            return compareA.localeCompare(compareB);
        });
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(AddonModFolder.logView(this.module.instance));

        this.analyticsLogEvent('mod_folder_view_folder');
    }

    /**
     * Navigate to a subfolder.
     *
     * @param folder Folder data.
     */
    openFolder(folder: AddonModFolderFolderFormattedData): void {
        const params: Params = {
            module: this.module,
            folderInstance: this.folderInstance,
            subfolder: folder,
        };

        const hash = Md5.hashAsciiStr(folder.filepath);

        CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_FOLDER_PAGE_NAME}/${this.courseId}/${this.module.id}/${hash}`,
            { params },
        );
    }

}
