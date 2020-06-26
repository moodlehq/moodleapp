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

import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterContentInit, OnDestroy, Optional }
    from '@angular/core';
import { TextInput, Content, Platform, Slides } from 'ionic-angular';
import { CoreApp } from '@providers/app';
import { CoreSitesProvider } from '@providers/sites';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreEventsProvider } from '@providers/events';
import { CoreEditorOfflineProvider } from '../../providers/editor-offline';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';

/**
 * Component to display a rich text editor if enabled.
 *
 * If enabled, this component will show a rich text editor. Otherwise it'll show a regular textarea.
 *
 * Example:
 * <core-rich-text-editor item-content [control]="control" [placeholder]="field.name"></core-rich-text-editor>
 */
@Component({
    selector: 'core-rich-text-editor',
    templateUrl: 'core-editor-rich-text-editor.html'
})
export class CoreEditorRichTextEditorComponent implements AfterContentInit, OnDestroy {
    // Based on: https://github.com/judgewest2000/Ionic3RichText/
    // @todo: Anchor button, fullscreen...
    // @todo: Textarea height is not being updated when editor is resized. Height is calculated if any css is changed.

    @Input() placeholder = ''; // Placeholder to set in textarea.
    @Input() control: FormControl; // Form control.
    @Input() name = 'core-rich-text-editor'; // Name to set to the textarea.
    @Input() component?: string; // The component to link the files to.
    @Input() componentId?: number; // An ID to use in conjunction with the component.
    @Input() autoSave?: boolean | string; // Whether to auto-save the contents in a draft. Defaults to true.
    @Input() contextLevel?: string; // The context level of the text.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() elementId?: string; // An ID to set to the element.
    @Input() draftExtraParams: {[name: string]: any}; // Extra params to identify the draft.
    @Output() contentChanged: EventEmitter<string>;

    @ViewChild('editor') editor: ElementRef; // WYSIWYG editor.
    @ViewChild('textarea') textarea: TextInput; // Textarea editor.

    protected DRAFT_AUTOSAVE_FREQUENCY = 30000;
    protected RESTORE_MESSAGE_CLEAR_TIME = 6000;
    protected SAVE_MESSAGE_CLEAR_TIME = 2000;
    protected element: HTMLDivElement;
    protected editorElement: HTMLDivElement;
    protected kbHeight = 0; // Last known keyboard height.
    protected minHeight = 200; // Minimum height of the editor.

    protected valueChangeSubscription: Subscription;
    protected keyboardObs: any;
    protected resetObs: any;
    protected initHeightInterval: NodeJS.Timer;

    rteEnabled = false;
    editorSupported = true;

    // Toolbar.
    @ViewChild('toolbar') toolbar: ElementRef;
    @ViewChild(Slides) toolbarSlides: Slides;
    isPhone = this.platform.is('mobile') && !this.platform.is('tablet');
    toolbarHidden = this.isPhone;
    numToolbarButtons = 6;
    toolbarArrows = false;
    toolbarPrevHidden = true;
    toolbarNextHidden = false;
    toolbarStyles = {
        strong: 'false',
        em: 'false',
        u: 'false',
        strike: 'false',
        p: 'false',
        h3: 'false',
        h4: 'false',
        h5: 'false',
        ul: 'false',
        ol: 'false',
    };
    infoMessage: string;
    canScanQR: boolean;

    protected isCurrentView = true;
    protected toolbarButtonWidth = 40;
    protected toolbarArrowWidth = 28;
    protected pageInstance: string;
    protected autoSaveInterval: NodeJS.Timer;
    protected hideMessageTimeout: NodeJS.Timer;
    protected lastDraft = '';
    protected draftWasRestored = false;
    protected originalContent: string;

