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
    Component,
    Input,
    Output,
    EventEmitter,
    ViewChild,
    ElementRef,
    OnInit,
    OnDestroy,
    Optional,
    AfterViewInit,
    CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { IonTextarea, IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CoreSites } from '@services/sites';
import { CoreFilepool } from '@services/filepool';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@singletons/utils';
import { CoreEventFormActionData, CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreEditorOffline } from '../../services/editor-offline';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreScreen } from '@services/screen';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreDom } from '@singletons/dom';
import { CorePlatform } from '@services/platform';
import { Swiper } from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { ContextLevel } from '@/core/constants';
import { CoreSwiper } from '@singletons/swiper';
import { CoreWait } from '@singletons/wait';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreQRScan } from '@services/qrscan';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to display a rich text editor if enabled.
 *
 * If enabled, this component will show a rich text editor. Otherwise it'll show a regular textarea.
 *
 * Example:
 * <core-rich-text-editor [control]="control" [placeholder]="field.name"></core-rich-text-editor>
 */
@Component({
    selector: 'core-rich-text-editor',
    templateUrl: 'core-editor-rich-text-editor.html',
    styleUrl: 'rich-text-editor.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CoreEditorRichTextEditorComponent implements OnInit, AfterViewInit, OnDestroy {

    // Based on: https://github.com/judgewest2000/Ionic3RichText/
    // @todo Anchor button, fullscreen...
    // @todo Textarea height is not being updated when editor is resized. Height is calculated if any css is changed.
    // @todo Implement ControlValueAccessor https://angular.io/api/forms/ControlValueAccessor.

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
    @Output() contentChanged: EventEmitter<string | undefined | null>;

    protected editorElement?: HTMLDivElement; // WYSIWYG editor.
    @ViewChild('editor') editor?: ElementRef<HTMLDivElement>;

    @ViewChild('toolbar') toolbar?: ElementRef<HTMLDivElement>;

    protected textareaElement?: HTMLTextAreaElement;
    @ViewChild('textarea') textarea?: IonTextarea; // Textarea editor.

    protected toolbarSlides?: Swiper;
    @ViewChild('swiperRef') set swiperRef(swiperRef: ElementRef) {
        /**
         * This setTimeout waits for Ionic's async initialization to complete.
         * Otherwise, an outdated swiper reference will be used.
         */
        setTimeout(async () => {
            await this.waitLoadingsDone();

            const swiper = CoreSwiper.initSwiperIfAvailable(this.toolbarSlides, swiperRef, this.swiperOpts);
            if (!swiper) {
                return;
            }

            this.toolbarSlides = swiper;
        });
    }

    protected readonly DRAFT_AUTOSAVE_FREQUENCY = 30000;
    protected readonly RESTORE_MESSAGE_CLEAR_TIME = 6000;
    protected readonly SAVE_MESSAGE_CLEAR_TIME = 2000;

    protected element: HTMLElement;
    protected minHeight = 200; // Minimum height of the editor.

    protected valueChangeSubscription?: Subscription;
    protected keyboardObserver?: CoreEventObserver;
    protected resetObserver?: CoreEventObserver;
    protected labelObserver?: MutationObserver;
    protected contentObserver?: MutationObserver;
    protected initHeightInterval?: number;
    protected isCurrentView = true;
    protected toolbarButtonWidth = 44;
    protected toolbarArrowWidth = 44;
    protected pageInstance: string;
    protected autoSaveInterval?: number;
    protected hideMessageTimeout?: number;
    protected lastDraft = '';
    protected draftWasRestored = false;
    protected originalContent?: string;
    protected resizeFunction?: () => Promise<number>;
    protected selectionChangeFunction = (): void => this.updateToolbarStyles();
    protected resizeListener?: CoreEventObserver;
    protected domPromise?: CoreCancellablePromise<void>;
    protected buttonsDomPromise?: CoreCancellablePromise<void>;
    protected shortcutCommands?: Record<string, EditorCommand>;
    protected blurTimeout?: number;

    rteEnabled = false;
    isPhone = false;
    toolbarHidden = false;
    toolbarArrows = false;
    toolbarPrevHidden = true;
    toolbarNextHidden = false;
    canScanQR = false;
    ariaLabelledBy?: string;
    infoMessage?: string;
    toolbarStyles = {
        strong: 'false',
        b: 'false',
        em: 'false',
        i: 'false',
        u: 'false',
        strike: 'false',
        p: 'false',
        h3: 'false',
        h4: 'false',
        h5: 'false',
        ul: 'false',
        ol: 'false',
    };

    isEmpty = true;

    swiperOpts: SwiperOptions = {
        slidesPerView: 6,
        centerInsufficientSlides: true,
        watchSlidesProgress: true,
    };

    constructor(
        @Optional() protected content: IonContent,
        elementRef: ElementRef,
    ) {
        this.contentChanged = new EventEmitter<string>();
        this.element = elementRef.nativeElement;
        this.pageInstance = `app_${Date.now()}`; // Generate a "unique" ID based on timestamp.
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.canScanQR = CoreQRScan.canScanQR();
        this.isPhone = CoreScreen.isMobile;
        this.toolbarHidden = this.isPhone;
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        this.rteEnabled = await CoreDomUtils.isRichTextEditorEnabled();

        await this.waitLoadingsDone();

        // Setup the editor.
        this.editorElement = this.editor?.nativeElement as HTMLDivElement;
        this.textareaElement = await this.textarea?.getInputElement();
        this.setContent(this.control?.value);
        this.originalContent = this.control?.value ?? undefined;
        this.lastDraft = this.control?.value ?? '';

        // Use paragraph on enter.
        // eslint-disable-next-line deprecation/deprecation
        document.execCommand('DefaultParagraphSeparator', false, 'p');

        this.maximizeEditorSize();

        this.setListeners();
        this.updateToolbarButtons();

        if (this.elementId) {
            // Prepend elementId with 'id_' like in web. Don't use a setter for this because the value shouldn't change.
            this.elementId = `id_${this.elementId}`;
            this.element.setAttribute('id', this.elementId);
        }

        // Update tags for a11y.
        this.replaceTags(['b', 'i'], ['strong', 'em']);

        if (this.shouldAutoSaveDrafts()) {
            this.restoreDraft();

            this.autoSaveDrafts();

            this.deleteDraftOnSubmitOrCancel();
        }

        this.setupIonItem();

        if (this.editorElement) {
            const debounceMutation = CoreUtils.debounce(() => {
                this.onChange();
            }, 20);

            this.contentObserver = new MutationObserver(debounceMutation);
            this.contentObserver.observe(this.editorElement, { childList: true, subtree: true, characterData: true });
        }
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

        const updateArialabelledBy = () => {
            this.ariaLabelledBy = label.getAttribute('id') ?? undefined;
        };

        this.labelObserver = new MutationObserver(updateArialabelledBy);
        this.labelObserver.observe(label, { attributes: true, attributeFilter: ['id'] });

        // Usually the label won't have an id, so we need to add one.
        if (!label.getAttribute('id')) {
            label.setAttribute('id', `rte-${CoreUtils.getUniqueId('CoreEditorRichTextEditor')}`);
        }

        updateArialabelledBy();
    }

    /**
     * Set listeners and observers.
     */
    protected setListeners(): void {
        // Listen for changes on the control to update the editor (if it is updated from outside of this component).
        this.valueChangeSubscription = this.control?.valueChanges.subscribe((newValue) => {
            if (this.draftWasRestored && this.originalContent === newValue) {
                // A draft was restored and the content hasn't changed in the site. Use the draft value instead of this one.
                this.control?.setValue(this.lastDraft, { emitEvent: false });

                return;
            }

            // Apply the new content.
            this.setContent(newValue);
            this.originalContent = newValue ?? undefined;
            this.infoMessage = undefined;

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
        });

        this.resizeListener = CoreDom.onWindowResize(() => {
            this.windowResized();
        }, 50);

        document.addEventListener('selectionchange', this.selectionChangeFunction);

        this.keyboardObserver = CoreEvents.on(CoreEvents.KEYBOARD_CHANGE, () => {
            // Opening or closing the keyboard also calls the resize function, but sometimes the resize is called too soon.
            // Check the height again, now the window height should have been updated.
            this.maximizeEditorSize();
        });
    }

    /**
     * Handle keydown events in the editor.
     *
     * @param event Event
     */
    onKeyDown(event: KeyboardEvent): void {
        const shortcutId = this.getShortcutId(event);
        const commands = this.getShortcutCommands();
        const command = commands[shortcutId];

        if (!command) {
            return;
        }

        this.stopBubble(event);
        this.executeCommand(command);
    }

    /**
     * Resize editor to maximize the space occupied.
     */
    protected async maximizeEditorSize(): Promise<void> {
        // Editor is ready, adjust Height if needed.
        const blankHeight = await this.getBlankHeightInContent();
        const newHeight = blankHeight + this.element.getBoundingClientRect().height;

        if (newHeight > this.minHeight) {
            this.element.style.setProperty('--core-rte-height', `${newHeight - 1}px`);
        } else {
            this.element.style.removeProperty('--core-rte-height');
        }
    }

    /**
     * Wait until all <core-loading> children inside the page.
     *
     * @returns Promise resolved when loadings are done.
     */
    protected async waitLoadingsDone(): Promise<void> {
        this.domPromise = CoreDom.waitToBeInDOM(this.element);

        await this.domPromise;

        const page = this.element.closest('.ion-page');
        if (!page) {
            return;
        }

        await CoreDirectivesRegistry.waitDirectivesReady(page, 'core-loading', CoreLoadingComponent);
    }

    /**
     * Get the height of the space in blank at the end of the page.
     *
     * @returns Blank height in px. Will be negative if no blank space.
     */
    protected async getBlankHeightInContent(): Promise<number> {
        await CoreWait.nextTicks(5); // Ensure content is completely loaded in the DOM.

        let content: Element | null = this.element.closest('ion-content');
        const contentHeight = await CoreDomUtils.getContentHeight(this.content);

        // Get first children with content, not fixed.
        let scrollContentHeight = 0;
        while (scrollContentHeight === 0 && content?.children) {
            const children = Array.from(content.children)
                .filter((element) => element.slot !== 'fixed' && !element.classList.contains('core-loading-container'));

            scrollContentHeight = children
                .map((element) => element.getBoundingClientRect().height)
                .reduce((a,b) => a + b, 0);

            content = children[0];
        }

        return contentHeight - scrollContentHeight;
    }

    /**
     * On change function to sync with form data.
     */
    onChange(): void {
        if (this.rteEnabled) {
            if (!this.editorElement) {
                return;
            }

            if (this.isNullOrWhiteSpace(this.editorElement)) {
                this.clearText();
            } else {
                // The textarea and the form control must receive the original URLs.
                this.restoreExternalContent();
                // Don't emit event so our valueChanges doesn't get notified by this change.
                this.control?.setValue(this.editorElement.innerHTML, { emitEvent: false });
                this.control?.markAsDirty();
                if (this.textarea) {
                    this.textarea.value = this.editorElement.innerHTML;
                }
                // Treat URLs again for the editor.
                this.treatExternalContent();
            }
        } else {
            if (!this.textarea) {
                return;
            }

            if (this.isNullOrWhiteSpace(this.textarea.value)) {
                this.clearText();
            } else {
                // Don't emit event so our valueChanges doesn't get notified by this change.
                this.control?.setValue(this.textarea.value, { emitEvent: false });
                this.control?.markAsDirty();
            }
        }

        this.contentChanged.emit(this.control?.value);
    }

    /**
     * Set the caret position on the character number.
     *
     * @param parent Parent where to set the position.
     */
    protected setCurrentCursorPosition(parent: Node): void {
        if (!this.rteEnabled || !this.element.classList.contains('has-focus')) {
            return;
        }

        const range = document.createRange();

        // Select all so it will go to the end.
        range.selectNode(parent);
        range.selectNodeContents(parent);
        range.collapse(false);

        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Toggle from rte editor to textarea syncing values.
     *
     * @param event The event.
     */
    async toggleEditor(event: Event): Promise<void> {
        if (event.type === 'keyup' && !this.isValidKeyboardKey(<KeyboardEvent>event)) {
            return;
        }

        this.stopBubble(event);

        // Update tags for a11y.
        this.replaceTags(['b', 'i'], ['strong', 'em']);

        this.setContent(this.control?.value || '');

        this.rteEnabled = !this.rteEnabled;

        // Set focus and cursor at the end.
        // Modify the DOM directly so the keyboard stays open.

        if (this.rteEnabled) {
            this.editorElement?.removeAttribute('hidden');
            this.textareaElement?.setAttribute('hidden', '');
        } else {
            this.editorElement?.setAttribute('hidden', '');
            this.textareaElement?.removeAttribute('hidden');
        }

        await CoreWait.nextTick();

        this.focusRTE(event);
    }

    /**
     * Treat elements that can contain external content.
     * We only search for images because the editor should receive unfiltered text, so the multimedia filter won't be applied.
     * Treating videos and audios in here is complex, so if a user manually adds one he won't be able to play it in the editor.
     */
    protected treatExternalContent(): void {
        if (!CoreSites.isLoggedIn() || !this.editorElement) {
            // Only treat external content if the user is logged in.
            return;
        }

        const elements = Array.from(this.editorElement.querySelectorAll('img'));
        const site = CoreSites.getCurrentSite();
        const siteId = CoreSites.getCurrentSiteId();
        const canDownloadFiles = !site || site.canDownloadFiles();
        elements.forEach(async (el) => {
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
    }

    /**
     * Reverts changes made by treatExternalContent.
     */
    protected restoreExternalContent(): void {
        if (!this.editorElement) {
            return;
        }

        const elements = Array.from(this.editorElement.querySelectorAll('img'));
        elements.forEach((el) => {
            const originalUrl = el.getAttribute('data-original-src');
            if (originalUrl) {
                el.setAttribute('src', originalUrl);
                el.removeAttribute('data-original-src');
            }
        });
    }

    /**
     * Check if text is empty.
     *
     * @param valueOrEl Text or element containing the text.
     * @returns If value is null only a white space.
     */
    protected isNullOrWhiteSpace(valueOrEl: string | HTMLElement | null | undefined): boolean {
        if (valueOrEl === null || valueOrEl === undefined) {
            this.isEmpty = true;

            return true;
        }

        this.isEmpty = typeof valueOrEl === 'string' ? CoreDom.htmlIsBlank(valueOrEl) : !CoreDom.elementHasContent(valueOrEl);

        return this.isEmpty;
    }

    /**
     * Set the content of the textarea and the editor element.
     *
     * @param value New content.
     */
    protected setContent(value: string | null | undefined): void {
        if (!this.editorElement || !this.textarea) {
            return;
        }

        if (this.isNullOrWhiteSpace(value)) {
            // Avoid loops.
            if (this.editorElement.innerHTML !== '<p></p>') {
                this.editorElement.innerHTML = '<p></p>';
            }
            this.textarea.value = '';
        } else {
            value = value || '';
            // Avoid loops.
            if (this.editorElement.innerHTML !== value) {
                this.editorElement.innerHTML = value;
            }
            this.textarea.value = value;
            this.treatExternalContent();
        }
    }

    /**
     * Clear the text.
     */
    clearText(): void {
        this.setContent(null);

        // Don't emit event so our valueChanges doesn't get notified by this change.
        this.control?.setValue(null, { emitEvent: false });

        setTimeout(() => {
            if (this.editorElement) {
                this.setCurrentCursorPosition(this.editorElement);
            }
        }, 1);
    }

    /**
     * Execute an action over the selected text when a button is activated.
     *  API docs: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
     *
     * @param event Event data
     * @param command Command to execute.
     * @param parameters If parameters is set to block, a formatBlock command will be performed. Otherwise it will switch the
     *                      toolbar styles button when set.
     */
    buttonAction(event: Event, command: string, parameters?: string): void {
        if (event.type === 'keyup' && !this.isValidKeyboardKey(<KeyboardEvent>event)) {
            return;
        }

        this.stopBubble(event);

        if (!command) {
            return;
        }

        this.executeCommand({ name: command, parameters });
    }

    /**
     * Execute an action over the selected text.
     *  API docs: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
     *
     * @param command Editor command.
     * @param command.name Command name.
     * @param command.parameters Command parameters.
     */
    protected executeCommand({ name: command, parameters }: EditorCommand): void {
        if (parameters === 'block') {
            // eslint-disable-next-line deprecation/deprecation
            document.execCommand('formatBlock', false, `<${command}>`);

            return;
        }

        if (parameters) {
            this.toolbarStyles[parameters] = this.toolbarStyles[parameters] == 'true' ? 'false' : 'true';
        }

        // eslint-disable-next-line deprecation/deprecation
        document.execCommand(command, false);
    }

    /**
     * Replace tags for a11y.
     *
     * @param originTags      Origin tags to be replaced.
     * @param destinationTags Destination tags to replace.
     */
    protected replaceTags(originTags: string[], destinationTags: string[]): void {
        if (!this.editorElement) {
            return;
        }

        this.editorElement =
            CoreDom.replaceTags(this.editorElement, originTags, destinationTags);

        this.onChange();
    }

    /**
     * Blur and hide the toolbar in phone mode.
     *
     * @param event Event.
     */
    blurRTE(event: FocusEvent): void {
        const doBlur = (event: FocusEvent) => {
            if (this.element.contains(document.activeElement)) {
                // Do not hide if clicked inside the editor area, except hideButton.

                return;
            }

            this.element.classList.remove('has-focus');

            this.stopBubble(event);

            if (this.isPhone) {
                this.toolbarHidden = true;
            }
        };

        // There are many cases when focus is fired after blur, so we need to delay the blur action.
        this.blurTimeout = window.setTimeout(() => doBlur(event),300);
    }

    /**
     * Checks if Space or Enter have been pressed.
     *
     * @param event Keyboard Event.
     * @returns Wether space or enter have been pressed.
     */
    protected isValidKeyboardKey(event: KeyboardEvent): boolean {
        return event.key === ' ' || event.key === 'Enter';
    }

    /**
     * Focus editor when click the area and show toolbar.
     *
     * @param event Event.
     */
    focusRTE(event: Event): void {
        clearTimeout(this.blurTimeout);

        if (this.rteEnabled) {
            this.editorElement?.focus();
        } else {
            this.textarea?.setFocus();
        }

        this.element.classList.add('ion-touched');
        this.element.classList.remove('ion-untouched');
        this.element.classList.add('has-focus');

        event && this.stopBubble(event);

        this.toolbarHidden = false;
        this.updateToolbarButtons();

    }

    /**
     * Stop event default and propagation.
     *
     * @param event Event.
     */
    stopBubble(event: Event): void {
        if (event.type != 'touchend' && event.type != 'mouseup' && event.type != 'keyup') {
            event.preventDefault();
        }
        event.stopPropagation();
    }

    /**
     * When a button is clicked first we should stop event propagation, but it has some cases to not.
     *
     * @param event Event.
     */
    downAction(event: Event): void {
        if (event.type === 'keydown' && !this.isValidKeyboardKey(<KeyboardEvent>event)) {
            return;
        }

        const selection = window.getSelection()?.toString();

        // When RTE is focused with a whole paragraph in desktop the stopBubble will not fire click.
        if (CorePlatform.isMobile() || !this.rteEnabled || document.activeElement != this.editorElement || selection === '') {
            this.stopBubble(event);
        }
    }

    /**
     * Method that shows the next toolbar buttons.
     */
    async toolbarNext(event: Event): Promise<void> {
        if (event.type === 'keyup' && !this.isValidKeyboardKey(<KeyboardEvent>event)) {
            return;
        }

        this.stopBubble(event);

        if (!this.toolbarNextHidden) {
            const currentIndex = this.toolbarSlides?.activeIndex;
            this.toolbarSlides?.slideTo((currentIndex || 0) + this.toolbarSlides.slidesPerViewDynamic());
        }

        await this.updateToolbarArrows();
    }

    /**
     * Method that shows the previous toolbar buttons.
     */
    async toolbarPrev(event: Event): Promise<void> {
        if (event.type === 'keyup' && !this.isValidKeyboardKey(<KeyboardEvent>event)) {
            return;
        }

        this.stopBubble(event);

        if (!this.toolbarPrevHidden) {
            const currentIndex = this.toolbarSlides?.activeIndex;
            this.toolbarSlides?.slideTo((currentIndex || 0) - this.toolbarSlides.slidesPerViewDynamic());
        }

        await this.updateToolbarArrows();
    }

    /**
     * Update the number of toolbar buttons displayed.
     */
    async updateToolbarButtons(): Promise<void> {
        if (!this.isCurrentView || !this.toolbar || !this.toolbarSlides ||
            this.toolbarHidden || this.element.offsetParent === null) {
            // Don't calculate if component isn't in current view, the calculations are wrong.
            return;
        }

        const length = this.toolbarSlides.slides.length;

        // Cancel previous one, if any.
        this.buttonsDomPromise?.cancel();
        this.buttonsDomPromise = CoreDom.waitToBeInDOM(this.toolbar?.nativeElement);
        await this.buttonsDomPromise;

        const width = this.toolbar?.nativeElement.getBoundingClientRect().width;

        if (length > 0 && width > length * this.toolbarButtonWidth) {
            this.swiperOpts.slidesPerView = length;
            this.toolbarArrows = false;
        } else {
            this.swiperOpts.slidesPerView = Math.floor((width - this.toolbarArrowWidth * 2) / this.toolbarButtonWidth);
            this.toolbarArrows = true;
        }

        await CoreWait.nextTick();

        this.toolbarSlides.update();

        await this.updateToolbarArrows();
    }

    /**
     * Show or hide next/previous toolbar arrows.
     */
    async updateToolbarArrows(): Promise<void> {
        if (!this.toolbarSlides) {
            return;
        }

        const currentIndex = this.toolbarSlides.activeIndex;
        const length = this.toolbarSlides.slides.length;
        this.toolbarPrevHidden = currentIndex <= 0;
        this.toolbarNextHidden = currentIndex + this.toolbarSlides.slidesPerViewDynamic() >= length;
    }

    /**
     * Update highlighted toolbar styles.
     */
    updateToolbarStyles(): void {
        const node = window.getSelection()?.focusNode;

        if (!node || !this.element.contains(node)) {
            return;
        }

        let element = node.nodeType === 1 ? node as HTMLElement : node.parentElement;

        const styles = {};

        while (element !== null && element !== this.editorElement) {
            const tagName = element.tagName.toLowerCase();

            if (this.toolbarStyles[tagName]) {
                styles[tagName] = 'true';
            }
            element = element.parentElement;
        }

        for (const tagName in this.toolbarStyles) {
            this.toolbarStyles[tagName] = 'false';
        }

        if (element === this.editorElement) {
            Object.assign(this.toolbarStyles, styles);
        }
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
        try {
            const entry = await CoreEditorOffline.resumeDraft(
                this.contextLevel || ContextLevel.SYSTEM,
                this.contextInstanceId || 0,
                this.elementId || '',
                this.draftExtraParams || {},
                this.pageInstance,
                this.originalContent,
            );

            if (entry === undefined) {
                // No draft found.
                return;
            }

            this.element.classList.add('ion-touched');
            this.element.classList.remove('ion-untouched');

            let draftText = entry.drafttext || '';

            // Revert untouched editor contents to an empty string.
            if (draftText === '<p></p>' || draftText === '<p><br></p>' || draftText === '<br>' ||
                    draftText === '<p>&nbsp;</p>' || draftText === '<p><br>&nbsp;</p>') {
                draftText = '';
            }

            if (draftText !== '' && this.control && draftText != this.control.value) {
                // Restore the draft.
                this.control.setValue(draftText, { emitEvent: false });
                this.setContent(draftText);
                this.lastDraft = draftText;
                this.draftWasRestored = true;
                this.originalContent = entry.originalcontent;

                if (entry.drafttext != entry.originalcontent) {
                    // Notify the user.
                    this.showMessage('core.editor.textrecovered', this.RESTORE_MESSAGE_CLEAR_TIME);
                }
            }
        } catch {
            // Ignore errors, shouldn't happen.
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
                this.showMessage('core.editor.autosavesucceeded', this.SAVE_MESSAGE_CLEAR_TIME);
            } catch {
                // Error saving draft.
            }
        }, this.DRAFT_AUTOSAVE_FREQUENCY);
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
                } catch (error) {
                    // Error deleting draft. Shouldn't happen.
                }
            }
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * Show a message.
     *
     * @param message Identifier of the message to display.
     * @param timeout Number of milliseconds when to remove the message.
     */
    protected showMessage(message: string, timeout: number): void {
        clearTimeout(this.hideMessageTimeout);

        this.infoMessage = message;

        this.hideMessageTimeout = window.setTimeout(() => {
            this.hideMessageTimeout = undefined;
            this.infoMessage = undefined;
        }, timeout);
    }

    /**
     * Scan a QR code and put its text in the editor.
     *
     * @param event Event data
     * @returns Promise resolved when done.
     */
    async scanQR(event: Event): Promise<void> {
        if (event.type === 'keyup' && !this.isValidKeyboardKey(<KeyboardEvent>event)) {
            return;
        }

        this.stopBubble(event);

        // Scan for a QR code.
        const text = await CoreQRScan.scanQR();

        if (text) {
            this.focusRTE(event); // Make sure the editor is focused.
            // eslint-disable-next-line deprecation/deprecation
            document.execCommand('insertText', false, text);
        }
    }

    /**
     * Window resized.
     */
    protected async windowResized(): Promise<void> {
        await CoreWait.waitForResizeDone();
        this.isPhone = CoreScreen.isMobile;

        this.maximizeEditorSize();
        this.updateToolbarButtons();
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        this.isCurrentView = true;

        this.updateToolbarButtons();
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        this.isCurrentView = false;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.valueChangeSubscription?.unsubscribe();

        document.removeEventListener('selectionchange', this.selectionChangeFunction);

        clearInterval(this.initHeightInterval);
        clearInterval(this.autoSaveInterval);
        clearTimeout(this.hideMessageTimeout);

        this.resetObserver?.off();
        this.keyboardObserver?.off();
        this.resizeListener?.off();

        this.labelObserver?.disconnect();
        this.contentObserver?.disconnect();

        this.domPromise?.cancel();
        this.buttonsDomPromise?.cancel();
    }

    /**
     * Get commands triggered by keyboard shortcuts.
     *
     * @returns Commands dictionary indexed by their corresponding keyboard shortcut id.
     */
    getShortcutCommands(): Record<string, EditorCommand> {
        if (!this.shortcutCommands) {
            const isIOS = CorePlatform.isIOS();
            const metaKey = isIOS ? 'metaKey' : 'ctrlKey';
            const shiftKey = isIOS ? 'ctrlKey' : 'shiftKey';

            // Same shortcuts as TinyMCE:
            // @see https://www.tiny.cloud/docs/advanced/keyboard-shortcuts/
            const shortcuts: { code: string; modifiers: (keyof KeyboardShortcut)[]; command: EditorCommand }[] = [
                {
                    code: 'KeyB',
                    modifiers: [metaKey],
                    command: {
                        name: 'bold',
                        parameters: 'strong',
                    },
                },
                {
                    code: 'KeyI',
                    modifiers: [metaKey],
                    command: {
                        name: 'italic',
                        parameters: 'em',
                    },
                },
                {
                    code: 'KeyU',
                    modifiers: [metaKey],
                    command: {
                        name: 'underline',
                        parameters: 'u',
                    },
                },
                {
                    code: 'Digit3',
                    modifiers: ['altKey', shiftKey],
                    command: {
                        name: 'h3',
                        parameters: 'block',
                    },
                },
                {
                    code: 'Digit4',
                    modifiers: ['altKey', shiftKey],
                    command: {
                        name: 'h4',
                        parameters: 'block',
                    },
                },
                {
                    code: 'Digit5',
                    modifiers: ['altKey', shiftKey],
                    command: {
                        name: 'h5',
                        parameters: 'block',
                    },
                },
                {
                    code: 'Digit7',
                    modifiers: ['altKey', shiftKey],
                    command: {
                        name: 'p',
                        parameters: 'block',
                    },
                },
            ];

            this.shortcutCommands = shortcuts.reduce((shortcuts, { code, modifiers, command }) => {
                const id = this.getShortcutId({
                    code: code,
                    altKey: modifiers.includes('altKey'),
                    metaKey: modifiers.includes('metaKey'),
                    shiftKey: modifiers.includes('shiftKey'),
                    ctrlKey: modifiers.includes('ctrlKey'),
                });

                shortcuts[id] = command;

                return shortcuts;
            }, {} as Record<string, EditorCommand>);
        }

        return this.shortcutCommands;
    }

    /**
     * Get a unique identifier for a given keyboard shortcut.
     *
     * @param shortcut Shortcut.
     * @returns Identifier.
     */
    protected getShortcutId(shortcut: KeyboardShortcut): string {
        return (shortcut.altKey ? '1' : '0')
            + (shortcut.metaKey ? '1' : '0')
            + (shortcut.shiftKey ? '1' : '0')
            + (shortcut.ctrlKey ? '1' : '0')
            + shortcut.code;
    }

}

/**
 * Combination
 */
type KeyboardShortcut = Pick<KeyboardEvent, 'code' | 'altKey' | 'metaKey' | 'ctrlKey' | 'shiftKey'>;

/**
 * Editor command.
 */
interface EditorCommand {
    name: string;
    parameters?: string;
}
