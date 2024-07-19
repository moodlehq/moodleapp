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

// A template element to convert HTML to element.
export const CoreTemplateElement: HTMLTemplateElement = document.createElement('template');

/**
 * Convert some HTML as text into an HTMLElement. This HTML is put inside a div or a body.
 *
 * @param html Text to convert.
 * @returns Element.
 */
export function convertHTMLToHTMLElement(html: string): HTMLElement {
   // Add a div to hold the content, that's the element that will be returned.
   CoreTemplateElement.innerHTML = '<div>' + html + '</div>';

   return <HTMLElement> CoreTemplateElement.content.children[0];
}