    constructor(
            protected domUtils: CoreDomUtilsProvider,
            protected urlUtils: CoreUrlUtilsProvider,
            protected sitesProvider: CoreSitesProvider,
            protected filepoolProvider: CoreFilepoolProvider,
            @Optional() protected content: Content,
            elementRef: ElementRef,
            protected events: CoreEventsProvider,
            protected utils: CoreUtilsProvider,
            protected platform: Platform,
            protected editorOffline: CoreEditorOfflineProvider) {
        this.contentChanged = new EventEmitter<string>();
        this.element = elementRef.nativeElement as HTMLDivElement;
        this.pageInstance = 'app_' + Date.now(); // Generate a "unique" ID based on timestamp.
        this.canScanQR = this.utils.canScanQR();
    }

    /**
     * Init editor.
     */
    ngAfterContentInit(): void {
        this.domUtils.isRichTextEditorEnabled().then((enabled) => {
            this.rteEnabled = !!enabled;
        });

        this.editorSupported = this.domUtils.isRichTextEditorSupported();

        // Setup the editor.
        this.editorElement = this.editor.nativeElement as HTMLDivElement;
        this.setContent(this.control.value);
        this.originalContent = this.control.value;
        this.lastDraft = this.control.value;
        this.editorElement.onchange = this.onChange.bind(this);
        this.editorElement.onkeyup = this.onChange.bind(this);
        this.editorElement.onpaste = this.onChange.bind(this);
        this.editorElement.oninput = this.onChange.bind(this);
        this.editorElement.onkeydown = this.moveCursor.bind(this);

        // Listen for changes on the control to update the editor (if it is updated from outside of this component).
        this.valueChangeSubscription = this.control.valueChanges.subscribe((param) => {
            if (!this.draftWasRestored || this.originalContent != param) {
                // Apply the new content.
                this.setContent(param);
                this.originalContent = param;
                this.infoMessage = null;

                // Save a draft so the original content is saved.
                this.lastDraft = param;
                this.editorOffline.saveDraft(this.contextLevel, this.contextInstanceId, this.elementId,
                        this.draftExtraParams, this.pageInstance, param, param);
            } else {
                // A draft was restored and the content hasn't changed in the site. Use the draft value instead of this one.
                this.control.setValue(this.lastDraft, {emitEvent: false});
            }
        });

        // Use paragraph on enter.
        document.execCommand('DefaultParagraphSeparator', false, 'p');

        window.addEventListener('resize', this.maximizeEditorSize);
        document.addEventListener('selectionchange', this.updateToolbarStyles);

        let i = 0;
        this.initHeightInterval = setInterval(() => {
            this.maximizeEditorSize().then((height) => {
                if (i >= 5 || height != 0) {
                    clearInterval(this.initHeightInterval);
                }
                i++;
            });
        }, 750);

        this.keyboardObs = this.events.on(CoreEventsProvider.KEYBOARD_CHANGE, (kbHeight) => {
            this.kbHeight = kbHeight;
            this.maximizeEditorSize();
        });

        this.updateToolbarButtons();

        if (this.elementId) {
            // Prepend elementId with 'id_' like in web. Don't use a setter for this because the value shouldn't change.
            this.elementId = 'id_' + this.elementId;
            this.element.setAttribute('id', this.elementId);
        }

        // Update tags for a11y.
        this.replaceTags('b', 'strong');
        this.replaceTags('i', 'em');

        if (this.shouldAutoSaveDrafts()) {
            this.restoreDraft();

            this.autoSaveDrafts();

            this.deleteDraftOnSubmitOrCancel();
        }
    }

