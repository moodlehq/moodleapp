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

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreSitePluginsCompileInitComponent } from '../../classes/compile-init-component';
import { CoreQuestionDelegate } from '@core/question/providers/delegate';

/**
 * Component that displays a question created using a site plugin.
 */
@Component({
    selector: 'core-site-plugins-question',
    templateUrl: 'core-siteplugins-question.html',
})
export class CoreSitePluginsQuestionComponent extends CoreSitePluginsCompileInitComponent implements OnInit {
    @Input() question: any; // The question to render.
    @Input() component: string; // The component the question belongs to.
    @Input() componentId: number; // ID of the component the question belongs to.
    @Input() attemptId: number; // Attempt ID.
    @Input() offlineEnabled?: boolean | string; // Whether the question can be answered in offline.
    @Output() buttonClicked: EventEmitter<any>; // Should emit an event when a behaviour button is clicked.
    @Output() onAbort: EventEmitter<void>; // Should emit an event if the question should be aborted.

    constructor(sitePluginsProvider: CoreSitePluginsProvider, utils: CoreUtilsProvider,
            protected questionDelegate: CoreQuestionDelegate) {
        super(sitePluginsProvider, utils);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Pass the input and output data to the component.
        this.jsData.question = this.question;
        this.jsData.component = this.component;
        this.jsData.componentId = this.componentId;
        this.jsData.attemptId = this.attemptId;
        this.jsData.offlineEnabled = this.offlineEnabled;
        this.jsData.buttonClicked = this.buttonClicked;
        this.jsData.onAbort = this.onAbort;

        if (this.question) {
            this.getHandlerData(this.questionDelegate.getHandlerName('qtype_' + this.question.type));
        }
    }
}
