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

import { Component, OnInit, ElementRef } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { FileEntry } from '@ionic-native/file/ngx';

import { CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { AddonModQuizEssayQuestion, CoreQuestionBaseComponent } from '@features/question/classes/base-question-component';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { CoreTextUtils } from '@services/utils/text';
import { CoreFileSession } from '@services/file-session';
import { CoreQuestion } from '@features/question/services/question';
import { CoreFileEntry } from '@services/file-helper';
/**
 * Component to render an essay question.
 */
@Component({
    selector: 'addon-qtype-essay',
    templateUrl: 'addon-qtype-essay.html',
})
export class AddonQtypeEssayComponent extends CoreQuestionBaseComponent implements OnInit {

    formControl?: FormControl;
    attachments?: CoreFileEntry[];
    uploadFilesSupported = false;
    essayQuestion?: AddonModQuizEssayQuestion;

    constructor(elementRef: ElementRef, protected fb: FormBuilder) {
        super('AddonQtypeEssayComponent', elementRef);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.uploadFilesSupported = typeof this.question?.responsefileareas != 'undefined';
        this.initEssayComponent(this.review);
        this.essayQuestion = this.question;

        this.formControl = this.fb.control(this.essayQuestion?.textarea?.text);

        if (this.essayQuestion?.allowsAttachments && this.uploadFilesSupported && !this.review) {
            this.loadAttachments();
        }
    }

    /**
     * Load attachments.
     *
     * @return Promise resolved when done.
     */
    async loadAttachments(): Promise<void> {
        if (this.offlineEnabled && this.essayQuestion?.localAnswers?.attachments_offline) {

            const attachmentsData: CoreFileUploaderStoreFilesResult = CoreTextUtils.parseJSON(
                this.essayQuestion.localAnswers.attachments_offline,
                {
                    online: [],
                    offline: 0,
                },
            );
            let offlineFiles: FileEntry[] = [];

            if (attachmentsData.offline) {
                offlineFiles = <FileEntry[]> await CoreQuestionHelper.getStoredQuestionFiles(
                    this.essayQuestion,
                    this.component || '',
                    this.componentId || -1,
                );
            }

            this.attachments = [...attachmentsData.online, ...offlineFiles];
        } else {
            this.attachments = Array.from(CoreQuestionHelper.getResponseFileAreaFiles(this.question!, 'attachments'));
        }

        CoreFileSession.setFiles(
            this.component || '',
            CoreQuestion.getQuestionComponentId(this.question!, this.componentId || -1),
            this.attachments,
        );
    }

}
