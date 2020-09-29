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

import { Component, OnInit, Injector } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreWSExternalFile } from '@providers/ws';
import { CoreQuestionBaseComponent } from '@core/question/classes/base-question-component';
import { CoreQuestion } from '@core/question/providers/question';
import { FormControl, FormBuilder } from '@angular/forms';
import { CoreFileSession } from '@providers/file-session';

/**
 * Component to render an essay question.
 */
@Component({
    selector: 'addon-qtype-essay',
    templateUrl: 'addon-qtype-essay.html'
})
export class AddonQtypeEssayComponent extends CoreQuestionBaseComponent implements OnInit {

    protected formControl: FormControl;

    attachments: CoreWSExternalFile[];
    uploadFilesSupported: boolean;

    constructor(logger: CoreLoggerProvider, injector: Injector, protected fb: FormBuilder) {
        super(logger, 'AddonQtypeEssayComponent', injector);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.uploadFilesSupported = typeof this.question.responsefileareas != 'undefined';
        this.initEssayComponent();

        this.formControl = this.fb.control(this.question.textarea && this.question.textarea.text);

        if (this.question.allowsAttachments && this.uploadFilesSupported) {
            this.attachments = Array.from(this.questionHelper.getResponseFileAreaFiles(this.question, 'attachments'));
            CoreFileSession.instance.setFiles(this.component,
                    CoreQuestion.instance.getQuestionComponentId(this.question, this.componentId), this.attachments);
        }
    }
}