    /**
     * Resize editor to maximize the space occupied.
     *
     * @return Resolved with calculated editor size.
     */
    protected maximizeEditorSize = (): Promise<number> => {
        this.content.resize();

        const deferred = this.utils.promiseDefer();

        setTimeout(() => {
            let contentVisibleHeight = this.domUtils.getContentHeight(this.content);
            if (!this.platform.is('android')) {
                // In Android we ignore the keyboard height because it is not part of the web view.
                contentVisibleHeight -= this.kbHeight;
            }

            if (contentVisibleHeight <= 0) {
                deferred.resolve(0);

                return;
            }

            setTimeout(() => {
                // Editor is ready, adjust Height if needed.
                let height;

                if (this.platform.is('android')) {
                    // In Android we ignore the keyboard height because it is not part of the web view.
                    height = this.domUtils.getContentHeight(this.content) - this.getSurroundingHeight(this.element);
                } else if (this.platform.is('ios') && this.kbHeight > 0 && this.platform.version().major < 12) {
                    // Keyboard open in iOS 11 or previous. The window height changes when the keyboard is open.
                    height = window.innerHeight - this.getSurroundingHeight(this.element);

                    if (this.element.getBoundingClientRect().top < 40) {
                        // In iOS sometimes the editor is placed below the status bar. Move the scroll a bit so it doesn't happen.
                        window.scrollTo(window.scrollX, window.scrollY - 40);
                    }

                } else {
                    // Header is fixed, use the content to calculate the editor height.
                    height = this.domUtils.getContentHeight(this.content) - this.kbHeight - this.getSurroundingHeight(this.element);

                }

                if (height > this.minHeight) {
                    this.element.style.height = this.domUtils.formatPixelsSize(height - 1);
                } else {
                    this.element.style.height = '';
                }

                deferred.resolve(height);
            }, 100);
        }, 100);

        return deferred.promise;
    }

    /**
     * Get the height of the surrounding elements from the current to the top element.
     *
     * @param element Directive DOM element to get surroundings elements from.
     * @return Surrounding height in px.
     */
    protected getSurroundingHeight(element: any): number {
        let height = 0;

        while (element.parentNode && element.parentNode.tagName != 'ION-CONTENT') {
            const parent = element.parentNode;
            if (element.tagName && element.tagName != 'CORE-LOADING') {
                for (let x = 0; x < parent.childNodes.length; x++) {
                    const child = parent.childNodes[x];
                    if (child.tagName && child != element) {
                        height += this.domUtils.getElementHeight(child, false, true, true);
                    }
                }
            }
            element = parent;
        }

        const cs = getComputedStyle(element);
        height += this.domUtils.getComputedStyleMeasure(cs, 'paddingTop') +
            this.domUtils.getComputedStyleMeasure(cs, 'paddingBottom');

        if (element && element.parentNode && element.parentNode.tagName == 'ION-CONTENT') {
            const cs2 = getComputedStyle(element);

            height -= this.domUtils.getComputedStyleMeasure(cs2, 'paddingTop') +
                this.domUtils.getComputedStyleMeasure(cs2, 'paddingBottom');
        }

        return height;
    }

    /**
     * On change function to sync with form data.
     *
     * @param $event The event.
     */
    onChange($event?: Event): void {
        if (this.rteEnabled) {
            if (this.isNullOrWhiteSpace(this.editorElement.innerText)) {
                this.clearText();
            } else {
                // The textarea and the form control must receive the original URLs.
                this.restoreExternalContent();
                // Don't emit event so our valueChanges doesn't get notified by this change.
                this.control.setValue(this.editorElement.innerHTML, {emitEvent: false});
                this.control.markAsDirty();
                this.textarea.value = this.editorElement.innerHTML;
                // Treat URLs again for the editor.
                this.treatExternalContent();
            }
        } else {
            if (this.isNullOrWhiteSpace(this.textarea.value)) {
                this.clearText();
            } else {
                // Don't emit event so our valueChanges doesn't get notified by this change.
                this.control.setValue(this.textarea.value, {emitEvent: false});
                this.control.markAsDirty();
            }
        }

        this.contentChanged.emit(this.control.value);
    }

