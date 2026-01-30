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

import { Component, OnInit, ElementRef, inject, viewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CoreError } from '@classes/errors/error';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CanLeave } from '@guards/can-leave';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreText } from '@static/text';
import { CoreWSError } from '@classes/errors/wserror';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreForms } from '@static/form';
import {
    AddonModGlossary,
    AddonModGlossaryCategory,
    AddonModGlossaryEntry,
    AddonModGlossaryEntryOption,
    AddonModGlossaryGlossary,
} from '../../services/glossary';
import { AddonModGlossaryHelper } from '../../services/glossary-helper';
import { AddonModGlossaryOffline } from '../../services/glossary-offline';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { ADDON_MOD_GLOSSARY_COMPONENT_LEGACY } from '../../constants';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreEditorRichTextEditorComponent } from '@features/editor/components/rich-text-editor/rich-text-editor';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the edit form.
 */
@Component({
    selector: 'page-addon-mod-glossary-edit',
    templateUrl: 'edit.html',
    imports: [
        CoreSharedModule,
        CoreEditorRichTextEditorComponent,
    ],
})
export default class AddonModGlossaryEditPage implements OnInit, CanLeave {

    readonly formElement = viewChild<ElementRef>('editFormEl');

    component = ADDON_MOD_GLOSSARY_COMPONENT_LEGACY;
    cmId!: number;
    courseId!: number;
    loaded = false;
    glossary?: AddonModGlossaryGlossary;
    definitionControl = new FormControl<string | null>(null);
    categories: AddonModGlossaryCategory[] = [];
    showAliases = true;
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

    protected entry?: AddonModGlossaryEntry;
    protected syncId?: string;
    protected syncObserver?: CoreEventObserver;
    protected isDestroyed = false;
    protected saved = false;
    protected route = inject(ActivatedRoute);

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            const entrySlug = CoreNavigator.getRouteParam<string>('entrySlug');
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');

            if (entrySlug?.startsWith('new-')) {
                const timecreated = Number(entrySlug.slice(4));
                this.editorExtraParams.timecreated = timecreated;
                this.handler = new AddonModGlossaryOfflineFormHandler(this, timecreated);
            } else if (entrySlug) {
                // Get the entry content unfiltered to edit it.
                const { entry } = await AddonModGlossary.getEntry(Number(entrySlug), {
                    readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                    filter: false,
                });

                this.entry = entry;
                this.editorExtraParams.timecreated = entry.timecreated;
                this.handler = new AddonModGlossaryOnlineFormHandler(this, entry);
            } else {
                this.handler = new AddonModGlossaryNewFormHandler(this);
            }
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

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

            this.loaded = true;

