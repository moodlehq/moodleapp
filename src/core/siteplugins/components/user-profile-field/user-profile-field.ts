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

import { Component, OnInit, Input, ViewChild, OnDestroy } from '@angular/core';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreCompileHtmlComponent } from '@core/compile/components/compile-html/compile-html';
import { Subscription } from 'rxjs';

/**
 * Component that displays a user profile field created using a site plugin.
 */
@Component({
    selector: 'core-site-plugins-user-profile-field',
    templateUrl: 'user-profile-field.html',
})
export class CoreSitePluginsUserProfileFieldComponent implements OnInit, OnDestroy {
    @Input() field: any; // The profile field to be rendered.
    @Input() signup = false; // True if editing the field in signup. Defaults to false.
    @Input() edit = false; // True if editing the field. Defaults to false.
    @Input() form?: any; // Form where to add the form control. Required if edit=true or signup=true.
    @Input() registerAuth?: string; // Register auth method. E.g. 'email'.

    @ViewChild(CoreCompileHtmlComponent) compileComponent: CoreCompileHtmlComponent;

    content = ''; // Content.
    jsData;
    protected componentObserver: Subscription;

    constructor(protected sitePluginsProvider: CoreSitePluginsProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {

        // Pass the input data to the component.
        this.jsData = {
            field: this.field,
            signup: this.signup,
            edit: this.edit,
            form: this.form,
            registerAuth: this.registerAuth
        };

        if (this.field) {
            // Retrieve the handler data.
            const handler = this.sitePluginsProvider.getSitePluginHandler(this.field.type || this.field.datatype),
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
