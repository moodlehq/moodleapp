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

import {
    AfterViewInit,
    Component,
    CUSTOM_ELEMENTS_SCHEMA,
    ElementRef,
    OnDestroy,
    Type,
    ViewChild,
    OnInit,
    Input,
    Output,
    EventEmitter,
    inject,
} from '@angular/core';
import { IonContent } from '@ionic/angular';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { CoreEditorBaseComponent } from '@features/editor/classes/base-editor-component';
import { CoreEventFormActionData, CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreWait } from '@singletons/wait';
import { CoreDom } from '@singletons/dom';
import { ContextLevel } from '@/core/constants';
import { FormControl } from '@angular/forms';
import { toBoolean } from '@/core/transforms/boolean';
import { Subscription } from 'rxjs';
import { CoreSites } from '@services/sites';
import { CoreEditorService } from '@features/editor/services/editor';
import { CoreEditorOffline } from '@features/editor/services/editor-offline';
import { CoreEditorDraft } from '@features/editor/services/database/editor';
import { NgZone } from '@singletons';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@singletons/utils';
import { CoreFilepool } from '@services/filepool';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreToasts } from '@services/overlays/toasts';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';

/**
 * Component that displays a rich text editor.
 *
 * Example:
 * <core-rich-text-editor [control]="control" [placeholder]="field.name"></core-rich-text-editor>
 */
