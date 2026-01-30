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

import { Component, ElementRef, effect, input, inject } from '@angular/core';
import { CoreDom } from '@static/dom';

/**
 * Component to add a <style> tag.
 *
 * @description
 * This component will include a <style> tag with some CSS rules that can optionally be pefixed.
 *
 * Example:
 *
 * <core-style [css]="'p { color: red; }'" prefix=".custom-rules"></core-style>
 * @deprecated since 4.5. Not needed anymore, core-compile-html accepts now CSS code.
 */
@Component({
    selector: 'core-style',
    template: '',
    imports: [],
})
export class CoreStyleComponent {

    readonly css = input(''); // CSS rules.
    readonly prefix = input(''); // Prefix to add to CSS rules.

    protected element: HTMLElement = inject(ElementRef).nativeElement;

    constructor() {
        effect(() => {
            const style = document.createElement('style');
            style.innerHTML = CoreDom.prefixCSS(this.css(), this.prefix());

            this.element.innerHTML = '';
            this.element.appendChild(style);
        });
    }

}
