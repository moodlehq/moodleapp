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

import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Content } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonNotesProvider } from '../../providers/notes';
import { AddonNotesSyncProvider } from '../../providers/notes-sync';

/**
 * Component that displays the notes of a course.
 */
@Component({
    selector: 'addon-notes-list',
    templateUrl: 'addon-notes-list.html',
})
export class AddonNotesListComponent implements OnInit, OnDestroy {
    @Input() courseId: number;

    @ViewChild(Content) content: Content;

    protected syncObserver: any;

    type = 'course';
    refreshIcon = 'spinner';
    syncIcon = 'spinner';
    notes: any[];
    hasOffline = false;
    notesLoaded = false;

    constructor(private domUtils: CoreDomUtilsProvider, private textUtils: CoreTextUtilsProvider,
            sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            private notesProvider: AddonNotesProvider, private notesSync: AddonNotesSyncProvider) {
        // Refresh data if notes are synchronized automatically.
        this.syncObserver = eventsProvider.on(AddonNotesSyncProvider.AUTO_SYNCED, (data) => {
            if (data.courseId == this.courseId) {
                // Show the sync warnings.
                this.showSyncWarnings(data.warnings);

                // Refresh the data.
                this.notesLoaded = false;
                this.refreshIcon = 'spinner';
                this.syncIcon = 'spinner';

                this.content.scrollToTop();
                this.fetchNotes(false);
            }
        }, sitesProvider.getCurrentSiteId());
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchNotes(true).then(() => {
            this.notesProvider.logView(this.courseId);
        });
    }

    /**
     * Fetch notes.
     *
     * @param  {boolean} sync         When to resync notes.
     * @param  {boolean} [showErrors] When to display errors or not.
     * @return {Promise<any>}         Promise with the notes.
     */
    private fetchNotes(sync: boolean, showErrors?: boolean): Promise<any> {
        const promise = sync ? this.syncNotes(showErrors) : Promise.resolve();

        return promise.catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.notesProvider.getNotes(this.courseId).then((notes) => {
                notes = notes[this.type + 'notes'] || [];

                this.hasOffline = notes.some((note) => note.offline);

                return this.notesProvider.getNotesUserData(notes, this.courseId).then((notes) => {
                    this.notes = notes;
                });
            });
        }).catch((message) => {
            this.domUtils.showErrorModal(message);
        }).finally(() => {
            this.notesLoaded = true;
            this.refreshIcon = 'refresh';
            this.syncIcon = 'sync';
        });
    }

    /**
     * Refresh notes on PTR.
     *
     * @param {boolean} showErrors Whether to display errors or not.
     * @param {any}     refresher  Refresher instance.
     */
    refreshNotes(showErrors: boolean, refresher?: any): void {
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';
        this.notesProvider.invalidateNotes(this.courseId).finally(() => {
            this.fetchNotes(true, showErrors).finally(() => {
                if (refresher) {
                    refresher.complete();
                }
            });
        });
    }

    /**
     * Function called when the type has changed.
     */
    typeChanged(): void {
        this.notesLoaded = false;
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';
        this.fetchNotes(true).then(() => {
            this.notesProvider.logView(this.courseId);
        });
    }

    /**
     * Tries to synchronize course notes.
     *
     * @param  {boolean} showErrors Whether to display errors or not.
     * @return {Promise<any>}       Promise resolved if sync is successful, rejected otherwise.
     */
    private syncNotes(showErrors: boolean): Promise<any> {
        return this.notesSync.syncNotes(this.courseId).then((warnings) => {
            this.showSyncWarnings(warnings);
        }).catch((error) => {
            if (showErrors) {
                this.domUtils.showErrorModalDefault(error, 'core.errorsync', true);
            }

            return Promise.reject(null);
        });
    }

    /**
     * Show sync warnings if any.
     *
     * @param {string[]} warnings the warnings
     */
    private showSyncWarnings(warnings: string[]): void {
        const message = this.textUtils.buildMessage(warnings);
        if (message) {
            this.domUtils.showErrorModal(message);
        }
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.syncObserver && this.syncObserver.off();
    }
}
