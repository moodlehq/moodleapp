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

import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterContentInit, OnDestroy, Optional }
    from '@angular/core';
import { TextInput, Content, Platform, Slides } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreEventsProvider } from '@providers/events';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';

/**
 * Directive to display a rich text editor if enabled.
 *
 * If enabled, this directive will show a rich text editor. Otherwise it'll show a regular textarea.
 *
 * This directive requires an OBJECT model. The text written in the editor or textarea will be stored inside
 * a "text" property in that object. This is to ensure 2-way data-binding, since using a string as a model
 * could be easily broken.
 *
 * Example:
 * <core-rich-text-editor item-content [control]="control" [placeholder]="field.name"></core-rich-text-editor>
 *
 * In the example above, the text written in the editor will be stored in newpost.text.
 */
@Component({
    selector: 'core-rich-text-editor',
    templateUrl: 'core-rich-text-editor.html'
})
export class CoreRichTextEditorComponent implements AfterContentInit, OnDestroy {
    // Based on: https://github.com/judgewest2000/Ionic3RichText/
    // @todo: Anchor button, fullscreen...
    // @todo: Textarea height is not being updated when editor is resized. Height is calculated if any css is changed.

    @Input() placeholder = ''; // Placeholder to set in textarea.
    @Input() control: FormControl; // Form control.
    @Input() name = 'core-rich-text-editor'; // Name to set to the textarea.
    @Input() component?: string; // The component to link the files to.
    @Input() componentId?: number; // An ID to use in conjunction with the component.
    @Output() contentChanged: EventEmitter<string>;

    @ViewChild('editor') editor: ElementRef; // WYSIWYG editor.
    @ViewChild('textarea') textarea: TextInput; // Textarea editor.

    protected element: HTMLDivElement;
    protected editorElement: HTMLDivElement;
    protected kbHeight = 0; // Last known keyboard height.
    protected minHeight = 200; // Minimum height of the editor.

    protected valueChangeSubscription: Subscription;
    protected keyboardObs: any;
    protected initHeightInterval;

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
        b: 'false',
        i: 'false',
        u: 'false',
        strike: 'false',
        p: 'false',
        h1: 'false',
        h2: 'false',
        h3: 'false',
        ul: 'false',
        ol: 'false',
    };
    protected isCurrentView = true;
    protected toolbarButtonWidth = 40;
    protected toolbarArrowWidth = 28;

    constructor(private domUtils: CoreDomUtilsProvider, private urlUtils: CoreUrlUtilsProvider,
            private sitesProvider: CoreSitesProvider, private filepoolProvider: CoreFilepoolProvider,
            @Optional() private content: Content, elementRef: ElementRef, private events: CoreEventsProvider,
            private utils: CoreUtilsProvider, private platform: Platform) {
        this.contentChanged = new EventEmitter<string>();
        this.element = elementRef.nativeElement as HTMLDivElement;
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
        this.editorElement.onchange = this.onChange.bind(this);
        this.editorElement.onkeyup = this.onChange.bind(this);
        this.editorElement.onpaste = this.onChange.bind(this);
        this.editorElement.oninput = this.onChange.bind(this);
        this.editorElement.onkeydown = this.moveCursor.bind(this);

        // Listen for changes on the control to update the editor (if it is updated from outside of this component).
        this.valueChangeSubscription = this.control.valueChanges.subscribe((param) => {
            this.setContent(param);
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
    }

    /**
     * Resize editor to maximize the space occupied.
     *
     * @return {Promise<number>} Resolved with calculated editor size.
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
                } else if (this.platform.is('ios') && this.kbHeight > 0) {
                    // Keyboard open in iOS.
                    // In this case, the header disappears or is scrollable, so we need to adjust the calculations.
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
                    this.element.style.height = this.domUtils.formatPixelsSize(height);
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
     * @param  {any} element Directive DOM element to get surroundings elements from.
     * @return {number}      Surrounding height in px.
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
     * @param {Event} $event The event.
     */
    onChange($event: Event): void {
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
     * @param {Event} $event The event.
     */
    moveCursor($event: Event): void {
        if (!this.rteEnabled) {
            return;
        }

        if ($event['key'] != 'ArrowLeft' && $event['key'] != 'ArrowRight') {
            return;
        }

        $event.preventDefault();
        $event.stopPropagation();

        const move = $event['key'] == 'ArrowLeft' ? -1 : +1,
            cursor = this.getCurrentCursorPosition(this.editorElement);

        this.setCurrentCursorPosition(this.editorElement, cursor + move);
    }

    /**
     * Returns the number of chars from the beggining where is placed the cursor.
     *
     * @param  {Node}   parent Parent where to get the position from.
     * @return {number}        Position in chars.
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
     * @param {Node}   parent   Parent where to set the position.
     * @param {number} [chars]  Number of chars where to place the caret. If not defined it will go to the end.
     */
    protected setCurrentCursorPosition(parent: Node, chars?: number): void {
        /**
         * Loops round all the child text nodes within the supplied node and sets a range from the start of the initial node to
         * the characters.
         *
         * @param  {Node}  node  Node where to start.
         * @param  {Range} range Previous calculated range.
         * @param  {any}   chars Object with counting of characters (input-output param).
         * @return {Range}       Selection range.
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
     * @param {Event} $event The event.
     */
    toggleEditor($event: Event): void {
        $event.preventDefault();
        $event.stopPropagation();

        this.setContent(this.control.value);

        this.rteEnabled = !this.rteEnabled;

        // Set focus and cursor at the end.
        // Modify the DOM directly so the keyboard stays open.
        if (this.rteEnabled) {
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
     * @param {string} value text
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
     * @param {string} value New content.
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
     * @param {any} $event Event data
     * @param {string} command Command to execute.
     */
    buttonAction($event: any, command: string): void {
        this.stopBubble($event);

        if (command) {
            if (command.includes('|')) {
                const parameters = command.split('|')[1];
                command = command.split('|')[0];

                document.execCommand(command, false, parameters);
            } else {
                document.execCommand(command, false);
            }
        }
    }

    /**
     * Hide the toolbar.
     */
    hideToolbar($event: any): void {
        this.stopBubble($event);

        this.toolbarHidden = true;
    }

    /**
     * Show the toolbar.
     */
    showToolbar(): void {
        this.editorElement.focus();
        this.toolbarHidden = false;
    }

    /**
     * Stop event default and propagation.
     *
     * @param {Event} event Event.
     */
    stopBubble(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
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
        const node = document.getSelection().focusNode;
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
    }
}
