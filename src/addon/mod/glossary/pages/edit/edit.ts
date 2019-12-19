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
import { FormControl } from '@angular/forms';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { AddonModGlossaryProvider } from '../../providers/glossary';
import { AddonModGlossaryOfflineProvider } from '../../providers/offline';
import { AddonModGlossaryHelperProvider } from '../../providers/helper';

/**
 * Page that displays the edit form.
 */
@IonicPage({ segment: 'addon-mod-glossary-edit' })
@Component({
    selector: 'page-addon-mod-glossary-edit',
    templateUrl: 'edit.html',
})
export class AddonModGlossaryEditPage implements OnInit {
    component = AddonModGlossaryProvider.COMPONENT;
    loaded = false;
    entry = {
        concept: '',
        definition: '',
        timecreated: 0,
    };
    options = {
        categories: [],
        aliases: '',
        usedynalink: false,
        casesensitive: false,
        fullmatch: false
    };
    attachments = [];
    definitionControl = new FormControl();
    categories = [];

    protected courseId: number;
    protected module: any;
    protected glossary: any;
    protected syncId: string;
    protected syncObserver: any;
    protected isDestroyed = false;
    protected originalData: any;
    protected saved = false;

    constructor(private navParams: NavParams,
            private navCtrl: NavController,
            private translate: TranslateService,
            private domUtils: CoreDomUtilsProvider,
            private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider,
            private uploaderProvider: CoreFileUploaderProvider,
            private textUtils: CoreTextUtilsProvider,
            private glossaryProvider: AddonModGlossaryProvider,
            private glossaryOffline: AddonModGlossaryOfflineProvider,
            private glossaryHelper: AddonModGlossaryHelperProvider) {
        this.courseId = navParams.get('courseId');
        this.module = navParams.get('module');
        this.glossary = navParams.get('glossary');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        const entry = this.navParams.get('entry');

        let promise;

        if (entry) {
            this.entry.concept = entry.concept || '';
            this.entry.definition = entry.definition || '';
            this.entry.timecreated = entry.timecreated || 0;

            this.originalData = {
                concept: this.entry.concept,
                definition: this.entry.definition,
                files: [],
            };

            if (entry.options) {
                this.options.categories = entry.options.categories || [];
                this.options.aliases = entry.options.aliases || '';
                this.options.usedynalink = !!entry.options.usedynalink;
                if (this.options.usedynalink) {
                    this.options.casesensitive = !!entry.options.casesensitive;
                    this.options.fullmatch = !!entry.options.fullmatch;
                }
            }

            // Treat offline attachments if any.
            if (entry.attachments && entry.attachments.offline) {
                promise = this.glossaryHelper.getStoredFiles(this.glossary.id, entry.concept, entry.timecreated).then((files) => {
                    this.attachments = files;
                    this.originalData.files = files.slice();
                });
            }
        }

        this.definitionControl.setValue(this.entry.definition);

        Promise.resolve(promise).then(() => {
            this.glossaryProvider.getAllCategories(this.glossary.id).then((categories) => {
                this.categories = categories;
            }).finally(() => {
                this.loaded = true;
            });
        });
    }

    /**
     * Definition changed.
     *
     * @param text The new text.
     */
    onDefinitionChange(text: string): void {
        this.entry.definition = text;
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        let promise: any;

        if (!this.saved && this.glossaryHelper.hasEntryDataChanged(this.entry, this.attachments, this.originalData)) {
            // Show confirmation if some data has been modified.
            promise = this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            // Delete the local files from the tmp folder.
            this.uploaderProvider.clearTmpFiles(this.attachments);
        });
    }

    /**
     * Save the entry.
     */
    save(): void {
        let definition = this.entry.definition,
            saveOffline = false,
            promise;
        const timecreated = this.entry.timecreated || Date.now();

        if (!this.entry.concept || !definition) {
            this.domUtils.showErrorModal('addon.mod_glossary.fillfields', true);

            return;
        }

        const modal = this.domUtils.showModalLoading('core.sending', true);

        // Add some HTML to the definition if needed.
        definition = this.textUtils.formatHtmlLines(definition);

        // Upload attachments first if any.
        if (this.attachments.length > 0) {
            promise = this.glossaryHelper.uploadOrStoreFiles(this.glossary.id, this.entry.concept, timecreated, this.attachments,
                    false).catch(() => {
                // Cannot upload them in online, save them in offline.
                saveOffline = true;

                return this.glossaryHelper.uploadOrStoreFiles(this.glossary.id, this.entry.concept, timecreated,
                        this.attachments, true);
            });
        } else {
            promise = Promise.resolve();
        }

        promise.then((attach) => {
            const options: any = {
                aliases: this.options.aliases,
                categories: this.options.categories.join(',')
            };

            if (this.glossary.usedynalink) {
                options.usedynalink = this.options.usedynalink ? 1 : 0;
                if (this.options.usedynalink) {
                    options.casesensitive = this.options.casesensitive ? 1 : 0;
                    options.fullmatch = this.options.fullmatch ? 1 : 0;
                }
            }

            if (saveOffline) {
                let promise;
                if (this.entry && !this.glossary.allowduplicatedentries) {
                    // Check if the entry is duplicated in online or offline mode.
                    promise = this.glossaryProvider.isConceptUsed(this.glossary.id, this.entry.concept, this.entry.timecreated)
                        .then((used) => {
                            if (used) {
                                // There's a entry with same name, reject with error message.
                                return Promise.reject(this.translate.instant('addon.mod_glossary.errconceptalreadyexists'));
                            }
                        });
                } else {
                    promise = Promise.resolve();
                }

                return promise.then(() => {
                    // Save entry in offline.
                    return this.glossaryOffline.addNewEntry(this.glossary.id, this.entry.concept, definition, this.courseId,
                            options, attach, timecreated, undefined, undefined, this.entry).then(() => {
                        // Don't return anything.
                    });
                });
            } else {
                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                return this.glossaryProvider.addEntry(this.glossary.id, this.entry.concept, definition, this.courseId, options,
                    attach, timecreated, undefined, this.entry, !this.attachments.length, !this.glossary.allowduplicatedentries);
            }
        }).then((entryId) => {
             // Delete the local files from the tmp folder.
             this.uploaderProvider.clearTmpFiles(this.attachments);

            if (entryId) {
                // Data sent to server, delete stored files (if any).
                this.glossaryHelper.deleteStoredFiles(this.glossary.id, this.entry.concept, timecreated);
            }

            const data = {
                glossaryId: this.glossary.id,
            };
            this.eventsProvider.trigger(AddonModGlossaryProvider.ADD_ENTRY_EVENT, data, this.sitesProvider.getCurrentSiteId());

            this.saved = true;
            this.navCtrl.pop();
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_glossary.cannoteditentry', true);
        }).finally(() => {
            modal.dismiss();
        });
    }
}
