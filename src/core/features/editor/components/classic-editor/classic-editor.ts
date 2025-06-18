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
    ViewChild,
    ElementRef,
    OnInit,
    OnDestroy,
} from '@angular/core';
import { IonTextarea } from '@ionic/angular';
import { CoreUtils } from '@singletons/utils';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreScreen } from '@services/screen';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreDom } from '@singletons/dom';
import { CorePlatform } from '@services/platform';
import { Swiper } from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { CoreSwiper } from '@singletons/swiper';
import { CoreWait } from '@singletons/wait';
import { CoreQRScan } from '@services/qrscan';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreEditorBaseComponent } from '@features/editor/classes/base-editor-component';

/**
 * Implementation of the classic rich text editor.
 *
 * Do not use this component directly. Use <core-rich-text-editor> instead.
 */
@Component({
    selector: 'core-editor-classic-editor',
    templateUrl: 'core-editor-classic-editor.html',
    styleUrl: 'classic-editor.scss',
    imports: [
        CoreSharedModule,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CoreEditorClassicEditorComponent extends CoreEditorBaseComponent implements OnInit, AfterViewInit, OnDestroy {

    // Based on: https://github.com/judgewest2000/Ionic3RichText/

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

    protected readonly RESTORE_MESSAGE_CLEAR_TIME = 6000;
    protected readonly SAVE_MESSAGE_CLEAR_TIME = 2000;

    protected element: HTMLElement;

    protected contentObserver?: MutationObserver;
    protected isCurrentView = true;
    protected toolbarButtonWidth = 44;
    protected toolbarArrowWidth = 44;
    protected selectionChangeFunction = (): void => this.updateToolbarStyles();
    protected domPromise?: CoreCancellablePromise<void>;
    protected buttonsDomPromise?: CoreCancellablePromise<void>;
    protected shortcutCommands?: Record<string, EditorCommand>;
    protected blurTimeout?: number;

    rteEnabled = true;
    isPhone = false;
    toolbarHidden = false;
    toolbarArrows = false;
    toolbarPrevHidden = true;
    toolbarNextHidden = false;
    canScanQR = false;
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
        elementRef: ElementRef,
    ) {
        super();
        this.element = elementRef.nativeElement;
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
        await this.waitLoadingsDone();

        // Setup the editor.
        this.editorElement = this.editor?.nativeElement as HTMLDivElement;
        this.textareaElement = await this.textarea?.getInputElement();

        // Use paragraph on enter.
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand('DefaultParagraphSeparator', false, 'p');

        document.addEventListener('selectionchange', this.selectionChangeFunction);
        this.updateToolbarButtons();

        if (this.editorElement) {
            const debounceMutation = CoreUtils.debounce(() => {
                if (!this.rteEnabled || !this.editorElement) {
                    return;
                }
                const content = this.editorElement.innerHTML;
                this.isEmpty = CoreDom.htmlIsBlank(content);
                this.onChange?.(content);
            }, 20);

            this.contentObserver = new MutationObserver(debounceMutation);
            this.contentObserver.observe(this.editorElement, { childList: true, subtree: true, characterData: true });
        }

        this.onReadyPromise.resolve();
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

        this.rteEnabled = !this.rteEnabled;

        if (this.rteEnabled) {
            this.setContent(this.textareaElement?.value || '');
            this.editorElement?.removeAttribute('hidden');
            this.textareaElement?.setAttribute('hidden', '');
        } else {
            this.setContent(this.editorElement?.innerHTML || '');
            this.editorElement?.setAttribute('hidden', '');
            this.textareaElement?.removeAttribute('hidden');
        }

        await CoreWait.nextTick();

        this.focusRTE(event);
    }

    /**
     * @inheritdoc
     */
    setContent(content: string): void {
        if (!this.editorElement || !this.textarea) {
            return;
        }

        this.isEmpty = CoreDom.htmlIsBlank(content);
        if (this.rteEnabled) {
            this.editorElement.innerHTML = this.isEmpty ? '<p></p>' : content;
        } else {
            this.textarea.value = this.isEmpty ? '' : content;
        }

        // Set cursor to the end of the content.
        setTimeout(() => {
            if (this.editorElement) {
                this.setCurrentCursorPosition(this.editorElement);
            }
        });
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
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            document.execCommand('formatBlock', false, '<' + command + '>');

            return;
        }

        if (parameters) {
            this.toolbarStyles[parameters] = this.toolbarStyles[parameters] == 'true' ? 'false' : 'true';
        }

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand(command, false);
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
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            document.execCommand('insertText', false, text);
        }
    }

    /**
     * Window resized callback.
     */
    async onResize(): Promise<void> {
        this.isPhone = CoreScreen.isMobile;

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
        document.removeEventListener('selectionchange', this.selectionChangeFunction);

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
