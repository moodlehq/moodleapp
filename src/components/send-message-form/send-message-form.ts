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

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Component to display a "send message form".
 *
 * @description
 * This component will display a standalone send message form in order to have a better UX.
 *
 * Example usage:
 * <core-send-message-form (onSubmit)="sendMessage($event)" [placeholder]="'core.messages.newmessage' | translate"
 * [show-keyboard]="showKeyboard"></core-send-message-form>
 */
@Component({
    selector: 'core-send-message-form',
    templateUrl: 'core-send-message-form.html'
})
export class CoreSendMessageFormComponent implements OnInit {
    @Input() message: string; // Input text.
    @Input() placeholder = ''; // Placeholder for the input area.
    @Input() showKeyboard = false; // If keyboard is shown or not.
    @Output() onSubmit: EventEmitter<string>; // Send data when submitting the message form.
    @Output() onResize: EventEmitter<void>; // Emit when resizing the textarea.

    constructor(private utils: CoreUtilsProvider, private textUtils: CoreTextUtilsProvider) {
        this.onSubmit = new EventEmitter();
        this.onResize = new EventEmitter();
    }

    ngOnInit(): void {
        this.showKeyboard = this.utils.isTrueOrOne(this.showKeyboard);
    }

    /**
     * Form submitted.
     * @param {any} $event Form submit
     */
    submitForm($event: any): void {
        let value = this.message.trim();
        $event.target.reset();

        // Focus again on textarea.
        $event.target[0].focus();

        if (!value) {
            // Silent error.
            return;
        }

        value = this.textUtils.replaceNewLines(value, '<br>');
        this.onSubmit.emit(value);
    }

    /**
     * Textarea resized.
     */
    textareaResized(): void {
        this.onResize.emit();
    }
}
