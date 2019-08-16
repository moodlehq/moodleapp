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

import { Component } from '@angular/core';
import { IonicPage, ViewController, NavParams } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonNotesProvider } from '../../providers/notes';

/**
 * Component that displays a text area for composing a note.
 */
@IonicPage({ segment: 'addon-notes-add' })
@Component({
    selector: 'page-addon-notes-add',
    templateUrl: 'add.html',
})
export class AddonNotesAddPage {
    userId: number;
    courseId: number;
    type = 'personal';
    text = '';
    processing = false;

    constructor(params: NavParams, private viewCtrl: ViewController, private appProvider: CoreAppProvider,
            private domUtils: CoreDomUtilsProvider, private notesProvider: AddonNotesProvider) {
        this.userId = params.get('userId');
        this.courseId = params.get('courseId');
        this.type = params.get('type') || 'personal';
    }

    /**
     * Send the note or store it offline.
     *
     * @param {Event} e Event.
     */
    addNote(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        this.appProvider.closeKeyboard();
        const loadingModal = this.domUtils.showModalLoading('core.sending', true);
        // Freeze the add note button.
        this.processing = true;
        this.notesProvider.addNote(this.userId, this.courseId, this.type, this.text).then((sent) => {
            this.viewCtrl.dismiss({type: this.type, sent: true}).finally(() => {
                this.domUtils.showToast(sent ? 'addon.notes.eventnotecreated' : 'core.datastoredoffline', true, 3000);
            });
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
            this.processing = false;
        }).finally(() => {
            loadingModal.dismiss();
        });
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss({type: this.type});
    }
}
