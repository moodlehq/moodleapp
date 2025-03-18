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

import { Injectable, ViewContainerRef } from '@angular/core';

import { CoreFilterDefaultHandler } from '@features/filter/services/handlers/default-filter';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from '@features/filter/services/filter';
import { makeSingleton } from '@singletons';
import { CoreH5PPlayerComponent } from '@features/h5p/components/h5p-player/h5p-player';
import { CoreUrl } from '@singletons/url';
import { CoreH5PHelper } from '@features/h5p/classes/helper';
import { CoreText } from '@singletons/text';
import { CoreUtils } from '@singletons/utils';

/**
 * Handler to support the Display H5P filter.
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterDisplayH5PHandlerService extends CoreFilterDefaultHandler {

    name = 'AddonFilterDisplayH5PHandler';
    filterName = 'displayh5p';

    /**
     * @inheritdoc
     */
    filter(
        text: string,
    ): string {
        return CoreText.processHTML(text, (element) => {
            const h5pIframes = <HTMLIFrameElement[]> Array.from(element.querySelectorAll('iframe.h5p-iframe'));

            // Replace all iframes with an empty div that will be treated in handleHtml.
            h5pIframes.forEach((iframe) => {
                const placeholder = document.createElement('div');

                placeholder.classList.add('core-h5p-tmp-placeholder');
                placeholder.setAttribute('data-player-src', iframe.src);

                iframe.parentElement?.replaceChild(placeholder, iframe);
            });

            // Handle H5P iframes embedded using the embed HTML code.
            const embeddedH5PIframes = <HTMLIFrameElement[]> Array.from(
                element.querySelectorAll('iframe.h5p-player'),
            );

            embeddedH5PIframes.forEach((iframe) => {
                // Add the preventredirect param to allow authenticating if auto-login fails.
                iframe.src = CoreUrl.addParamsToUrl(iframe.src, { preventredirect: false });

                // Add resizer script so the H5P has the right height.
                CoreH5PHelper.addResizerScript();

                // If the iframe has a small height, add some minimum initial height so it's seen if auto-login fails.
                const styleHeight = Number(iframe.style.height);
                const height = Number(iframe.getAttribute('height'));
                if ((!height || height < 400) && (!styleHeight || styleHeight < 400)) {
                    iframe.style.height = '400px';
                }
            });
        });
    }

    /**
     * @inheritdoc
     */
    handleHtml(
        container: HTMLElement,
        filter: CoreFilterFilter,
        options: CoreFilterFormatTextOptions,
        viewContainerRef: ViewContainerRef,
        component?: string,
        componentId?: string | number,
    ): void {

        const placeholders = <HTMLElement[]> Array.from(container.querySelectorAll('div.core-h5p-tmp-placeholder'));

        placeholders.forEach((placeholder) => {
            if (!placeholder.parentElement) {
                return;
            }

            // Create the component to display the player.
            const h5pInstance = viewContainerRef.createComponent<CoreH5PPlayerComponent>(CoreH5PPlayerComponent).instance;

            const url = placeholder.getAttribute('data-player-src') || '';
            h5pInstance.src = url;
            h5pInstance.component = component;
            h5pInstance.componentId = componentId;

            // Check if auto-play was enabled when inserting the iframe using the TinyMCE editor.
            h5pInstance.autoPlay = CoreUtils.isTrueOrOne(placeholder.parentElement.dataset.mobileappAutoplay);

            // Move the component to its right position.
            placeholder.parentElement.replaceChild(h5pInstance.getElement(), placeholder);
        });
    }

}

export const AddonFilterDisplayH5PHandler = makeSingleton(AddonFilterDisplayH5PHandlerService);
