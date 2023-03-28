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

import { Component, OnInit, ViewChild, ElementRef, Optional } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CoreError } from '@classes/errors/error';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CanLeave } from '@guards/can-leave';
import { CoreFileEntry } from '@services/file-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreForms } from '@singletons/form';
import {
    AddonModGlossary,
    AddonModGlossaryCategory,
    AddonModGlossaryEntryOption,
    AddonModGlossaryGlossary,
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
export class AddonModGlossaryEditPage implements OnInit, CanLeave {

    @ViewChild('editFormEl') formElement?: ElementRef;

    component = AddonModGlossaryProvider.COMPONENT;
    cmId!: number;
    courseId!: number;
    loaded = false;
    glossary?: AddonModGlossaryGlossary;
    definitionControl = new FormControl();
    categories: AddonModGlossaryCategory[] = [];
    editorExtraParams: Record<string, unknown> = {};
    handler!: AddonModGlossaryFormHandler;
    data: AddonModGlossaryFormData = {
        concept: '',
        definition: '',
        timecreated: 0,
        attachments: [],
        categories: [],
        aliases: '',
        usedynalink: false,
        casesensitive: false,
        fullmatch: false,
    };

    originalData?: AddonModGlossaryFormData;

    protected syncId?: string;
    protected syncObserver?: CoreEventObserver;
    protected isDestroyed = false;
    protected saved = false;

    constructor(protected route: ActivatedRoute, @Optional() protected splitView: CoreSplitViewComponent) {}

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');

            this.handler = new AddonModGlossaryNewFormHandler(this);
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            this.goBack();

            return;
        }

        this.fetchData();
    }

    /**
     * Fetch required data.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        try {
            this.glossary = await AddonModGlossary.getGlossary(this.courseId, this.cmId);

            await this.handler.loadData(this.glossary);

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
     * Reset the form data.
     */
    protected resetForm(): void {
        this.originalData = undefined;

        this.data.concept = '';
        this.data.definition = '';
        this.data.timecreated = 0;
        this.data.categories = [];
        this.data.aliases = '';
        this.data.usedynalink = false;
        this.data.casesensitive = false;
        this.data.fullmatch = false;
        this.data.attachments.length = 0; // Empty the array.

        this.definitionControl.setValue('');
    }

    /**
     * Definition changed.
     *
     * @param text The new text.
     */
    onDefinitionChange(text: string): void {
        this.data.definition = text;
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

        if (this.hasDataChanged()) {
            // Show confirmation if some data has been modified.
            await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));
        }

        // Delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(this.data.attachments);

        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

        return true;
    }

    /**
     * Save the entry.
     */
    async save(): Promise<void> {
        if (!this.data.concept || !this.data.definition) {
            CoreDomUtils.showErrorModal('addon.mod_glossary.fillfields', true);

            return;
        }

        if (!this.glossary) {
            return;
        }

        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        try {
            const savedOnline = await this.handler.save(this.glossary);

            this.saved = true;

            CoreForms.triggerFormSubmittedEvent(this.formElement, savedOnline, CoreSites.getCurrentSiteId());

            this.goBack();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_glossary.cannoteditentry', true);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Check if the form data has changed.
     *
     * @returns True if data has changed, false otherwise.
     */
    protected hasDataChanged(): boolean {
        if (!this.originalData || this.originalData.concept === undefined) {
            // There is no original data.
            return !!(this.data.definition || this.data.concept || this.data.attachments.length > 0);
        }

        if (this.originalData.definition != this.data.definition || this.originalData.concept != this.data.concept) {
            return true;
        }

        return CoreFileUploader.areFileListDifferent(this.data.attachments, this.originalData.attachments);
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
 * Helper to manage form data.
 */
abstract class AddonModGlossaryFormHandler {

    constructor(protected page: AddonModGlossaryEditPage) {}

    /**
     * Load form data.
     *
     * @param glossary Glossary.
     */
    abstract loadData(glossary: AddonModGlossaryGlossary): Promise<void>;

    /**
     * Save form data.
     *
     * @param glossary Glossary.
     * @returns Whether the form was saved online.
     */
    abstract save(glossary: AddonModGlossaryGlossary): Promise<boolean>;

    /**
     * Upload attachments online.
     *
     * @param glossary Glossary.
     * @returns Uploaded attachments item id.
     */
    protected async uploadAttachments(glossary: AddonModGlossaryGlossary): Promise<number> {
        const data = this.page.data;
        const itemId = await CoreFileUploader.uploadOrReuploadFiles(
            data.attachments,
            AddonModGlossaryProvider.COMPONENT,
            glossary.id,
        );

        return itemId;
    }

    /**
     * Store attachments offline.
     *
     * @param glossary Glossary.
     * @param timecreated Entry time created.
     * @returns Storage result.
     */
    protected async storeAttachments(
        glossary: AddonModGlossaryGlossary,
        timecreated: number,
    ): Promise<CoreFileUploaderStoreFilesResult> {
        const data = this.page.data;
        const result = await AddonModGlossaryHelper.storeFiles(
            glossary.id,
            data.concept,
            timecreated,
            data.attachments,
        );

        return result;
    }

    /**
     * Create an offline entry.
     *
     * @param glossary Glossary.
     * @param timecreated Time created.
     * @param uploadedAttachments Uploaded attachments.
     */
    protected async createOfflineEntry(
        glossary: AddonModGlossaryGlossary,
        timecreated: number,
        uploadedAttachments?: CoreFileUploaderStoreFilesResult,
    ): Promise<void> {
        const data = this.page.data;
        const options = this.getSaveOptions(glossary);
        const definition = CoreTextUtils.formatHtmlLines(data.definition);

        if (!glossary.allowduplicatedentries) {
            // Check if the entry is duplicated in online or offline mode.
            const isUsed = await AddonModGlossary.isConceptUsed(glossary.id, data.concept, {
                timeCreated: data.timecreated,
                cmId: this.page.cmId,
            });

            if (isUsed) {
                // There's a entry with same name, reject with error message.
                throw new CoreError(Translate.instant('addon.mod_glossary.errconceptalreadyexists'));
            }
        }

        await AddonModGlossaryOffline.addOfflineEntry(
            glossary.id,
            data.concept,
            definition,
            this.page.courseId,
            options,
            uploadedAttachments,
            timecreated,
            undefined,
            undefined,
            data,
        );
    }

    /**
     * Create an online entry.
     *
     * @param glossary Glossary.
     * @param timecreated Time created.
     * @param uploadedAttachmentsId Id of the uploaded attachments.
     * @param allowOffline Allow falling back to creating the entry offline.
     * @returns Entry id.
     */
    protected async createOnlineEntry(
        glossary: AddonModGlossaryGlossary,
        timecreated: number,
        uploadedAttachmentsId?: number,
        allowOffline?: boolean,
    ): Promise<number | false> {
        const data = this.page.data;
        const options = this.getSaveOptions(glossary);
        const definition = CoreTextUtils.formatHtmlLines(data.definition);
        const entryId = await AddonModGlossary.addEntry(
            glossary.id,
            data.concept,
            definition,
            this.page.courseId,
            options,
            uploadedAttachmentsId,
            {
                timeCreated: timecreated,
                discardEntry: data,
                allowOffline: allowOffline,
                checkDuplicates: !glossary.allowduplicatedentries,
            },
        );

        return entryId;
    }

    /**
     * Get additional options to save an entry.
     *
     * @param glossary Glossary.
     * @returns Options.
     */
    protected getSaveOptions(glossary: AddonModGlossaryGlossary): Record<string, AddonModGlossaryEntryOption> {
        const data = this.page.data;
        const options: Record<string, AddonModGlossaryEntryOption> = {
            aliases: data.aliases,
            categories: data.categories.join(','),
        };

        if (glossary.usedynalink) {
            options.usedynalink = data.usedynalink ? 1 : 0;

            if (data.usedynalink) {
                options.casesensitive = data.casesensitive ? 1 : 0;
                options.fullmatch = data.fullmatch ? 1 : 0;
            }
        }

        return options;
    }

}

/**
 * Helper to manage the form data for creating a new entry.
 */
class AddonModGlossaryNewFormHandler extends AddonModGlossaryFormHandler {

    /**
     * @inheritdoc
     */
    async loadData(): Promise<void> {
        // There is no data to load, given that this is a new entry.
    }

    /**
     * @inheritdoc
     */
    async save(glossary: AddonModGlossaryGlossary): Promise<boolean> {
        const data = this.page.data;
        const timecreated = Date.now();

        // Upload attachments first if any.
        let onlineAttachments: number | undefined = undefined;
        let offlineAttachments: CoreFileUploaderStoreFilesResult | undefined = undefined;

        if (data.attachments.length) {
            try {
                onlineAttachments = await this.uploadAttachments(glossary);
            } catch (error) {
                if (CoreUtils.isWebServiceError(error)) {
                    throw error;
                }

                offlineAttachments = await this.storeAttachments(glossary, timecreated);
            }
        }

        // Save entry data.
        const entryId = offlineAttachments
            ? await this.createOfflineEntry(glossary, timecreated, offlineAttachments)
            : await this.createOnlineEntry(glossary, timecreated, onlineAttachments, !data.attachments.length);

        // Delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(data.attachments);

        if (entryId) {
            // Data sent to server, delete stored files (if any).
            AddonModGlossaryHelper.deleteStoredFiles(glossary.id, data.concept, timecreated);
            CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'glossary' });
        }

        CoreEvents.trigger(AddonModGlossaryProvider.ADD_ENTRY_EVENT, {
            glossaryId: glossary.id,
            entryId: entryId || undefined,
        }, CoreSites.getCurrentSiteId());

        return !!entryId;
    }

}

/**
 * Form data.
 */
type AddonModGlossaryFormData = {
    concept: string;
    definition: string;
    timecreated: number;
    attachments: CoreFileEntry[];
    categories: string[];
    aliases: string;
    usedynalink: boolean;
    casesensitive: boolean;
    fullmatch: boolean;
};
