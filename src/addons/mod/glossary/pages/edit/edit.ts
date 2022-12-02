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

import { Component, OnInit, ViewChild, ElementRef, Optional, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { CoreError } from '@classes/errors/error';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CanLeave } from '@guards/can-leave';
import { FileEntry } from '@ionic-native/file/ngx';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreForms } from '@singletons/form';
import { AddonModGlossaryEntriesSource } from '../../classes/glossary-entries-source';
import { AddonModGlossaryEntriesSwipeManager } from '../../classes/glossary-entries-swipe-manager';
import {
    AddonModGlossary,
    AddonModGlossaryCategory,
    AddonModGlossaryEntryOption,
    AddonModGlossaryGlossary,
    AddonModGlossaryNewEntry,
    AddonModGlossaryNewEntryWithFiles,
    AddonModGlossaryProvider,
} from '../../services/glossary';
import { AddonModGlossaryHelper } from '../../services/glossary-helper';
import { AddonModGlossaryOffline } from '../../services/glossary-offline';

/**
 * Page that displays the edit form.
 */
@Component({
    selector: 'page-addon-mod-glossary-edit',
    templateUrl: 'edit.html',
})
export class AddonModGlossaryEditPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild('editFormEl') formElement?: ElementRef;

    component = AddonModGlossaryProvider.COMPONENT;
    cmId!: number;
    courseId!: number;
    loaded = false;
    glossary?: AddonModGlossaryGlossary;
    attachments: FileEntry[] = [];
    definitionControl = new FormControl();
    categories: AddonModGlossaryCategory[] = [];
    editorExtraParams: Record<string, unknown> = {};
    entry: AddonModGlossaryNewEntry = {
        concept: '',
        definition: '',
        timecreated: 0,
    };

    entries?: AddonModGlossaryEditEntriesSwipeManager;

    options = {
        categories: <string[]> [],
        aliases: '',
        usedynalink: false,
        casesensitive: false,
        fullmatch: false,
    };

    protected timecreated!: number;
    protected concept = '';
    protected syncId?: string;
    protected syncObserver?: CoreEventObserver;
    protected isDestroyed = false;
    protected originalData?: AddonModGlossaryNewEntryWithFiles;
    protected saved = false;

    constructor(protected route: ActivatedRoute, @Optional() protected splitView: CoreSplitViewComponent) {}

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            const routeData = this.route.snapshot.data;
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.timecreated = CoreNavigator.getRequiredRouteNumberParam('timecreated');
            this.concept = CoreNavigator.getRouteParam<string>('concept') || '';
            this.editorExtraParams.timecreated = this.timecreated;

            if (this.timecreated !== 0 && (routeData.swipeEnabled ?? true)) {
                const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                    AddonModGlossaryEntriesSource,
                    [this.courseId, this.cmId, routeData.glossaryPathPrefix ?? ''],
                );

                this.entries = new AddonModGlossaryEditEntriesSwipeManager(source);

                await this.entries.start();
            }
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            this.goBack();

            return;
        }

        this.fetchData();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.entries?.destroy();
    }

    /**
     * Fetch required data.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        try {
            this.glossary = await AddonModGlossary.getGlossary(this.courseId, this.cmId);

            if (this.timecreated > 0) {
                await this.loadOfflineData();
            }

            this.categories = await AddonModGlossary.getAllCategories(this.glossary.id, {
                cmId: this.cmId,
            });

            this.loaded = true;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_glossary.errorloadingglossary', true);

            this.goBack();
        }
    }

    /**
     * Load offline data when editing an offline entry.
     *
     * @returns Promise resolved when done.
     */
    protected async loadOfflineData(): Promise<void> {
        if (!this.glossary) {
            return;
        }

        const entry = await AddonModGlossaryOffline.getNewEntry(this.glossary.id, this.concept, this.timecreated);

        this.entry.concept = entry.concept || '';
        this.entry.definition = entry.definition || '';
        this.entry.timecreated = entry.timecreated;

        this.originalData = {
            concept: this.entry.concept,
            definition: this.entry.definition,
            files: [],
            timecreated: entry.timecreated,
        };

        if (entry.options) {
            this.options.categories = (entry.options.categories && (<string> entry.options.categories).split(',')) || [];
            this.options.aliases = <string> entry.options.aliases || '';
            this.options.usedynalink = !!entry.options.usedynalink;
            if (this.options.usedynalink) {
                this.options.casesensitive = !!entry.options.casesensitive;
                this.options.fullmatch = !!entry.options.fullmatch;
            }
        }

        // Treat offline attachments if any.
        if (entry.attachments?.offline) {
            this.attachments = await AddonModGlossaryHelper.getStoredFiles(this.glossary.id, entry.concept, entry.timecreated);

            this.originalData.files = this.attachments.slice();
        }

        this.definitionControl.setValue(this.entry.definition);
    }

    /**
     * Reset the form data.
     */
    protected resetForm(): void {
        this.entry.concept = '';
        this.entry.definition = '';
        this.entry.timecreated = 0;
        this.originalData = undefined;

        this.options.categories = [];
        this.options.aliases = '';
        this.options.usedynalink = false;
        this.options.casesensitive = false;
        this.options.fullmatch = false;
        this.attachments.length = 0; // Empty the array.

        this.definitionControl.setValue('');
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
     * @returns Resolved if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (this.saved) {
            return true;
        }

        if (AddonModGlossaryHelper.hasEntryDataChanged(this.entry, this.attachments, this.originalData)) {
            // Show confirmation if some data has been modified.
            await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));
        }

        // Delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(this.attachments);

        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

        return true;
    }

    /**
     * Save the entry.
     */
    async save(): Promise<void> {
        let definition = this.entry.definition;
        let entryId: number | undefined;
        const timecreated = this.entry.timecreated || Date.now();

        if (!this.entry.concept || !definition) {
            CoreDomUtils.showErrorModal('addon.mod_glossary.fillfields', true);

            return;
        }

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);
        definition = CoreTextUtils.formatHtmlLines(definition);

        try {
            if (!this.glossary) {
                return;
            }

            // Upload attachments first if any.
            const { saveOffline, attachmentsResult } = await this.uploadAttachments(timecreated);

            const options: Record<string, AddonModGlossaryEntryOption> = {
                aliases: this.options.aliases,
                categories: this.options.categories.join(','),
            };

            if (this.glossary.usedynalink) {
                options.usedynalink = this.options.usedynalink ? 1 : 0;
                if (this.options.usedynalink) {
                    options.casesensitive = this.options.casesensitive ? 1 : 0;
                    options.fullmatch = this.options.fullmatch ? 1 : 0;
                }
            }

            if (saveOffline) {
                if (this.entry && !this.glossary.allowduplicatedentries) {
                    // Check if the entry is duplicated in online or offline mode.
                    const isUsed = await AddonModGlossary.isConceptUsed(this.glossary.id, this.entry.concept, {
                        timeCreated: this.entry.timecreated,
                        cmId: this.cmId,
                    });

                    if (isUsed) {
                        // There's a entry with same name, reject with error message.
                        throw new CoreError(Translate.instant('addon.mod_glossary.errconceptalreadyexists'));
                    }
                }

                // Save entry in offline.
                await AddonModGlossaryOffline.addNewEntry(
                    this.glossary.id,
                    this.entry.concept,
                    definition,
                    this.courseId,
                    options,
                    <CoreFileUploaderStoreFilesResult> attachmentsResult,
                    timecreated,
                    undefined,
                    undefined,
                    this.entry,
                );
            } else {
                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                await AddonModGlossary.addEntry(
                    this.glossary.id,
                    this.entry.concept,
                    definition,
                    this.courseId,
                    options,
                    attachmentsResult,
                    {
                        timeCreated: timecreated,
                        discardEntry: this.entry,
                        allowOffline: !this.attachments.length,
                        checkDuplicates: !this.glossary.allowduplicatedentries,
                    },
                );
            }

            // Delete the local files from the tmp folder.
            CoreFileUploader.clearTmpFiles(this.attachments);

            if (entryId) {
                // Data sent to server, delete stored files (if any).
                AddonModGlossaryHelper.deleteStoredFiles(this.glossary.id, this.entry.concept, timecreated);
                CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'glossary' });
            }

            CoreEvents.trigger(AddonModGlossaryProvider.ADD_ENTRY_EVENT, {
                glossaryId: this.glossary.id,
                entryId: entryId,
            }, CoreSites.getCurrentSiteId());

            CoreForms.triggerFormSubmittedEvent(this.formElement, !!entryId, CoreSites.getCurrentSiteId());

            if (this.splitView?.outletActivated) {
                if (this.timecreated > 0) {
                    // Reload the data.
                    await this.loadOfflineData();
                } else {
                    // Empty form.
                    this.resetForm();
                }
            } else {
                this.saved = true;
                CoreNavigator.back();
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_glossary.cannoteditentry', true);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Upload entry attachments if any.
     *
     * @param timecreated Entry's timecreated.
     * @returns Promise resolved when done.
     */
    protected async uploadAttachments(
        timecreated: number,
    ): Promise<{saveOffline: boolean; attachmentsResult?: number | CoreFileUploaderStoreFilesResult}> {
        if (!this.attachments.length || !this.glossary) {
            return {
                saveOffline: false,
            };
        }

        try {
            const attachmentsResult = await CoreFileUploader.uploadOrReuploadFiles(
                this.attachments,
                AddonModGlossaryProvider.COMPONENT,
                this.glossary.id,
            );

            return {
                saveOffline: false,
                attachmentsResult,
            };
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
                throw error;
            }

            // Cannot upload them in online, save them in offline.
            const attachmentsResult = await AddonModGlossaryHelper.storeFiles(
                this.glossary.id,
                this.entry.concept,
                timecreated,
                this.attachments,
            );

            return {
                saveOffline: true,
                attachmentsResult,
            };
        }
    }

    /**
     * Helper function to go back.
     */
    protected goBack(): void {
        if (this.splitView?.outletActivated) {
            CoreNavigator.navigate('../../');
        } else {
            CoreNavigator.back();
        }
    }

}

/**
 * Helper to manage swiping within a collection of glossary entries.
 */
class AddonModGlossaryEditEntriesSwipeManager extends AddonModGlossaryEntriesSwipeManager {

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot): string | null {
        return `${this.getSource().GLOSSARY_PATH_PREFIX}edit/${route.params.timecreated}`;
    }

}
