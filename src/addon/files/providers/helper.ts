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

import { Injectable } from '@angular/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreFileUploaderHelperProvider } from '@core/fileuploader/providers/helper';
import { AddonFilesProvider } from './files';

/**
 * Service that provides some features regarding private and site files.
 */
@Injectable()
export class AddonFilesHelperProvider {

    constructor(private sitesProvider: CoreSitesProvider, private fileUploaderHelper: CoreFileUploaderHelperProvider,
        private filesProvider: AddonFilesProvider, private domUtils: CoreDomUtilsProvider) { }

    /**
     * Select a file, upload it and move it to private files.
     *
     * @param {any} [info] Private files info. See AddonFilesProvider.getPrivateFilesInfo.
     * @return {Promise<any>} Promise resolved when a file is uploaded, rejected otherwise.
     */
    uploadPrivateFile(info?: any): Promise<any> {
        // Calculate the max size.
        const currentSite = this.sitesProvider.getCurrentSite();
        let maxSize = currentSite.getInfo().usermaxuploadfilesize,
            userQuota = currentSite.getInfo().userquota;

        if (userQuota === 0) {
            // 0 means ignore user quota. In the app it is -1.
            userQuota = -1;
        } else if (userQuota > 0 && typeof info != 'undefined') {
            userQuota = userQuota - info.filesizewithoutreferences;
        }

        if (typeof userQuota != 'undefined') {
            // Use the minimum value.
            maxSize = Math.min(maxSize, userQuota);
        }

        // Select and upload the file.
        return this.fileUploaderHelper.selectAndUploadFile(maxSize).then((result) => {
            if (!result) {
                return Promise.reject(null);
            }

            // File uploaded. Move it to private files.
            const modal = this.domUtils.showModalLoading('core.fileuploader.uploading', true);

            return this.filesProvider.moveFromDraftToPrivate(result.itemid).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'core.fileuploader.errorwhileuploading', true);

                return Promise.reject(null);
            }).finally(() => {
                modal.dismiss();
            });
        }).then(() => {
            this.domUtils.showToast('core.fileuploader.fileuploaded', true, undefined, 'core-toast-success');
        });
    }
}
