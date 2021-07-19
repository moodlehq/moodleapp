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

import { Injectable } from '@angular/core';

import { CoreApp } from '@services/app';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreFileUploaderHandler, CoreFileUploaderHandlerData, CoreFileUploaderHandlerResult } from '../fileuploader-delegate';
import { CoreFileUploaderHelper } from '../fileuploader-helper';
import { CoreFileUploader } from '../fileuploader';
import { makeSingleton, Translate } from '@singletons';

/**
 * Handler to upload any type of file.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileUploaderFileHandlerService implements CoreFileUploaderHandler {

    name = 'CoreFileUploaderFile';
    priority = 1200;

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return Promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Given a list of mimetypes, return the ones that are supported by the handler.
     *
     * @param mimetypes List of mimetypes.
     * @return Supported mimetypes.
     */
    getSupportedMimetypes(mimetypes: string[]): string[] {
        return mimetypes;
    }

    /**
     * Get the data to display the handler.
     *
     * @return Data.
     */
    getData(): CoreFileUploaderHandlerData {
        const handler: CoreFileUploaderHandlerData = {
            title: 'core.fileuploader.file',
            class: 'core-fileuploader-file-handler',
            icon: 'folder', // Cannot use font-awesome in action sheet.
        };

        if (CoreApp.isMobile()) {
            handler.action = async (
                maxSize?: number,
                upload?: boolean,
                allowOffline?: boolean,
                mimetypes?: string[],
            ): Promise<CoreFileUploaderHandlerResult> => {
                const result = await CoreFileUploaderHelper.chooseAndUploadFile(maxSize, upload, allowOffline, mimetypes);

                return {
                    treated: true,
                    result: result,
                };
            };

        } else {
            handler.afterRender = (
                maxSize?: number,
                upload?: boolean,
                allowOffline?: boolean,
                mimetypes?: string[],
            ): void => {
                // Add an invisible file input in the file handler.
                // It needs to be done like this because the action sheet items don't accept inputs.
                const element = document.querySelector('.core-fileuploader-file-handler');
                if (!element) {
                    return;
                }

                const input = document.createElement('input');
                input.setAttribute('type', 'file');
                input.classList.add('core-fileuploader-file-handler-input');
                if (mimetypes && mimetypes.length && (!CoreApp.isAndroid() || mimetypes.length == 1)) {
                    // Don't use accept attribute in Android with several mimetypes, it's not supported.
                    input.setAttribute('accept', mimetypes.join(', '));
                }

                input.addEventListener('change', async () => {
                    const file = input.files?.[0];

                    input.value = ''; // Unset input.
                    if (!file) {
                        return;
                    }

                    // Verify that the mimetype of the file is supported, in case the accept attribute isn't supported.
                    const error = CoreFileUploader.isInvalidMimetype(mimetypes, file.name, file.type);
                    if (error) {
                        CoreDomUtils.showErrorModal(error);

                        return;
                    }

                    try {
                        // Upload the picked file.
                        const result = await CoreFileUploaderHelper.uploadFileObject(
                            file,
                            maxSize,
                            upload,
                            allowOffline,
                            file.name,
                        );

                        CoreFileUploaderHelper.fileUploaded(result);
                    } catch (error) {
                        CoreDomUtils.showErrorModalDefault(
                            error,
                            Translate.instant('core.fileuploader.errorreadingfile'),
                        );
                    }
                });

                if (CoreApp.isIOS()) {
                    // In iOS, the click on the input stopped working for some reason. We need to put it 1 level higher.
                    element.parentElement?.appendChild(input);

                    // Animate the button when the input is clicked.
                    input.addEventListener('mousedown', () => {
                        element.classList.add('activated');
                    });
                    input.addEventListener('mouseup', () => {
                        setTimeout(() => {
                            element.classList.remove('activated');
                        }, 80);
                    });
                } else {
                    element.appendChild(input);
                }
            };
        }

        return handler;
    }

}

export const CoreFileUploaderFileHandler = makeSingleton(CoreFileUploaderFileHandlerService);
