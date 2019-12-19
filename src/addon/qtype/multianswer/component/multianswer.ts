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

import { Component, OnInit, Injector, ElementRef } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreQuestionBaseComponent } from '@core/question/classes/base-question-component';

/**
 * Component to render a multianswer question.
 */
@Component({
    selector: 'addon-qtype-multianswer',
    templateUrl: 'addon-qtype-multianswer.html'
})
export class AddonQtypeMultiAnswerComponent extends CoreQuestionBaseComponent implements OnInit {

    protected element: HTMLElement;

    constructor(logger: CoreLoggerProvider, injector: Injector, element: ElementRef) {
        super(logger, 'AddonQtypeMultiAnswerComponent', injector);

        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.initOriginalTextComponent('.formulation');
    }

    /**
     * The question has been rendered.
     */
    questionRendered(): void {
        this.questionHelper.treatCorrectnessIconsClicks(this.element, this.component, this.componentId, this.contextLevel,
                this.contextInstanceId, this.courseId);
    }
}