@Component({
    selector: 'core-rich-text-editor',
    templateUrl: 'core-rich-text-editor.html',
    styleUrl: 'rich-text-editor.scss',
    imports: [
        CoreSharedModule,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CoreEditorRichTextEditorComponent implements AfterViewInit, OnDestroy, OnInit {

    private static readonly MIN_HEIGHT = 200; // Minimum height of the editor.
    private static readonly DRAFT_AUTOSAVE_FREQUENCY = 30000;

    @Input() placeholder = ''; // Placeholder to set in textarea.
    @Input() control?: FormControl<string | undefined | null>; // Form control.
    @Input() name = 'core-rich-text-editor'; // Name to set to the textarea.
    @Input() component?: string; // The component to link the files to.
    @Input() componentId?: number; // An ID to use in conjunction with the component.
    @Input({ transform: toBoolean }) autoSave = true; // Whether to auto-save the contents in a draft.
    @Input() contextLevel?: ContextLevel; // The context level of the text.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() elementId?: string; // An ID to set to the element.
    @Input() draftExtraParams?: Record<string, unknown>; // Extra params to identify the draft.
    @Output() contentChanged: EventEmitter<string | undefined | null> = new EventEmitter();

    @ViewChild(CoreDynamicComponent) dynamicComponent!: CoreDynamicComponent<CoreEditorBaseComponent>;

    protected keyboardObserver?: CoreEventObserver;
    protected resizeListener?: CoreEventObserver;
    protected editorComponentClass?: Type<CoreEditorBaseComponent>;
    protected editorComponentData: Record<string, unknown> = {};
    protected controlSubscription?: Subscription;
    protected labelObserver?: MutationObserver;
    protected setContentId = 0;

    // Autosave.
    protected pageInstance: string;
    protected lastDraft = '';
    protected draftWasRestored = false;
    protected originalContent?: string;
    protected autoSaveInterval?: number;
    protected resetObserver?: CoreEventObserver;
    protected element: HTMLElement = inject(ElementRef).nativeElement;

    protected content = inject(IonContent);

    constructor() {
         // Generate a "unique" ID based on timestamp.
        this.pageInstance = `app_${Date.now()}`;
    }

    /**
     * Clear the text.
     */
    clearText(): void {
        this.setContent('');

        // Don't emit event so our valueChanges doesn't get notified by this change.
        this.control?.setValue(null, { emitEvent: false });
        this.contentChanged.emit(null);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.editorComponentClass = await CoreEditorService.getEditorComponentClass();
        this.editorComponentData = {
            name: this.name,
            placeholder: this.placeholder,
            component: this.component,
            componentId: this.componentId,
            contextLevel: this.contextLevel,
            contextInstanceId: this.contextInstanceId,
            onChange: this.onChange.bind(this),
        };
    }

    /**
     * Called when the editor content changes.
     *
     * @param content New content.
     */
    protected onChange(content: string): void {
        // Execute the callback in the Angular zone, so change detection doesn't stop working.
        NgZone.run(() => {
            if (CoreDom.htmlIsBlank(content)) {
                this.control?.setValue(null, { emitEvent: false });
                this.contentChanged.emit(null);
            } else {
                const container = document.createElement('template');
                container.innerHTML = content;
                this.restoreExternalContent(container.content);
                content = container.innerHTML;
                this.control?.setValue(content, { emitEvent: false });
                this.control?.markAsDirty();
                this.contentChanged.emit(content);
            }
        });
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        if (this.elementId) {
            // Prepend elementId with 'id_' like in web. Don't use a setter for this because the value shouldn't change.
            this.elementId = 'id_' + this.elementId;
            this.element.setAttribute('id', this.elementId);
        }

        this.maximizeEditorSize();

        this.setupIonItem();

        this.setContent(this.control?.value ?? '');

        if (this.shouldAutoSaveDrafts()) {
            this.restoreDraft();
            this.autoSaveDrafts();
            this.deleteDraftOnSubmitOrCancel();
        }

        this.resizeListener = CoreDom.onWindowResize(() => {
            this.onWindowResize();
        }, 50);

        this.controlSubscription = this.control?.valueChanges.subscribe((newValue) => {
            this.onControlValueChange(newValue);
        });

        // Opening or closing the keyboard also calls the resize function, but sometimes the resize is called too soon.
        // Check the height again, now the window height should have been updated.
        this.keyboardObserver = CoreEvents.on(CoreEvents.KEYBOARD_CHANGE, () => {
            this.maximizeEditorSize();
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.resizeListener?.off();
        this.keyboardObserver?.off();
        this.controlSubscription?.unsubscribe();
        this.resetObserver?.off();
        this.labelObserver?.disconnect();
        clearInterval(this.autoSaveInterval);
    }

    /**
     * @inheritdoc
     */
    async onWindowResize(): Promise<void> {
        await CoreWait.waitForResizeDone();

        await this.maximizeEditorSize();

        // Call onResize on editor implementation once it is loaded.
        await this.dynamicComponent.ready();
        await this.dynamicComponent.callComponentMethod('onResize');
    }

    /**
     * Handles changes of the control value.
     *
     * @param newValue New value.
     */
    protected onControlValueChange(newValue: string | null | undefined): void {
        if (this.draftWasRestored && this.originalContent === newValue) {
            // A draft was restored and the content hasn't changed in the site. Use the draft value instead of this one.
            this.control?.setValue(this.lastDraft, { emitEvent: false });
            this.contentChanged.emit(this.lastDraft);

            return;
        }

        // Apply the new content.
        this.setContent(newValue ?? '');
        this.originalContent = newValue ?? undefined;

        // Save a draft so the original content is saved.
        this.lastDraft = newValue ?? '';
        CoreEditorOffline.saveDraft(
            this.contextLevel || ContextLevel.SYSTEM,
            this.contextInstanceId || 0,
            this.elementId || '',
            this.draftExtraParams || {},
            this.pageInstance,
            this.lastDraft,
            this.originalContent,
        );
    }

    /**
     * Check if should auto save drafts.
     *
     * @returns Whether it should auto save drafts.
     */
    protected shouldAutoSaveDrafts(): boolean {
        return !!CoreSites.getCurrentSite() &&
                this.autoSave &&
                this.contextLevel !== undefined &&
                this.contextInstanceId !== undefined &&
                this.elementId !== undefined;
    }

    /**
     * Restore a draft if there is any.
     *
     * @returns Promise resolved when done.
     */
    protected async restoreDraft(): Promise<void> {
        let entry: CoreEditorDraft | undefined;
        try {
            entry = await CoreEditorOffline.resumeDraft(
                this.contextLevel || ContextLevel.SYSTEM,
                this.contextInstanceId || 0,
                this.elementId || '',
                this.draftExtraParams || {},
                this.pageInstance,
                this.originalContent,
            );
        } catch {
            // Ignore errors, shouldn't happen.
        }

        if (entry === undefined) {
            // No draft found.
            return;
        }

        let draftText = entry.drafttext ?? '';

        // Revert untouched editor contents to an empty string.
        if (CoreDom.htmlIsBlank(draftText)) {
            draftText = '';
        }

        if (draftText !== '' && this.control && draftText != this.control.value) {
            // Restore the draft.
            this.setContent(draftText);
            this.control.setValue(draftText, { emitEvent: false });
            this.contentChanged.emit(draftText);
            this.lastDraft = draftText;
            this.draftWasRestored = true;
            this.originalContent = entry.originalcontent;

            if (entry.drafttext != entry.originalcontent) {
                // Notify the user.
                CoreToasts.show({
                    message: 'core.editor.textrecovered',
                    translateMessage: true,
                });
            }
        }

    }

    /**
     * Automatically save drafts every certain time.
     */
    protected autoSaveDrafts(): void {
        this.autoSaveInterval = window.setInterval(async () => {
            if (!this.control) {
                return;
            }

            const newText = this.control.value ?? '';

            if (this.lastDraft === newText) {
                // Text hasn't changed, nothing to save.
                return;
            }

            try {
                await CoreEditorOffline.saveDraft(
                    this.contextLevel || ContextLevel.SYSTEM,
                    this.contextInstanceId || 0,
                    this.elementId || '',
                    this.draftExtraParams || {},
                    this.pageInstance,
                    newText,
                    this.originalContent,
                );

                // Draft saved, notify the user.
                this.lastDraft = newText;
                CoreToasts.show({
                    message: 'core.editor.autosavesucceeded',
                    translateMessage: true,
                });
            } catch {
                // Error saving draft.
            }
        }, CoreEditorRichTextEditorComponent.DRAFT_AUTOSAVE_FREQUENCY);
    }

    /**
     * Delete the draft when the form is submitted or cancelled.
     */
    protected deleteDraftOnSubmitOrCancel(): void {
        this.resetObserver = CoreEvents.on(CoreEvents.FORM_ACTION, async (data: CoreEventFormActionData) => {
            const form = this.element.closest('form');

            if (data.form && form && data.form === form) {
                try {
                    await CoreEditorOffline.deleteDraft(
                        this.contextLevel || ContextLevel.SYSTEM,
                        this.contextInstanceId || 0,
                        this.elementId || '',
                        this.draftExtraParams || {},
                    );
                } catch {
                    // Error deleting draft. Shouldn't happen.
                }
            }
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * Resize editor to maximize the space occupied.
     */
    protected async maximizeEditorSize(): Promise<void> {
        await this.waitLoadingsDone();

        // Editor is ready, adjust Height if needed.
        const blankHeight = await this.getBlankHeightInContent();
        const newHeight = blankHeight + this.element.getBoundingClientRect().height;

        if (newHeight > CoreEditorRichTextEditorComponent.MIN_HEIGHT) {
            this.element.style.setProperty('--core-rte-height', `${newHeight - 1}px`);
        } else {
            this.element.style.removeProperty('--core-rte-height');
        }
    }

    /**
     * Get the height of the space in blank at the end of the page.
     *
     * @returns Blank height in px. Will be negative if no blank space.
     */
    protected async getBlankHeightInContent(): Promise<number> {
        await CoreDom.waitToBeInDOM(this.element);
        await CoreWait.nextTicks(10);

        let content: Element | null = this.element.closest('ion-content');
        const contentHeight = await CoreDom.getContentHeight(this.content);

        // Get first children with content, not fixed.
        let scrollContentHeight = 0;
        if (content) {
            while (scrollContentHeight === 0 && content?.children) {
                const children = Array.from(content.children)
                    .filter((element) => element.slot !== 'fixed' && !element.classList.contains('core-loading-container'));

                scrollContentHeight = children
                    .map((element) => element.getBoundingClientRect().height)
                    .reduce((a, b) => a + b, 0);

                content = children[0];
            }
        }

        return contentHeight - scrollContentHeight;
    }

    /**
     * Set the content of the editor.
     *
     * @param content Content to set.
     */
    protected async setContent(content: string): Promise<void> {
        const id = ++this.setContentId;
        const container = convertTextToHTMLElement(content);

        // Update tags for a11y.
        CoreDom.replaceTags(container, ['b', 'i'], ['strong', 'em']);

        try {
            await this.treatExternalContent(container);
        } finally {
            // Set content on once the editor implementation is ready.
            await this.dynamicComponent.ready();

            // Only set the content if the function was not called again while treating external content.
            if (id === this.setContentId) {
                this.dynamicComponent.callComponentMethod('setContent', container.innerHTML);
            }
        }
    }

    /**
     * Treat elements that can contain external content.
     * We only search for images because the editor should receive unfiltered text, so the multimedia filter won't be applied.
     * Treating videos and audios in here is complex, so if a user manually adds one he won't be able to play it in the editor.
     *
     * @param container Container with the content to treat.
     */
    protected async treatExternalContent(container: HTMLElement): Promise<void> {
        if (!CoreSites.isLoggedIn()) {
            // Only treat external content if the user is logged in.
            return;
        }

        const elements = Array.from(container.querySelectorAll('img'));
        const site = CoreSites.getCurrentSite();
        const siteId = CoreSites.getCurrentSiteId();
        const canDownloadFiles = !site || site.canDownloadFiles();
        const promises = elements.map(async (el) => {
            if (el.getAttribute('data-original-src')) {
                // Already treated.
                return;
            }

            const url = el.src;

            if (!url || !CoreUrl.isDownloadableUrl(url) || (!canDownloadFiles && site?.isSitePluginFileUrl(url))) {
                // Nothing to treat.
                return;
            }

            // Check if it's downloaded.
            const finalUrl = await CoreFilepool.getSrcByUrl(siteId, url, this.component, this.componentId);

            // Check again if it's already treated, this function can be called concurrently more than once.
            if (!el.getAttribute('data-original-src')) {
                el.setAttribute('data-original-src', el.src);
                el.setAttribute('src', finalUrl);
            }
        });

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Reverts changes made by treatExternalContent.
     *
     * @param container Container with the content to restore.
     */
    protected restoreExternalContent(container: DocumentFragment): void {
        if (!CoreSites.isLoggedIn()) {
            // Only treat external content if the user is logged in.
            return;
        }

        const elements = Array.from(container.querySelectorAll('img'));
        elements.forEach((el) => {
            const originalUrl = el.getAttribute('data-original-src');
            if (originalUrl) {
                el.setAttribute('src', originalUrl);
                el.removeAttribute('data-original-src');
            }
        });
    }

    /**
     * Wait until all <core-loading> children inside the page.
     *
     * @returns Promise resolved when loadings are done.
     */
    protected async waitLoadingsDone(): Promise<void> {
        const page = this.element.closest('.ion-page');
        if (!page) {
            return;
        }

        await CoreDirectivesRegistry.waitDirectivesReady(page, 'core-loading', CoreLoadingComponent);
    }

    /**
     * Setup Ion Item adding classes and managing aria-labelledby.
     */
    protected setupIonItem(): void {
        const ionItem = this.element.closest<HTMLIonItemElement>('ion-item');
        if (!ionItem) {
            return;
        }
        ionItem.classList.add('item-rte');

        const label = ionItem.querySelector('ion-label');
        if (!label) {
            return;
        }

        const updateArialabelledBy = async () => {
            await this.dynamicComponent.ready();
            this.editorComponentData.ariaLabelledBy = label.getAttribute('id') ?? undefined;
        };

        this.labelObserver = new MutationObserver(updateArialabelledBy);
        this.labelObserver.observe(label, { attributes: true, attributeFilter: ['id'] });

        // Usually the label won't have an id, so we need to add one.
        if (!label.getAttribute('id')) {
            label.setAttribute('id', 'rte-' + CoreUtils.getUniqueId('CoreEditorRichTextEditor'));
        }

        updateArialabelledBy();
    }

}
