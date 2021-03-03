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

import { Injectable, ViewContainerRef, ComponentFactoryResolver } from '@angular/core';

import { CoreFilterDefaultHandler } from '@features/filter/services/handlers/default-filter';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from '@features/filter/services/filter';
import { makeSingleton } from '@singletons';
import { CoreH5PPlayerComponent } from '@features/h5p/components/h5p-player/h5p-player';

/**
 * Handler to support the Display H5P filter.
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterDisplayH5PHandlerService extends CoreFilterDefaultHandler {

    name = 'AddonFilterDisplayH5PHandler';
    filterName = 'displayh5p';

    protected template = document.createElement('template'); // A template element to convert HTML to element.

    constructor(protected factoryResolver: ComponentFactoryResolver) {
        super();
    }

    /**
     * Filter some text.
     *
     * @param text The text to filter.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @param siteId Site ID. If not defined, current site.
     * @return Filtered text (or promise resolved with the filtered text).
     */
    filter(
        text: string,
        filter: CoreFilterFilter, // eslint-disable-line @typescript-eslint/no-unused-vars
        options: CoreFilterFormatTextOptions, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): string | Promise<string> {
        this.template.innerHTML = text;

        const h5pIframes = <HTMLIFrameElement[]> Array.from(this.template.content.querySelectorAll('iframe.h5p-iframe'));

        // Replace all iframes with an empty div that will be treated in handleHtml.
        h5pIframes.forEach((iframe) => {
            const placeholder = document.createElement('div');

            placeholder.classList.add('core-h5p-tmp-placeholder');
            placeholder.setAttribute('data-player-src', iframe.src);

            iframe.parentElement?.replaceChild(placeholder, iframe);
        });

        return this.template.innerHTML;
    }

    /**
     * Handle HTML. This function is called after "filter", and it will receive an HTMLElement containing the text that was
     * filtered.
     *
     * @param container The HTML container to handle.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @param viewContainerRef The ViewContainerRef where the container is.
     * @param component Component.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return If async, promise resolved when done.
     */
    handleHtml(
        container: HTMLElement,
        filter: CoreFilterFilter,
        options: CoreFilterFormatTextOptions,
        viewContainerRef: ViewContainerRef,
        component?: string,
        componentId?: string | number,
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): void | Promise<void> {

        const placeholders = <HTMLElement[]> Array.from(container.querySelectorAll('div.core-h5p-tmp-placeholder'));

        placeholders.forEach((placeholder) => {
            const url = placeholder.getAttribute('data-player-src') || '';

            // Create the component to display the player.
            const factory = this.factoryResolver.resolveComponentFactory(CoreH5PPlayerComponent);
            const componentRef = viewContainerRef.createComponent<CoreH5PPlayerComponent>(factory);

            componentRef.instance.src = url;
            componentRef.instance.component = component;
            componentRef.instance.componentId = componentId;

            // Move the component to its right position.
            placeholder.parentElement?.replaceChild(componentRef.instance.elementRef.nativeElement, placeholder);
        });
    }

}

export const AddonFilterDisplayH5PHandler = makeSingleton(AddonFilterDisplayH5PHandlerService);
