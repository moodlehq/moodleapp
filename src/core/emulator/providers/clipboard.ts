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
import { Clipboard } from '@ionic-native/clipboard';
import { CoreAppProvider } from '@providers/app';

/**
 * Emulates the Cordova Clipboard plugin in desktop apps and in browser.
 */
@Injectable()
export class ClipboardMock extends Clipboard {
    isDesktop: boolean;
    clipboard: any;
    copyTextarea: HTMLTextAreaElement;

    constructor(appProvider: CoreAppProvider) {
        super();

        this.isDesktop = appProvider.isDesktop();
        if (this.isDesktop) {
            this.clipboard = require('electron').clipboard;
        } else {
            // In browser the text must be selected in order to copy it. Create a hidden textarea to put the text in it.
            this.copyTextarea = document.createElement('textarea');
            this.copyTextarea.className = 'core-browser-copy-area';
            this.copyTextarea.setAttribute('aria-hidden', 'true');
            document.body.appendChild(this.copyTextarea);
        }
    }

    /**
     * Copy some text to the clipboard.
     *
     * @param {string} text The text to copy.
     * @return {Promise<any>} Promise resolved when copied.
     */
    copy(text: string): Promise<any> {
        return new Promise((resolve, reject): void => {
            if (this.isDesktop) {
                this.clipboard.writeText(text);
                resolve();
            } else {
                // Put the text in the hidden textarea and select it.
                this.copyTextarea.innerHTML = text;
                this.copyTextarea.select();

                try {
                    if (document.execCommand('copy')) {
                        resolve();
                    } else {
                        reject();
                    }
                } catch (err) {
                    reject();
                }

                this.copyTextarea.innerHTML = '';
            }
        });
    }

    /*
     * Get the text stored in the clipboard.
     *
     * @return {Promise<any>} Promise resolved with the text.
     */
    paste(): Promise<any> {
        return new Promise((resolve, reject): void => {
            if (this.isDesktop) {
                resolve(this.clipboard.readText());
            } else {
                // Paste the text in the hidden textarea and get it.
                this.copyTextarea.innerHTML = '';
                this.copyTextarea.select();

                try {
                    if (document.execCommand('paste')) {
                        resolve(this.copyTextarea.innerHTML);
                    } else {
                        reject();
                    }
                } catch (err) {
                    reject();
                }

                this.copyTextarea.innerHTML = '';
            }
        });
    }
}