            if (this.handler instanceof AddonModGlossaryOfflineFormHandler) {
                return;
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_glossary_get_glossaries_by_courses',
                name: this.glossary.name,
                data: { id: this.glossary.id, category: 'glossary' },
                url: '/mod/glossary/edit.php' + (this.entry ? `?cmid=${this.cmId}&id=${this.entry.id}` : ''),
            });
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_glossary.errorloadingglossary') });
            CoreNavigator.back();
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
    onDefinitionChange(text?: string | null): void {
        this.data.definition = text ?? '';
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
            await CoreAlerts.confirmLeaveWithChanges();
        }

        // Delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(this.data.attachments);

        CoreForms.triggerFormCancelledEvent(this.formElement(), CoreSites.getCurrentSiteId());

        return true;
    }

    /**
     * Save the entry.
     */
    async save(): Promise<void> {
        if (!this.data.concept || !this.data.definition) {
            CoreAlerts.showError(Translate.instant('addon.mod_glossary.fillfields'));

            return;
        }

        if (!this.glossary) {
            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            const savedOnline = await this.handler.save(this.glossary);

            this.saved = true;

            CoreForms.triggerFormSubmittedEvent(this.formElement(), savedOnline, CoreSites.getCurrentSiteId());

            CoreNavigator.back();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_glossary.cannoteditentry') });
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
     * Load form categories.
     *
     * @param glossary Glossary.
     */
    protected async loadCategories(glossary: AddonModGlossaryGlossary): Promise<void> {
        this.page.categories = await AddonModGlossary.getAllCategories(glossary.id, {
            cmId: this.page.cmId,
        });
    }

    /**
     * Upload attachments online.
     *
     * @param glossary Glossary.
     * @returns Uploaded attachments item id, undefined if nothing to upload or change.
     */
    protected async uploadAttachments(glossary: AddonModGlossaryGlossary): Promise<number | undefined> {
        const data = this.page.data;
        const itemId = await CoreFileUploader.uploadOrReuploadFiles(
            data.attachments,
            ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
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
     * Make sure that the new entry won't create any duplicates.
     *
     * @param glossary Glossary.
     */
    protected async checkDuplicates(glossary: AddonModGlossaryGlossary): Promise<void> {
        if (glossary.allowduplicatedentries) {
            return;
        }

        const data = this.page.data;
        const isUsed = await AddonModGlossary.isConceptUsed(glossary.id, data.concept, {
            timeCreated: data.timecreated,
            cmId: this.page.cmId,
        });

        if (isUsed) {
            // There's a entry with same name, reject with error message.
            throw new CoreError(Translate.instant('addon.mod_glossary.errconceptalreadyexists'));
        }
    }

    /**
     * Get additional options to save an entry.
     *
     * @param glossary Glossary.
     * @returns Options.
     */
    protected getSaveOptions(glossary: AddonModGlossaryGlossary): Record<string, AddonModGlossaryEntryOption> {
        const data = this.page.data;
        const options: Record<string, AddonModGlossaryEntryOption> = {};

        if (this.page.showAliases) {
            options.aliases = data.aliases;
        }

        if (this.page.categories.length > 0) {
            options.categories = data.categories.join(',');
        }

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
 * Helper to manage the form data for an offline entry.
 */
class AddonModGlossaryOfflineFormHandler extends AddonModGlossaryFormHandler {

    private timecreated: number;

    constructor(page: AddonModGlossaryEditPage, timecreated: number) {
        super(page);

        this.timecreated = timecreated;
    }

    /**
     * @inheritdoc
     */
    async loadData(glossary: AddonModGlossaryGlossary): Promise<void> {
        const data = this.page.data;
        const entry = await AddonModGlossaryOffline.getOfflineEntry(glossary.id, this.timecreated);

        data.concept = entry.concept || '';
        data.definition = entry.definition || '';
        data.timecreated = entry.timecreated;

        if (entry.options) {
            data.categories = ((entry.options.categories as string)?.split(',') ?? []).map(id => Number(id));
            data.aliases = entry.options.aliases as string ?? '';
            data.usedynalink = !!entry.options.usedynalink;

            if (data.usedynalink) {
                data.casesensitive = !!entry.options.casesensitive;
                data.fullmatch = !!entry.options.fullmatch;
            }
        }

        // Treat offline attachments if any.
        if (entry.attachments?.offline) {
            data.attachments = await AddonModGlossaryHelper.getStoredFiles(glossary.id, entry.concept, entry.timecreated);
        }

        this.page.originalData = {
            concept: data.concept,
            definition: data.definition,
            attachments: data.attachments.slice(),
            timecreated: data.timecreated,
            categories: data.categories.slice(),
            aliases: data.aliases,
            usedynalink: data.usedynalink,
            casesensitive: data.casesensitive,
            fullmatch: data.fullmatch,
        };

        this.page.definitionControl.setValue(data.definition);

        await this.loadCategories(glossary);
    }

    /**
     * @inheritdoc
     */
    async save(glossary: AddonModGlossaryGlossary): Promise<boolean> {
        const originalData = this.page.data;
        const data = this.page.data;

        // Upload attachments first if any.
        let offlineAttachments: CoreFileUploaderStoreFilesResult | undefined = undefined;

        if (data.attachments.length) {
            offlineAttachments = await this.storeAttachments(glossary, data.timecreated);
        }

        if (originalData.concept !== data.concept) {
            await AddonModGlossaryHelper.deleteStoredFiles(glossary.id, originalData.concept, data.timecreated);
        }

        // Save entry data.
        await this.updateOfflineEntry(glossary, offlineAttachments);

        // Delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(data.attachments);

        return false;
    }

    /**
     * Update an offline entry.
     *
     * @param glossary Glossary.
     * @param uploadedAttachments Uploaded attachments.
     */
    protected async updateOfflineEntry(
        glossary: AddonModGlossaryGlossary,
        uploadedAttachments?: CoreFileUploaderStoreFilesResult,
    ): Promise<void> {
        const originalData = this.page.originalData;
        const data = this.page.data;
        const options = this.getSaveOptions(glossary);
        const definition = CoreText.formatHtmlLines(data.definition);

        if (!originalData) {
            return;
        }

        await this.checkDuplicates(glossary);
        await AddonModGlossaryOffline.updateOfflineEntry(
            {
                glossaryid: glossary.id,
                courseid: this.page.courseId,
                concept: originalData.concept,
                timecreated: originalData.timecreated,
            },
            data.concept,
            definition,
            options,
            uploadedAttachments,
        );
    }

}

/**
 * Helper to manage the form data for creating a new entry.
 */
class AddonModGlossaryNewFormHandler extends AddonModGlossaryFormHandler {

    /**
     * @inheritdoc
     */
    async loadData(glossary: AddonModGlossaryGlossary): Promise<void> {
        await this.loadCategories(glossary);
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
                if (CoreWSError.isWebServiceError(error)) {
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

        return !!entryId;
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
        const definition = CoreText.formatHtmlLines(data.definition);

        await this.checkDuplicates(glossary);
        await AddonModGlossaryOffline.addOfflineEntry(
            glossary.id,
            data.concept,
            definition,
            this.page.courseId,
            timecreated,
            options,
            uploadedAttachments,
            undefined,
            undefined,
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
        const definition = CoreText.formatHtmlLines(data.definition);
        const entryId = await AddonModGlossary.addEntry(
            glossary.id,
            data.concept,
            definition,
            this.page.courseId,
            options,
            uploadedAttachmentsId,
            {
                timeCreated: timecreated,
                allowOffline: allowOffline,
                checkDuplicates: !glossary.allowduplicatedentries,
            },
        );

        return entryId;
    }

}

/**
 * Helper to manage the form data for an online entry.
 */
class AddonModGlossaryOnlineFormHandler extends AddonModGlossaryFormHandler {

    private entry: AddonModGlossaryEntry;

    constructor(page: AddonModGlossaryEditPage, entry: AddonModGlossaryEntry) {
        super(page);

        this.entry = entry;
    }

    /**
     * @inheritdoc
     */
    async loadData(): Promise<void> {
        const data = this.page.data;

        data.concept = this.entry.concept;
        data.definition = CoreFileHelper.replacePluginfileUrls(
            this.entry.definition,
            this.entry.definitioninlinefiles || [],
        );
        data.timecreated = this.entry.timecreated;
        data.usedynalink = this.entry.usedynalink;

        if (data.usedynalink) {
            data.casesensitive = this.entry.casesensitive;
            data.fullmatch = this.entry.fullmatch;
        }

        data.attachments = (this.entry.attachments ?? []).slice();

        this.page.originalData = {
            concept: data.concept,
            definition: data.definition,
            attachments: data.attachments.slice(),
            timecreated: data.timecreated,
            categories: data.categories.slice(),
            aliases: data.aliases,
            usedynalink: data.usedynalink,
            casesensitive: data.casesensitive,
            fullmatch: data.fullmatch,
        };

        this.page.definitionControl.setValue(data.definition);
        this.page.showAliases = false;
    }

    /**
     * @inheritdoc
     */
    async save(glossary: AddonModGlossaryGlossary): Promise<boolean> {
        if (!CoreNetwork.isOnline()) {
            throw new CoreNetworkError();
        }

        const data = this.page.data;
        const options = this.getSaveOptions(glossary);
        const definition = CoreText.formatHtmlLines(CoreFileHelper.restorePluginfileUrls(
            data.definition,
            this.entry.definitioninlinefiles || [],
        ));

        // Upload attachments, if any.
        const attachmentsId = await this.uploadAttachments();

        // Save entry data.
        await AddonModGlossary.updateEntry(glossary.id, this.entry.id, data.concept, definition, options, attachmentsId);

        // Delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(data.attachments);

        CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'glossary' });

        return true;
    }

    /**
     * Upload attachments online.
     *
     * @returns Uploaded attachments item id, undefined if nothing to upload or change.
     */
    protected async uploadAttachments(): Promise<number | undefined> {
        const data = this.page.data;

        if (!CoreFileUploader.areFileListDifferent(data.attachments, this.entry.attachments ?? [])) {
            return;
        }

        const { attachmentsid: attachmentsId } = await AddonModGlossary.prepareEntryForEdition(this.entry.id);

        const removedFiles = CoreFileUploader.getFilesToDelete(this.entry.attachments ?? [], data.attachments);

        if (removedFiles.length) {
            await CoreFileUploader.deleteDraftFiles(attachmentsId, removedFiles);
        }

        await CoreFileUploader.uploadFiles(attachmentsId, data.attachments);

        return attachmentsId;
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
    categories: number[];
    aliases: string;
    usedynalink: boolean;
    casesensitive: boolean;
    fullmatch: boolean;
};