    /**
     * On key down function to move the cursor.
     * https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
     *
     * @param $event The event.
     */
    moveCursor($event: Event): void {
        if (!this.rteEnabled) {
            return;
        }

        if ($event['key'] != 'ArrowLeft' && $event['key'] != 'ArrowRight') {
            return;
        }

        this.stopBubble($event);

        const move = $event['key'] == 'ArrowLeft' ? -1 : +1,
            cursor = this.getCurrentCursorPosition(this.editorElement);

        this.setCurrentCursorPosition(this.editorElement, cursor + move);
    }

    /**
     * Returns the number of chars from the beggining where is placed the cursor.
     *
     * @param parent Parent where to get the position from.
     * @return Position in chars.
     */
    protected getCurrentCursorPosition(parent: Node): number {
        const selection = window.getSelection();

        let charCount = -1,
            node;

        if (selection.focusNode) {
            if (parent.contains(selection.focusNode)) {
                node = selection.focusNode;
                charCount = selection.focusOffset;

                while (node) {
                    if (node.isSameNode(parent)) {
                        break;
                    }

                    if (node.previousSibling) {
                        node = node.previousSibling;
                        charCount += node.textContent.length;
                    } else {
                        node = node.parentNode;
                        if (node === null) {
                            break;
                        }
                    }
                }
            }
        }

        return charCount;
    }

