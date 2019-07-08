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

import { Injectable } from '@angular/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Service with helper functions for tags.
 */
@Injectable()
export class CoreTagHelperProvider {

    constructor(protected domUtils: CoreDomUtilsProvider) {}

    /**
     * Parses the rendered content of the "core_tag/tagfeed" web template and returns the items.
     *
     * @param {string} content Rendered content.
     * @return {any[]} Area items.
     */
    parseFeedContent(content: string): any[] {
        const items = [];
        const element = this.domUtils.convertToElement(content);

        Array.from(element.querySelectorAll('ul.tag_feed > li.media')).forEach((itemElement) => {
            const item: any = { details: [] };

            Array.from(itemElement.querySelectorAll('div.media-body > div')).forEach((div: HTMLElement) => {
                if (div.classList.contains('media-heading')) {
                    item.heading = div.innerText.trim();
                    const link = div.querySelector('a');
                    if (link) {
                        item.url = link.getAttribute('href');
                    }
                } else {
                    // Separate details by lines.
                    const lines = [''];
                    Array.from(div.childNodes).forEach((childNode: Node) => {
                        if (childNode.nodeType == Node.TEXT_NODE) {
                            lines[lines.length - 1] += childNode.textContent;
                        } else if (childNode.nodeType == Node.ELEMENT_NODE) {
                            const childElement = childNode as HTMLElement;
                            if (childElement.tagName == 'BR') {
                                lines.push('');
                            } else {
                                lines[lines.length - 1] += childElement.innerText;
                            }
                        }
                    });
                    item.details.push(...lines.map((line) => line.trim()).filter((line) => line != ''));
                }
            });

            const image = itemElement.querySelector('div.itemimage img');
            if (image) {
                if (image.classList.contains('userpicture')) {
                    item.avatarUrl = image.getAttribute('src');
                } else {
                    item.iconUrl = image.getAttribute('src');
                }
            }

            if (item.heading && item.url) {
                items.push(item);
            }
        });

        return items;
    }
}
