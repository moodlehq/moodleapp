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

import { Component } from '@angular/core';
import { CoreQRScan } from '@services/qrscan';
import { ModalController, Translate } from '@singletons';
import { FAQ_QRCODE_IMAGE_HTML, FAQ_URL_IMAGE_HTML, GET_STARTED_URL } from '@features/login/constants';
import { SubPartial } from '@/core/utils/types';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays help to connect to a site.
 */
@Component({
    selector: 'core-login-site-help',
    templateUrl: 'site-help.html',
    styleUrl: 'site-help.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreLoginSiteHelpComponent {

    questions: Question[] = [];

    constructor() {
        const getStartedTitle = Translate.instant('core.login.faqsetupsitelinktitle');
        const canScanQR = CoreQRScan.canScanQR();
        const urlImageHtml = FAQ_URL_IMAGE_HTML;
        const qrCodeImageHtml = FAQ_QRCODE_IMAGE_HTML;
        const setupLinkHtml = `<a href="${GET_STARTED_URL}" title="${getStartedTitle}">${GET_STARTED_URL}</a>`;
        const questions: Array<QuestionDefinition | false> = [
            {
                text: Translate.instant('core.login.faqwhatisurlquestion'),
                answer: {
                    text: Translate.instant('core.login.faqwhatisurlanswer', { $image: urlImageHtml }),
                    format: AnswerFormat.SafeHTML,
                    class: 'core-login-faqwhatisurlanswer',
                },
            },
            {
                text: Translate.instant('core.login.faqcannotfindmysitequestion'),
                answer: {
                    text: Translate.instant('core.login.faqcannotfindmysiteanswer'),
                    format: AnswerFormat.Text,
                },
            },
            {
                text: Translate.instant('core.login.faqcantloginquestion'),
                answer: {
                    text: Translate.instant('core.login.faqcantloginanswer'),
                    format: AnswerFormat.SafeHTML,
                },
            },
            canScanQR && {
                text: Translate.instant('core.login.faqwhereisqrcode'),
                answer: {
                    text: Translate.instant('core.login.faqwhereisqrcodeanswer', { $image: qrCodeImageHtml }),
                    format: AnswerFormat.SafeHTML,
                    class: 'core-login-faqwhereisqrcodeanswer',
                },
            },
            {
                text: Translate.instant('core.login.faqsetupsitequestion'),
                answer: {
                    text: Translate.instant('core.login.faqsetupsiteanswer', { $link: setupLinkHtml }),
                    format: AnswerFormat.UnsafeHTML,
                },
            },
            {
                text: Translate.instant('core.login.faqtestappquestion'),
                answer: {
                    text: Translate.instant('core.login.faqtestappanswer'),
                    format: AnswerFormat.SafeHTML,
                },
            },
        ];

        for (const question of questions) {
            if (!question) {
                continue;
            }

            this.questions.push({
                ...question,
                id: this.questions.length + 1,
                answer: {
                    ...question.answer,
                    class: question.answer.class ?? '',
                },
            });
        }
    }

    /**
     * Close help modal.
     */
    close(): void {
        ModalController.dismiss();
    }

}

/**
 * Question data.
 */
interface Question {
    id: number;
    text: string;
    answer: Answer;
}

/**
 * Question answer.
 */
interface Answer {
    text: string;
    class: string;
    format: AnswerFormat;
}

/**
 * Question answer format.
 */
enum AnswerFormat {
    Text = 'text',
    SafeHTML = 'safe-html',
    UnsafeHTML = 'unsafe-html',
}

/**
 * Question definition.
 */
type QuestionDefinition = Omit<Question, 'id' | 'answer'> & {
    answer: SubPartial<Answer, 'class'>;
};