    /**
     * Set the caret position on the character number.
     *
     * @param parent Parent where to set the position.
     * @param chars Number of chars where to place the caret. If not defined it will go to the end.
     */
    protected setCurrentCursorPosition(parent: Node, chars?: number): void {
        /**
         * Loops round all the child text nodes within the supplied node and sets a range from the start of the initial node to
         * the characters.
         *
         * @param node Node where to start.
         * @param range Previous calculated range.
         * @param chars Object with counting of characters (input-output param).
         * @return Selection range.
         */
        const setRange = (node: Node, range: Range, chars: any): Range => {
            if (chars.count === 0) {
                range.setEnd(node, 0);
            } else if (node && chars.count > 0) {
                if (node.hasChildNodes()) {
                    // Navigate through children.
                    for (let lp = 0; lp < node.childNodes.length; lp++) {
                        range = setRange(node.childNodes[lp], range, chars);

                        if (chars.count === 0) {
                            break;
                        }
                    }
                } else if (node.textContent.length < chars.count) {
                    // Jump this node.
                    // @todo: empty nodes will be omitted.
                    chars.count -= node.textContent.length;
                } else {
                    // The cursor will be placed in this element.
                    range.setEnd(node, chars.count);
                    chars.count = 0;
                }
            }

            return range;
        };

        let range = document.createRange();
        if (typeof chars === 'undefined') {
            // Select all so it will go to the end.
            range.selectNode(parent);
            range.selectNodeContents(parent);
        } else if (chars < 0 || chars > parent.textContent.length) {
            return;
        } else {
            range.selectNode(parent);
            range.setStart(parent, 0);
            range = setRange(parent, range, {count: chars});
        }

        if (range) {
            const selection = window.getSelection();
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    /**
     * Toggle from rte editor to textarea syncing values.
     *
     * @param $event The event.
     */
    toggleEditor($event: Event): void {
        this.stopBubble($event);

        this.setContent(this.control.value);

        this.rteEnabled = !this.rteEnabled;

        // Set focus and cursor at the end.
        // Modify the DOM directly so the keyboard stays open.
        if (this.rteEnabled) {
            // Update tags for a11y.
            this.replaceTags('b', 'strong');
            this.replaceTags('i', 'em');
            this.editorElement.removeAttribute('hidden');
            this.textarea.getNativeElement().setAttribute('hidden', '');
            this.editorElement.focus();
        } else {
            this.editorElement.setAttribute('hidden', '');
            this.textarea.getNativeElement().removeAttribute('hidden');
            this.textarea.setFocus();
        }
    }

    /**
     * Treat elements that can contain external content.
     * We only search for images because the editor should receive unfiltered text, so the multimedia filter won't be applied.
     * Treating videos and audios in here is complex, so if a user manually adds one he won't be able to play it in the editor.
     */
    protected treatExternalContent(): void {
        if (!this.sitesProvider.isLoggedIn()) {
            // Only treat external content if the user is logged in.
            return;
        }

        const elements = Array.from(this.editorElement.querySelectorAll('img')),
            siteId = this.sitesProvider.getCurrentSiteId(),
            canDownloadFiles = this.sitesProvider.getCurrentSite().canDownloadFiles();
        elements.forEach((el) => {
            if (el.getAttribute('data-original-src')) {
                // Already treated.
                return;
            }

            const url = el.src;

            if (!url || !this.urlUtils.isDownloadableUrl(url) || (!canDownloadFiles && this.urlUtils.isPluginFileUrl(url))) {
                // Nothing to treat.
                return;
            }

            // Check if it's downloaded.
            return this.filepoolProvider.getSrcByUrl(siteId, url, this.component, this.componentId).then((finalUrl) => {
                // Check again if it's already treated, this function can be called concurrently more than once.
                if (!el.getAttribute('data-original-src')) {
                    el.setAttribute('data-original-src', el.src);
                    el.setAttribute('src', finalUrl);
                }
            });
        });
    }

    /**
     * Reverts changes made by treatExternalContent.
     */
    protected restoreExternalContent(): void {
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
     * @param value text
     */
    protected isNullOrWhiteSpace(value: string): boolean {
        if (value == null || typeof value == 'undefined') {
            return true;
        }

        value = value.replace(/[\n\r]/g, '');
        value = value.split(' ').join('');

        return value.length === 0;
    }

    /**
     * Set the content of the textarea and the editor element.
     *
     * @param value New content.
     */
    protected setContent(value: string): void {
        if (this.isNullOrWhiteSpace(value)) {
            this.editorElement.innerHTML = '<p></p>';
            this.textarea.value = '';
        } else {
            this.editorElement.innerHTML = value;
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
        this.control.setValue(null, {emitEvent: false});

        setTimeout(() => {
            if (this.rteEnabled) {
                this.setCurrentCursorPosition(this.editorElement);
            }
        }, 1);
    }

    /**
     * Execute an action over the selected text.
     *  API docs: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
     *
     * @param $event Event data
     * @param command Command to execute.
     * @param parameters If parameters is set to block, a formatBlock command will be performed. Otherwise it will switch the
     *                      toolbar styles button when set.
     */
    buttonAction($event: any, command: string, parameters: string): void {
        this.stopBubble($event);

        if (command) {
            if (parameters == 'block') {
                document.execCommand('formatBlock', false, '<' + command + '>');
            } else {
                if (parameters) {
                    this.toolbarStyles[parameters] = this.toolbarStyles[parameters] == 'true' ? 'false' : 'true';
                }

                document.execCommand(command, false);

                // Modern browsers are using non a11y tags, so replace them.
                if (command == 'bold') {
                    this.replaceTags('b', 'strong');
                } else if (command == 'italic') {
                    this.replaceTags('i', 'em');
                }
            }
        }
    }

    /**
     * Replace tags for a11y.
     *
     * @param originTag      Origin tag to be replaced.
     * @param destinationTag Destination tag to replace.
     */
    protected replaceTags(originTag: string, destinationTag: string): void {
        const elems = Array.from(this.editorElement.getElementsByTagName(originTag));

        elems.forEach((elem) => {
            const newElem = document.createElement(destinationTag);
            newElem.innerHTML = elem.innerHTML;

            if (elem.hasAttributes()) {
                const attrs = Array.from(elem.attributes);
                attrs.forEach((attr) => {
                    newElem.setAttribute(attr.name, attr.value);
                });
            }

            elem.parentNode.replaceChild(newElem, elem);
        });

        this.onChange();
    }

    /**
     * Focus editor when click the area.
     *
     * @param e Event
     */
    focusRTE(e?: Event): void {
        if (this.rteEnabled) {
            this.editorElement.focus();
        } else {
            this.textarea.setFocus();
        }
    }

    /**
     * Hide the toolbar in phone mode.
     */
    hideToolbar($event: Event): void {
        this.stopBubble($event);

        if (this.isPhone) {
            this.toolbarHidden = true;
        }
    }

    /**
     * Show the toolbar.
     */
    showToolbar($event: Event): void {
        this.stopBubble($event);

        this.editorElement.focus();
        this.toolbarHidden = false;
    }

    /**
     * Stop event default and propagation.
     *
     * @param event Event.
     */
    stopBubble(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * When a button is clicked first we should stop event propagation, but it has some cases to not.
     *
     * @param event Event.
     */
    mouseDownAction(event: Event): void {
        const selection = window.getSelection().toString();
        // When RTE is focused with a whole paragraph in desktop the stopBubble will not fire click.
        if (CoreApp.instance.isMobile() || !this.rteEnabled || document.activeElement != this.editorElement || selection == '') {
            this.stopBubble(event);
        }
    }

    /**
     * Method that shows the next toolbar buttons.
     */
    toolbarNext($event: any): void {
        this.stopBubble($event);

        if (!this.toolbarNextHidden) {
            const currentIndex = this.toolbarSlides.getActiveIndex() || 0;
            this.toolbarSlides.slideTo(currentIndex + this.numToolbarButtons);
        }
        this.updateToolbarArrows();
    }

    /**
     * Method that shows the previous toolbar buttons.
     */
    toolbarPrev($event: any): void {
        this.stopBubble($event);

        if (!this.toolbarPrevHidden) {
            const currentIndex = this.toolbarSlides.getActiveIndex() || 0;
            this.toolbarSlides.slideTo(currentIndex - this.numToolbarButtons);
        }
        this.updateToolbarArrows();
    }

    /**
     * Update the number of toolbar buttons displayed.
     */
    updateToolbarButtons(): void {
        if (!this.isCurrentView) {
            // Don't calculate if component isn't in current view, the calculations are wrong.
            return;
        }

        const width = this.domUtils.getElementWidth(this.toolbar.nativeElement);

        if (!(this.toolbarSlides as any)._init || !width) {
            // Slides is not initialized or width is not available yet, try later.
            setTimeout(this.updateToolbarButtons.bind(this), 100);

            return;
        }

        if (width > this.toolbarSlides.length() * this.toolbarButtonWidth) {
            this.numToolbarButtons = this.toolbarSlides.length();
            this.toolbarArrows = false;
        } else {
            this.numToolbarButtons = Math.floor((width - this.toolbarArrowWidth * 2) / this.toolbarButtonWidth);
            this.toolbarArrows = true;
        }

        this.toolbarSlides.update();

        this.updateToolbarArrows();
    }

    /**
     * Show or hide next/previous toolbar arrows.
     */
    updateToolbarArrows(): void {
        const currentIndex = this.toolbarSlides.getActiveIndex() || 0;
        this.toolbarPrevHidden = currentIndex <= 0;
        this.toolbarNextHidden = currentIndex + this.numToolbarButtons >= this.toolbarSlides.length();
    }

    /**
     * Update highlighted toolbar styles.
     */
    updateToolbarStyles = (): void => {
        const node = window.getSelection().focusNode;
        if (!node) {
            return;
        }

        let element = node.nodeType == 1 ? node as HTMLElement : node.parentElement;
        const styles = {};

        while (element != null && element !== this.editorElement) {
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
     * @return {boolean} Whether it should auto save drafts.
     */
    protected shouldAutoSaveDrafts(): boolean {
        return !!this.sitesProvider.getCurrentSite() &&
                (typeof this.autoSave == 'undefined' || this.utils.isTrueOrOne(this.autoSave)) &&
                typeof this.contextLevel != 'undefined' &&
                typeof this.contextInstanceId != 'undefined' &&
                typeof this.elementId != 'undefined';
    }

    /**
     * Restore a draft if there is any.
     *
     * @return Promise resolved when done.
     */
    protected async restoreDraft(): Promise<void> {
        try {
            const entry = await this.editorOffline.resumeDraft(this.contextLevel, this.contextInstanceId, this.elementId,
                    this.draftExtraParams, this.pageInstance, this.originalContent);

            if (typeof entry == 'undefined') {
                // No draft found.
                return;
            }

            let draftText = entry.drafttext;

            // Revert untouched editor contents to an empty string.
            if (draftText == '<p></p>' || draftText == '<p><br></p>' || draftText == '<br>' ||
                    draftText == '<p>&nbsp;</p>' || draftText == '<p><br>&nbsp;</p>') {
                draftText = '';
            }

            if (draftText !== '' && draftText != this.control.value) {
                // Restore the draft.
                this.control.setValue(draftText, {emitEvent: false});
                this.setContent(draftText);
                this.lastDraft = draftText;
                this.draftWasRestored = true;
                this.originalContent = entry.originalcontent;

                if (entry.drafttext != entry.originalcontent) {
                    // Notify the user.
                    this.showMessage('core.editor.textrecovered', this.RESTORE_MESSAGE_CLEAR_TIME);
                }
            }
        } catch (error) {
            // Ignore errors, shouldn't happen.
        }
    }

    /**
     * Automatically save drafts every certain time.
     */
    protected autoSaveDrafts(): void {
        this.autoSaveInterval = setInterval(async () => {
            const newText = this.control.value;

            if (this.lastDraft == newText) {
                // Text hasn't changed, nothing to save.
                return;
            }

            try {
                await this.editorOffline.saveDraft(this.contextLevel, this.contextInstanceId, this.elementId,
                        this.draftExtraParams, this.pageInstance, newText, this.originalContent);

                // Draft saved, notify the user.
                this.lastDraft = newText;
                this.showMessage('core.editor.autosavesucceeded', this.SAVE_MESSAGE_CLEAR_TIME);
            } catch (error) {
                // Error saving draft.
            }
        }, this.DRAFT_AUTOSAVE_FREQUENCY);
    }

    /**
     * Delete the draft when the form is submitted or cancelled.
     */
    protected deleteDraftOnSubmitOrCancel(): void {

        this.resetObs = this.events.on(CoreEventsProvider.FORM_ACTION, async (data) => {
            const form = this.element.closest('form');

            if (data.form && form && data.form == form) {
                try {
                    await this.editorOffline.deleteDraft(this.contextLevel, this.contextInstanceId, this.elementId,
                            this.draftExtraParams);
                } catch (error) {
                    // Error deleting draft. Shouldn't happen.
                }
            }
        }, this.sitesProvider.getCurrentSiteId());
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

        this.hideMessageTimeout = setTimeout(() => {
            this.hideMessageTimeout = null;
            this.infoMessage = null;
        }, timeout);
    }

    /**
     * Scan a QR code and put its text in the editor.
     *
     * @param $event Event data
     */
    scanQR($event: any): void {
        this.stopBubble($event);

        // Scan for a QR code.
        this.utils.scanQR().then((text) => {
            if (text) {
                document.execCommand('insertText', false, text);
            }

            this.content.resize(); // Resize content, otherwise the content height becomes 1 for some reason.
        });
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
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.valueChangeSubscription && this.valueChangeSubscription.unsubscribe();
        window.removeEventListener('resize', this.maximizeEditorSize);
        document.removeEventListener('selectionchange', this.updateToolbarStyles);
        clearInterval(this.initHeightInterval);
        this.keyboardObs && this.keyboardObs.off();
        clearInterval(this.autoSaveInterval);
        clearTimeout(this.hideMessageTimeout);
        this.resetObs && this.resetObs.off();
    }
}
