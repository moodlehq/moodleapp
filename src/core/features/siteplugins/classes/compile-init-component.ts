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

import { CoreObject } from '@singletons/object';
import { CoreSitePlugins, CoreSitePluginsInitHandlerData } from '../services/siteplugins';
import { Type } from '@angular/core';

/**
 * Base class for components that will display a component using core-compile-html and want to call a
 * componentInit function returned by the handler JS.
 */
export class CoreSitePluginsCompileInitComponent {

    content = ''; // Content.
    jsData: Record<string, unknown> = {}; // Data to pass to the component.
    extraImports: Type<unknown>[] = [];
    protected handlerSchema?: CoreSitePluginsInitHandlerData; // The handler data.

    /**
     * Function called when the component is created.
     *
     * @param instance The component instance.
     */
    componentCreated(instance: unknown): void {
        // Check if the JS defined an init function.
        if (instance && this.handlerSchema?.methodJSResult?.componentInit) {
            this.handlerSchema.methodJSResult.componentInit.apply(instance);
        }
    }

    /**
     * Get the handler data.
     *
     * @param name The name of the handler.
     */
    getHandlerData(name: string): void {
        // Retrieve the handler data.
        const handler = CoreSitePlugins.getSitePluginHandler(name);

        this.handlerSchema = handler?.handlerSchema;

        if (!this.handlerSchema) {
            return;
        }

        // Load first template.
        if (this.handlerSchema.methodTemplates?.length) {
            this.content = this.handlerSchema.methodTemplates[0].html;
            this.jsData.CONTENT_TEMPLATES = CoreObject.toKeyValueMap(
                this.handlerSchema.methodTemplates,
                'id',
                'html',
            );
        }

        // Pass data from the method result to the component.
        if (this.handlerSchema.methodOtherdata) {
            this.jsData.CONTENT_OTHERDATA = this.handlerSchema.methodOtherdata;
        }

        if (this.handlerSchema.methodJSResult) {
            this.jsData.CONTENT_JS_RESULT = this.handlerSchema.methodJSResult;
        }
    }

}
