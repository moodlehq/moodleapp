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


import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { TextInput } from 'ionic-angular';
import { CoreDomUtilsProvider } from '../../providers/utils/dom';
import { FormControl } from '@angular/forms';
import { Keyboard } from '@ionic-native/keyboard';

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
    templateUrl: 'rich-text-editor.html'
})
export class CoreRichTextEditorComponent {
    // Based on: https://github.com/judgewest2000/Ionic3RichText/
    // @todo: Resize, images, anchor button, fullscreen...

    @Input() placeholder?: string = ""; // Placeholder to set in textarea.
    @Input() control: FormControl; // Form control.
    @Output() public contentChanged: EventEmitter<string>;

    @ViewChild('editor') editor: ElementRef; // WYSIWYG editor.
    @ViewChild('textarea') textarea: TextInput; // Textarea editor.
    @ViewChild('decorate') decorate: ElementRef; // Buttons.

    rteEnabled: boolean = false;
    uniqueId = `rte{Math.floor(Math.random() * 1000000)}`;
    editorElement: HTMLDivElement;

    constructor(private domUtils: CoreDomUtilsProvider, private keyboard: Keyboard) {
        this.contentChanged = new EventEmitter<string>();
    }

    /**
     * Init editor
     */
    ngAfterContentInit() {
        this.domUtils.isRichTextEditorEnabled().then((enabled) => {
            this.rteEnabled = !!enabled;
        });

        // Setup the editor.
        this.editorElement = this.editor.nativeElement as HTMLDivElement;
        this.editorElement.innerHTML = this.control.value;
        this.textarea.value = this.control.value;
        this.control.setValue(this.control.value);

        this.editorElement.onchange = this.onChange.bind(this);
        this.editorElement.onkeyup = this.onChange.bind(this);
        this.editorElement.onpaste = this.onChange.bind(this);
        this.editorElement.oninput = this.onChange.bind(this);

        // Setup button actions.
        let buttons = (this.decorate.nativeElement as HTMLDivElement).getElementsByTagName('button');
        for (let i = 0; i < buttons.length; i++) {
            let button = buttons[i],
                command = button.getAttribute('data-command');

            if (command) {
                if (command.includes('|')) {
                    let parameter = command.split('|')[1];
                    command = command.split('|')[0];

                    button.addEventListener('click', ($event) => {
                        this.buttonAction($event, command, parameter);
                    });
                } else {
                    button.addEventListener('click', ($event) => {
                        this.buttonAction($event, command);
                    });
                }
            }
        }
    }

    /**
     * On change function to sync with form data.
     */
    onChange($event) {
        if (this.rteEnabled) {
            if (this.isNullOrWhiteSpace(this.editorElement.innerText)) {
                this.clearText();
            } else {
                this.control.setValue(this.editorElement.innerHTML);
            }
        } else {
            if (this.isNullOrWhiteSpace(this.textarea.value)) {
                this.clearText();
            } else {
                this.control.setValue(this.textarea.value);
            }
        }
        this.contentChanged.emit(this.control.value);
    }

    /**
     * Toggle from rte editor to textarea syncing values.
     */
    toggleEditor($event) {
        $event.preventDefault();
        $event.stopPropagation();

        if (this.isNullOrWhiteSpace(this.control.value)) {
            this.clearText();
        } else {
            this.editorElement.innerHTML = this.control.value;
            this.textarea.value = this.control.value;
        }

        this.rteEnabled = !this.rteEnabled;

        // Set focus and cursor at the end.
        setTimeout(() => {
            if (this.rteEnabled) {
                this.editorElement.focus();
                let range = document.createRange();
                range.selectNodeContents(this.editorElement);
                range.collapse(false);
                let sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                this.textarea.setFocus();
            }
            setTimeout(() => {
                this.keyboard.show();
            }, 1);
        }, 1);
    }

    /**
     * Check if text is empty.
     * @param {string} value text
     */
    private isNullOrWhiteSpace(value: string) {
        if (value == null || typeof value == "undefined") {
            return true;
        }
        value = value.replace(/[\n\r]/g, '');
        value = value.split(' ').join('');

        return value.length === 0;
    }

    /**
     * Clear the text.
     */
    clearText() {
        this.editorElement.innerHTML = '<p></p>';
        this.textarea.value = '';
        this.control.setValue(null);
    }

    /**
     * Execute an action over the selected text.
     *  API docs: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
     *
     * @param {any} $event       Event data
     * @param {string} command   Command to execute.
     * @param {any} [parameters] Parameters of the command.
     */
    private buttonAction($event: any, command: string, parameters: any = null) {
        $event.preventDefault();
        $event.stopPropagation();
        document.execCommand(command, false, parameters);
    }
}