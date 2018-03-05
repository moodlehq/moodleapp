// (C) Copyright 2015 Martin Dougiamas
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

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, Optional } from '@angular/core';
import { NavParams, NavController, Content } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreCourseModuleMainComponent } from '@core/course/providers/module-delegate';
import { AddonModFolderProvider } from '../../providers/folder';
import { AddonModFolderHelperProvider } from '../../providers/helper';

/**
 * Component that displays a folder.
 * @todo Adding a new file in a folder updates the revision of all the files, so they're all shown as outdated.
 *       To ignore revision in folders we'll have to modify $mmCoursePrefetchDelegate, core-file and $mmFilepool.
 */
@Component({
    selector: 'addon-mod-folder-index',
    templateUrl: 'index.html',
})
export class AddonModFolderIndexComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {
    @Input() module: any; // The module of the folder.
    @Input() courseId: number; // Course ID the folder belongs to.
    @Input() path: string; // For subfolders. Use the path instead of a boolean so Angular detects them as different states.
    @Output() folderRetrieved?: EventEmitter<any>;

    loaded: boolean;
    canReload: boolean;
    component = AddonModFolderProvider.COMPONENT;
    componentId: number;
    canGetFolder: boolean;
    contents: any;

    // Data for context menu.
    externalUrl: string;
    description: string;
    refreshIcon: string;
    prefetchStatusIcon: string;
    prefetchText: string;
    size: string;

    protected isDestroyed;
    protected statusObserver;

    constructor(private folderProvider: AddonModFolderProvider, private courseProvider: CoreCourseProvider,
            private domUtils: CoreDomUtilsProvider, private appProvider: CoreAppProvider, private textUtils: CoreTextUtilsProvider,
            private courseHelper: CoreCourseHelperProvider, private translate: TranslateService,
            @Optional() private content: Content, private folderHelper: AddonModFolderHelperProvider) {
        this.folderRetrieved = new EventEmitter();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.description = this.module.description;
        this.componentId = this.module.id;
        this.externalUrl = this.module.url;
        this.loaded = false;
        this.canReload = false;
        this.refreshIcon = 'spinner';

        this.canGetFolder = this.folderProvider.isGetFolderWSAvailable();

        if (this.path) {
            // Subfolder. Use module param.
            this.showModuleData(this.module);
            this.loaded = true;
            this.canReload = false;
            this.refreshIcon = 'refresh';
        } else {
            this.fetchContent().then(() => {
                this.folderProvider.logView(this.module.instance).then(() => {
                    this.courseProvider.checkModuleCompletion(this.courseId, this.module.completionstatus);
                });
            }).finally(() => {
                this.loaded = true;
                this.canReload = true;
                this.refreshIcon = 'refresh';
            });
        }
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @param {Function} [done] Function to call when done.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void): Promise<any> {
        if (this.canReload) {
            this.refreshIcon = 'spinner';

            return this.folderProvider.invalidateContent(this.module.id, this.courseId).catch(() => {
                // Ignore errors.
            }).then(() => {
                return this.fetchContent(true);
            }).finally(() => {
                this.refreshIcon = 'refresh';
                refresher && refresher.complete();
                done && done();
            });
        }
    }

    /**
     * Expand the description.
     */
    expandDescription(): void {
        this.textUtils.expandText(this.translate.instant('core.description'), this.description, this.component, this.module.id);
    }

    /**
     * Prefetch the module.
     */
    prefetch(): void {
        this.courseHelper.contextMenuPrefetch(this, this.module, this.courseId);
    }

    /**
     * Confirm and remove downloaded files.
     */
    removeFiles(): void {
        this.courseHelper.confirmAndRemoveFiles(this.module, this.courseId);
    }

    /**
     * Convenience function to set scope data using module.
     * @param {any} module Module to show.
     */
    protected showModuleData(module: any): void {
        this.description = module.intro || module.description;

        this.folderRetrieved.emit(module);

        if (this.path) {
            // Subfolder.
            this.contents = module.contents;
        } else {
            this.contents = this.folderHelper.formatContents(module.contents);
        }
    }

    /**
     * Download folder contents.
     *
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        let promise;

        if (this.canGetFolder) {
            promise = this.folderProvider.getFolder(this.courseId, this.module.id).then((folder) => {
                return this.courseProvider.loadModuleContents(this.module, this.courseId).then(() => {
                    folder.contents = this.module.contents;

                    return folder;
                });
            });
        } else {
            promise = this.courseProvider.getModule(this.module.id, this.courseId).then((folder) => {
                if (!folder.contents.length && this.module.contents.length && !this.appProvider.isOnline()) {
                    // The contents might be empty due to a cached data. Use the old ones.
                    folder.contents = this.module.contents;
                }
                this.module = folder;

                return folder;
            });
        }

        return promise.then((folder) => {
            if (folder) {
                this.description = folder.intro || folder.description;
                this.folderRetrieved.emit(folder);
            }

            this.showModuleData(folder);

            // All data obtained, now fill the context menu.
            this.courseHelper.fillContextMenu(this, this.module, this.courseId, refresh, this.component);
        }).catch((error) => {
            // Error getting data, fail.
            this.domUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        }).finally(() => {
            this.loaded = true;
            this.refreshIcon = 'refresh';
        });
    }

    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.statusObserver && this.statusObserver.off();
    }
}
