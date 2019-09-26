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
import { CoreFileSessionProvider } from '@providers/file-session';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { AddonModAssignProvider } from '../../../providers/assign';
import { AddonModAssignHelperProvider } from '../../../providers/helper';
import { AddonModAssignOfflineProvider } from '../../../providers/assign-offline';
import { AddonModAssignSubmissionFileHandler } from '../providers/handler';
import { AddonModAssignSubmissionPluginComponent } from '../../../classes/submission-plugin-component';

/**
 * Component to render a file submission plugin.
 */
@Component({
    selector: 'addon-mod-assign-submission-file',
    templateUrl: 'addon-mod-assign-submission-file.html'
})
export class AddonModAssignSubmissionFileComponent extends AddonModAssignSubmissionPluginComponent implements OnInit {

    component = AddonModAssignProvider.COMPONENT;
    files: any[];

    constructor(protected fileSessionprovider: CoreFileSessionProvider, protected assignProvider: AddonModAssignProvider,
            protected assignOfflineProvider: AddonModAssignOfflineProvider, protected assignHelper: AddonModAssignHelperProvider,
            protected fileUploaderProvider: CoreFileUploaderProvider) {
        super();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Get the offline data.
        this.assignOfflineProvider.getSubmission(this.assign.id).catch(() => {
            // Error getting data, assume there's no offline submission.
        }).then((offlineData) => {
            if (offlineData && offlineData.plugindata && offlineData.plugindata.files_filemanager) {
                // It has offline data.
                let promise;
                if (offlineData.plugindata.files_filemanager.offline) {
                    promise = this.assignHelper.getStoredSubmissionFiles(this.assign.id,
                            AddonModAssignSubmissionFileHandler.FOLDER_NAME);
                } else {
                    promise = Promise.resolve([]);
                }

                return promise.then((offlineFiles) => {
                    const onlineFiles = offlineData.plugindata.files_filemanager.online || [];
                    offlineFiles = this.fileUploaderProvider.markOfflineFiles(offlineFiles);

                    this.files = onlineFiles.concat(offlineFiles);
                });
            } else {
                // No offline data, get the online files.
                this.files = this.assignProvider.getSubmissionPluginAttachments(this.plugin);
            }
        }).finally(() => {
            this.fileSessionprovider.setFiles(this.component, this.assign.id, this.files);
        });
    }
}
