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

import { Component, Input } from '@angular/core';
import { ContextLevel } from '@/core/constants';
import { CorePromisedValue } from '@classes/promised-value';
import { AsyncDirective } from '@classes/async-directive';

/**
 * Base class for editor implementations.
 */
@Component({
    template: '',
})
export abstract class CoreEditorBaseComponent implements AsyncDirective {

    @Input() placeholder = ''; // Placeholder to set in textarea.
    @Input() component?: string; // The component to link the files to.
    @Input() componentId?: number; // An ID to use in conjunction with the component.
    @Input() contextLevel?: ContextLevel; // The context level of the text.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() ariaLabelledBy?: string; // ID of the element which serves as label.
    @Input() onChange?: (content: string) => void; // Function to call when the content of the editor changes.

    /** Editor implementations need to resolve this promise at the end of ngAfterViewInit. */
    protected onReadyPromise = new CorePromisedValue<void>();

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return await this.onReadyPromise;
    }

    /**
     * Called to set the initial content of the editor,
     * and when the form value is changed by the code using the editor.
     *
     * @param value New content.
     */
    abstract setContent(value: string): void;

    /**
     * Called when the editor is resized.
     */
    async onResize(): Promise<void> {
        // Do nothing by default.
    }

}
