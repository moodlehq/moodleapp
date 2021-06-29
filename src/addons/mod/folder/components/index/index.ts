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
import { Component, Input, OnInit, Optional } from '@angular/core';
import { Params } from '@angular/router';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse } from '@features/course/services/course';
import { CoreApp } from '@services/app';
import { CoreNavigator } from '@services/navigator';
import { Md5 } from 'ts-md5';
import { AddonModFolder, AddonModFolderFolder, AddonModFolderProvider } from '../../services/folder';
import { AddonModFolderFolderFormattedData, AddonModFolderHelper } from '../../services/folder-helper';
import { AddonModFolderModuleHandlerService } from '../../services/handlers/module';

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

    component = AddonModFolderProvider.COMPONENT;
    canGetFolder = false;
    contents?: AddonModFolderFolderFormattedData;

    constructor(@Optional() courseContentsPage?: CoreCourseContentsPage) {
        super('AddonModFolderIndexComponent', courseContentsPage);
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.canGetFolder = AddonModFolder.isGetFolderWSAvailable();

        if (this.subfolder) {
            this.description = this.folderInstance ? this.folderInstance.intro : this.module.description;
            this.contents = this.subfolder;

            this.loaded = true;
            this.refreshIcon = CoreConstants.ICON_REFRESH;

            return;
        }

        try {
            await this.loadContent();

            try {
                await AddonModFolder.logView(this.module.instance!, this.module.name);
                CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
            } catch {
                // Ignore errors.
            }
        } finally {
            this.loaded = true;
            this.refreshIcon = CoreConstants.ICON_REFRESH;
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        await AddonModFolder.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download folder contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async fetchContent(refresh = false): Promise<void> {
        try {
            if (this.canGetFolder) {
                this.folderInstance = await AddonModFolder.getFolder(this.courseId, this.module.id);
                await CoreCourse.loadModuleContents(this.module, this.courseId, undefined, false, refresh);
            } else {
                const module = await CoreCourse.getModule(this.module.id, this.courseId);

                if (!module.contents.length && this.module.contents.length && !CoreApp.isOnline()) {
                    // The contents might be empty due to a cached data. Use the old ones.
                    module.contents = this.module.contents;
                }
                this.module = module;
            }

            this.dataRetrieved.emit(this.folderInstance || this.module);

            this.description = this.folderInstance ? this.folderInstance.intro : this.module.description;
            this.contents = AddonModFolderHelper.formatContents(this.module.contents);
        } finally {
            this.fillContextMenu(refresh);
        }
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

        const hash = <string> Md5.hashAsciiStr(folder.filepath);

        CoreNavigator.navigateToSitePath(
            `${AddonModFolderModuleHandlerService.PAGE_NAME}/${this.courseId}/${this.module.id}/${hash}`,
            { params },
        );
    }

}
