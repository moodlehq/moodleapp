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
import { Platform } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreFileUploaderHandler, CoreFileUploaderHandlerData } from './delegate';
import { CoreFileUploaderHelperProvider } from './helper';
import { CoreFileUploaderProvider } from './fileuploader';
/**
 * Handler to upload any type of file.
 */
@Injectable()
export class CoreFileUploaderFileHandler implements CoreFileUploaderHandler {
    name = 'CoreFileUploaderFile';
    priority = 1200;

    constructor(private appProvider: CoreAppProvider, private platform: Platform, private timeUtils: CoreTimeUtilsProvider,
            private uploaderHelper: CoreFileUploaderHelperProvider, private uploaderProvider: CoreFileUploaderProvider,
            private domUtils: CoreDomUtilsProvider) { }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.platform.is('android') || !this.appProvider.isMobile() ||
            (this.platform.is('ios') && this.platform.version().major >= 9);
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
        const isIOS = this.platform.is('ios');

        return {
            title: isIOS ? 'core.fileuploader.more' : 'core.fileuploader.file',
            class: 'core-fileuploader-file-handler',
            icon: isIOS ? 'more' : 'folder',
            afterRender: (maxSize: number, upload: boolean, allowOffline: boolean, mimetypes: string[]): void => {
                // Add an invisible file input in the file handler.
                // It needs to be done like this because the action sheet items don't accept inputs.
                const element = document.querySelector('.core-fileuploader-file-handler');
                if (element) {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.classList.add('core-fileuploader-file-handler-input');
                    if (mimetypes && mimetypes.length && (!this.platform.is('android') || mimetypes.length == 1)) {
                        // Don't use accept attribute in Android with several mimetypes, it's not supported.
                        input.setAttribute('accept', mimetypes.join(', '));
                    }

                    input.addEventListener('change', (evt: Event) => {
                        const file = input.files[0];
                        let fileName;

                        input.value = ''; // Unset input.
                        if (!file) {
                            return;
                        }

                        // Verify that the mimetype of the file is supported, in case the accept attribute isn't supported.
                        const error = this.uploaderProvider.isInvalidMimetype(mimetypes, file.name, file.type);
                        if (error) {
                            this.domUtils.showErrorModal(error);

                            return;
                        }

                        fileName = file.name;
                        if (isIOS) {
                            // Check the name of the file and add a timestamp if needed (take picture).
                            const matches = fileName.match(/image\.(jpe?g|png)/);
                            if (matches) {
                                fileName = 'image_' + this.timeUtils.readableTimestamp() + '.' + matches[1];
                            }
                        }

                        // Upload the picked file.
                        this.uploaderHelper.uploadFileObject(file, maxSize, upload, allowOffline, fileName).then((result) => {
                            this.uploaderHelper.fileUploaded(result);
                        }).catch((error) => {
                            if (error) {
                                this.domUtils.showErrorModal(error);
                            }
                        });
                    });

                    if (this.platform.is('ios')) {
                        // In iOS, the click on the input stopped working for some reason. We need to put it 1 level higher.
                        element.parentElement.appendChild(input);

                        // Animate the button when the input is clicked.
                        input.addEventListener('mousedown', () => {
                            element.classList.add('activated');
                        });
                        input.addEventListener('mouseup', () => {
                            this.platform.timeout(() => {
                                element.classList.remove('activated');
                            }, 80);
                        });
                    } else {
                        element.appendChild(input);
                    }
                }
            }
        };
    }
}
