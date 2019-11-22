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

import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Content, ModalController } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUserProvider } from '@core/user/providers/user';
import { coreSlideInOut } from '@classes/animations';
import { AddonNotesProvider, AddonNotesNoteFormatted } from '../../providers/notes';
import { AddonNotesOfflineProvider } from '../../providers/notes-offline';
import { AddonNotesSyncProvider } from '../../providers/notes-sync';

/**
 * Component that displays the notes of a course.
 */
@Component({
    selector: 'addon-notes-list',
    templateUrl: 'addon-notes-list.html',
    animations: [coreSlideInOut]
})
export class AddonNotesListComponent implements OnInit, OnDestroy {
    @Input() courseId: number;
    @Input() userId?: number;

    @ViewChild(Content) content: Content;

    protected syncObserver: any;

    type = 'course';
    refreshIcon = 'spinner';
    syncIcon = 'spinner';
    notes: AddonNotesNoteFormatted[];
    hasOffline = false;
    notesLoaded = false;
    user: any;
    showDelete = false;
    canDeleteNotes = false;
    currentUserId: number;

    constructor(private domUtils: CoreDomUtilsProvider, private textUtils: CoreTextUtilsProvider,
            sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider, private modalCtrl: ModalController,
            private notesProvider: AddonNotesProvider, private notesSync: AddonNotesSyncProvider,
            private userProvider: CoreUserProvider, private notesOffline: AddonNotesOfflineProvider) {
        // Refresh data if notes are synchronized automatically.
        this.syncObserver = eventsProvider.on(AddonNotesSyncProvider.AUTO_SYNCED, (data) => {
            if (data.courseId == this.courseId) {
                // Show the sync warnings.
                this.showSyncWarnings(data.warnings);

                // Refresh the data.
                this.notesLoaded = false;
                this.refreshIcon = 'spinner';
                this.syncIcon = 'spinner';

                this.domUtils.scrollToTop(this.content);
                this.fetchNotes(false);
            }
        }, sitesProvider.getCurrentSiteId());

        this.currentUserId = sitesProvider.getCurrentSiteUserId();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchNotes(true).then(() => {
            this.notesProvider.logView(this.courseId, this.userId).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Fetch notes.
     *
     * @param sync When to resync notes.
     * @param showErrors When to display errors or not.
     * @return Promise with the notes.
     */
    private fetchNotes(sync: boolean, showErrors?: boolean): Promise<any> {
        const promise = sync ? this.syncNotes(showErrors) : Promise.resolve();

        return promise.catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.notesProvider.getNotes(this.courseId, this.userId).then((notes) => {
                const notesList: AddonNotesNoteFormatted[] = notes[this.type + 'notes'] || [];

                notesList.forEach((note) => {
                    note.content = this.textUtils.decodeHTML(note.content);
                });

                return this.notesProvider.setOfflineDeletedNotes(notesList, this.courseId).then((notesList) => {

                    this.hasOffline = notesList.some((note) => note.offline || note.deleted);

                    if (this.userId) {
                        this.notes = notesList;

                        // Get the user profile to retrieve the user image.
                        return this.userProvider.getProfile(this.userId, this.courseId, true).then((user) => {
                            this.user = user;
                        });
                    } else {
                        return this.notesProvider.getNotesUserData(notesList, this.courseId).then((notes) => {
                            this.notes = notes;
                        });
                    }
                });
            });
        }).catch((message) => {
            this.domUtils.showErrorModal(message);
        }).finally(() => {
            let canDelete = this.notes && this.notes.length > 0;
            if (canDelete && this.type == 'personal') {
                canDelete = !!this.notes.find((note) =>  {
                    return note.usermodified == this.currentUserId;
                });
            }
            this.canDeleteNotes = canDelete;

            this.notesLoaded = true;
            this.refreshIcon = 'refresh';
            this.syncIcon = 'sync';
        });
    }

    /**
     * Refresh notes on PTR.
     *
     * @param showErrors Whether to display errors or not.
     * @param refresher Refresher instance.
     */
    refreshNotes(showErrors: boolean, refresher?: any): void {
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';
        this.notesProvider.invalidateNotes(this.courseId, this.userId).finally(() => {
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
            this.notesProvider.logView(this.courseId, this.userId).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Add a new Note to user and course.
     *
     * @param e Event.
     */
    addNote(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        const modal = this.modalCtrl.create('AddonNotesAddPage', { userId: this.userId, courseId: this.courseId, type: this.type });
        modal.onDidDismiss((data) => {
            if (data && data.sent && data.type) {
                if (data.type != this.type) {
                    this.type = data.type;
                    this.notesLoaded = false;
                }

                this.refreshNotes(false);
            } else if (data && data.type && data.type != this.type) {
                this.type = data.type;
                this.typeChanged();
            }
        });

        modal.present();
    }

    /**
     * Delete a note.
     *
     * @param e Click event.
     * @param note Note to delete.
     */
    deleteNote(e: Event, note: AddonNotesNoteFormatted): void {
        e.preventDefault();
        e.stopPropagation();

        this.domUtils.showDeleteConfirm('addon.notes.deleteconfirm').then(() => {
            this.notesProvider.deleteNote(note, this.courseId).then(() => {
                this.showDelete = false;

                this.refreshNotes(false);

                this.domUtils.showToast('addon.notes.eventnotedeleted', true, 3000);
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'Delete note failed.');
            });
        }).catch(() => {
            // User cancelled, nothing to do.
        });
    }

    /**
     * Restore a note.
     *
     * @param e Click event.
     * @param note Note to delete.
     */
    undoDeleteNote(e: Event, note: AddonNotesNoteFormatted): void {
        e.preventDefault();
        e.stopPropagation();

        this.notesOffline.undoDeleteNote(note.id).then(() => {
            this.refreshNotes(true);
        });
    }

    /**
     * Toggle delete.
     */
    toggleDelete(): void {
        this.showDelete = !this.showDelete;
    }

    /**
     * Tries to synchronize course notes.
     *
     * @param showErrors Whether to display errors or not.
     * @return Promise resolved if sync is successful, rejected otherwise.
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
     * @param warnings the warnings
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
