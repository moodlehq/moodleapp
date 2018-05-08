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

import { Component, OnInit, Input, Output, EventEmitter, ViewChild, OnDestroy } from '@angular/core';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreCompileHtmlComponent } from '@core/compile/components/compile-html/compile-html';
import { Subscription } from 'rxjs';

/**
 * Component that displays a question created using a site plugin.
 */
@Component({
    selector: 'core-site-plugins-question',
    templateUrl: 'question.html',
})
export class CoreSitePluginsQuestionComponent implements OnInit, OnDestroy {
    @Input() question: any; // The question to render.
    @Input() component: string; // The component the question belongs to.
    @Input() componentId: number; // ID of the component the question belongs to.
    @Input() attemptId: number; // Attempt ID.
    @Input() offlineEnabled?: boolean | string; // Whether the question can be answered in offline.
    @Output() buttonClicked: EventEmitter<any>; // Should emit an event when a behaviour button is clicked.
    @Output() onAbort: EventEmitter<void>; // Should emit an event if the question should be aborted.

    @ViewChild(CoreCompileHtmlComponent) compileComponent: CoreCompileHtmlComponent;

    content = ''; // Content.
    jsData;
    protected componentObserver: Subscription;

    constructor(protected sitePluginsProvider: CoreSitePluginsProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Pass the input and output data to the component.
        this.jsData = {
            question: this.question,
            component: this.component,
            componentId: this.componentId,
            attemptId: this.attemptId,
            offlineEnabled: this.offlineEnabled,
            buttonClicked: this.buttonClicked,
            onAbort: this.onAbort
        };

        if (this.question) {
            // Retrieve the handler data.
            const handler = this.sitePluginsProvider.getSitePluginHandler('qtype_' + this.question.type),
                handlerSchema = handler && handler.handlerSchema;

            if (handlerSchema) {
                // Load first template.
                if (handlerSchema.methodTemplates && handlerSchema.methodTemplates.length) {
                    this.content = handler.handlerSchema.methodTemplates[0].html;
                }

                // Wait for the instance to be created.
                if (this.compileComponent && this.compileComponent.componentObservable &&
                        handlerSchema.methodJSResult && handlerSchema.methodJSResult.componentInit) {
                    this.componentObserver = this.compileComponent.componentObservable.subscribe((instance) => {
                        if (instance) {
                            // Instance created, call component init.
                            handlerSchema.methodJSResult.componentInit.apply(instance);
                        }
                    });
                }
            }
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.componentObserver && this.componentObserver.unsubscribe();
    }
}
