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

import { AfterViewInit, Component, ElementRef, HostBinding, OnDestroy } from '@angular/core';

import { CoreUtils } from '@services/utils/utils';
import { ModalController, Translate } from '@singletons';
import { FAQ_QRCODE_IMAGE_HTML, FAQ_URL_IMAGE_HTML, GET_STARTED_URL } from '@features/login/constants';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCancellablePromise } from '@classes/cancellable-promise';

/**
 * Component that displays help to connect to a site.
 */
@Component({
    selector: 'core-login-site-help',
    templateUrl: 'site-help.html',
    styleUrls: ['site-help.scss'],
})
export class CoreLoginSiteHelpComponent implements AfterViewInit, OnDestroy {

    openQuestion?: number;
    questions: Question[] = [];
    @HostBinding('class.hydrated') hydrated = false;

    private promises: CoreCancellablePromise[] = [];

    constructor(protected el: ElementRef<HTMLElement>) {
        const getStartedTitle = Translate.instant('core.login.faqsetupsitelinktitle');
        const canScanQR = CoreUtils.canScanQR();
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
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        const answers = Array.from(this.el.nativeElement.querySelectorAll<HTMLElement>('.core-login-site-help--answer'));

        await Promise.all(answers.map(async answer => {
            await this.track(CoreUtils.waitFor(() => answer.clientHeight !== 0));
            await this.track(CoreDomUtils.waitForImages(answer));

            answer.style.setProperty('--height', `${answer.clientHeight}px`);
        }));

        this.hydrated = true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.promises.forEach(promise => promise.cancel());
    }

    /**
     * Check whether the given question is open or not.
     *
     * @param question Question.
     * @returns Whether the given question is open.
     */
    isOpen(question: Question): boolean {
        return this.openQuestion === question.id;
    }

    /**
     * Toggle question.
     *
     * @param question Question to toggle.
     */
    toggle(question: Question): void {
        if (question.id === this.openQuestion) {
            delete this.openQuestion;

            return;
        }

        this.openQuestion = question.id;
    }

    /**
     * Close help modal.
     */
    close(): void {
        ModalController.dismiss();
    }

    /**
     * Track a promise for cleanup.
     *
     * @param promise Cancellable promise.
     * @returns The promise.
     */
    protected track<T>(promise: CoreCancellablePromise<T>): Promise<T>  {
        const remove = () => {
            const index = this.promises.indexOf(promise);

            if (index === -1) {
                return;
            }

            this.promises.splice(index, 1);
        };

        this.promises.push(promise);

        promise.then(remove).catch(remove);

        return promise;
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
    answer: Omit<Answer, 'class'> & Partial<Pick<Answer, 'class'>>;
};
