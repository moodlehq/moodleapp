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

import { Component, OnDestroy, Optional, ViewChild } from '@angular/core';
import { Content, IonicPage, NavController, NavParams } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { AddonNotesProvider } from '../../providers/notes';
import { AddonNotesSyncProvider } from '../../providers/notes-sync';

/**
 * Page that displays the list of notes.
 */
@IonicPage({ segment: 'addon-notes-list' })
@Component({
    selector: 'page-addon-notes-list',
    templateUrl: 'list.html',
})
export class AddonNotesListPage implements OnDestroy {
    @ViewChild(Content) content: Content;

    protected courseId = 0;
    protected syncObserver: any;

    type = '';
    refreshIcon = 'spinner';
    syncIcon = 'spinner';
    notes: any[];
    hasOffline = false;
    notesLoaded = false;

    constructor(navParams: NavParams, private navCtrl: NavController, @Optional() private svComponent: CoreSplitViewComponent,
            private domUtils: CoreDomUtilsProvider, private textUtils: CoreTextUtilsProvider,
            sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            private notesProvider: AddonNotesProvider, private notesSync: AddonNotesSyncProvider) {
        this.courseId = navParams.get('courseId') || sitesProvider.getCurrentSiteHomeId();
        this.type = navParams.get('type');
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
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchNotes(true).then(() => {
            this.notesProvider.logView(this.courseId);
        });
    }

    /**
     * Fetch notes
     * @param  {boolean} sync         When to resync notes.
     * @param  {boolean} [showErrors] When to display errors or not.
     * @return {Promise<any>}         Promise with the notes,
     */
    private fetchNotes(sync: boolean, showErrors?: boolean): Promise<any> {
        const promise = sync ? this.syncNotes(showErrors) : Promise.resolve();

        return promise.catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.notesProvider.getNotes(this.courseId).then((notes) => {
                notes = notes[this.type + 'notes'] || [];

                this.hasOffline = this.notesProvider.hasOfflineNote(notes);

                return this.notesProvider.getNotesUserData(notes, this.courseId).then((notes) => {
                    this.notes = notes;
                });
            });
        }).catch((message) => {
            this.domUtils.showErrorModal(message);
        }).finally(() => {
            this.notesLoaded = true;
            this.refreshIcon = 'refresh';
            this.syncIcon = 'loop';
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
     * Tries to syncrhonize course notes.
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
     * Opens the profile of a user.
     *
     * @param {number} userId
     */
    openUserProfile(userId: number): void {
        // Decide which navCtrl to use. If this page is inside a split view, use the split view's master nav.
        const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        navCtrl.push('CoreUserProfilePage', {userId, courseId: this.courseId});
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.syncObserver && this.syncObserver.off();
    }
}
