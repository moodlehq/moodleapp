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

import { AddonModAssign, AddonModAssignProvider } from '@addons/mod/assign/services/assign';
import { AddonModAssignHelper } from '@addons/mod/assign/services/assign-helper';
import { AddonModAssignOffline } from '@addons/mod/assign/services/assign-offline';
import { Component, OnInit } from '@angular/core';
import { CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreFileSession } from '@services/file-session';
import { CoreUtils } from '@services/utils/utils';
import { AddonModAssignSubmissionFileHandlerService } from '../services/handler';
import { FileEntry } from '@ionic-native/file/ngx';
import { AddonModAssignSubmissionPluginBaseComponent } from '@addons/mod/assign/classes/base-submission-plugin-component';
import { CoreFileEntry } from '@services/file-helper';

/**
 * Component to render a file submission plugin.
 */
@Component({
    selector: 'addon-mod-assign-submission-file',
    templateUrl: 'addon-mod-assign-submission-file.html',
})
export class AddonModAssignSubmissionFileComponent extends AddonModAssignSubmissionPluginBaseComponent implements OnInit {

    component = AddonModAssignProvider.COMPONENT;
    files: CoreFileEntry[] = [];

    maxSize?: number;
    acceptedTypes?: string;
    maxSubmissions?: number;

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        this.acceptedTypes = this.configs?.filetypeslist;
        this.maxSize = this.configs?.maxsubmissionsizebytes
            ? parseInt(this.configs.maxsubmissionsizebytes, 10)
            : undefined;
        this.maxSubmissions = this.configs?.maxfilesubmissions
            ? parseInt(this.configs.maxfilesubmissions, 10)
            : undefined;

        // Get the offline data.
        const filesData = await CoreUtils.ignoreErrors(
            AddonModAssignOffline.getSubmission(this.assign.id),
            undefined,
        );

        try {
            if (filesData && filesData.plugindata && filesData.plugindata.files_filemanager) {
                const offlineDataFiles = <CoreFileUploaderStoreFilesResult>filesData.plugindata.files_filemanager;
                // It has offline data.
                let offlineFiles: FileEntry[] = [];
                if (offlineDataFiles.offline) {
                    offlineFiles = <FileEntry[]>await CoreUtils.ignoreErrors(
                        AddonModAssignHelper.getStoredSubmissionFiles(
                            this.assign.id,
                            AddonModAssignSubmissionFileHandlerService.FOLDER_NAME,
                        ),
                        [],
                    );
                }

                this.files = offlineDataFiles.online || [];
                this.files = this.files.concat(offlineFiles);
            } else {
                // No offline data, get the online files.
                this.files = AddonModAssign.getSubmissionPluginAttachments(this.plugin);
            }
        } finally {
            CoreFileSession.setFiles(this.component, this.assign.id, this.files);
        }
    }

}
