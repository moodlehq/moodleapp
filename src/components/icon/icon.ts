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

import { Component, Input, OnInit, ElementRef } from '@angular/core';

/**
 * Core Icon is a component that enabled a posibility to add fontawesome icon to the html. It's recommended if both fontawesome
 * or ionicons can be used in the name attribute. To use fontawesome just place the full icon name with the fa- prefix and
 * the component will detect it.
 * Check available icons https://fontawesome.com/v4.7.0/icons/.
 */
@Component({
    selector: 'core-icon',
    templateUrl: 'core-icon.html',
})
export class CoreIconComponent implements OnInit {
    // Common params.
    @Input() name: string;
    @Input('color') color?: string;

    // Ionicons params.
    @Input('isActive') isActive?: boolean;
    @Input('md') md?: string;
    @Input('ios') ios?: string;

    // FontAwesome params.
    @Input('fixed-width') fixedWidth: string;
    element: HTMLElement;

    constructor(el: ElementRef) {
        this.element = el.nativeElement;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        let newElement;

        if (this.name.startsWith('fa-')) {
            // Use a new created element to avoid ion-icon working.
            newElement = document.createElement('ion-icon');
            newElement.classList.add('icon');
            newElement.classList.add('fa');
            newElement.classList.add(this.name);
            if (this.isTrueProperty(this.fixedWidth)) {
                newElement.classList.add('fa-fw');
            }
            if (this.color) {
                newElement.classList.add('fa-' + this.color);
            }
        } else {
            newElement = this.element.firstElementChild;
        }

        const attrs = this.element.attributes;
        for (let i = attrs.length - 1; i >= 0; i--) {
            newElement.setAttribute(attrs[i].name, attrs[i].value);
        }

        this.element.parentElement.replaceChild(newElement, this.element);
    }

    /**
     * Check if the value is true or on.
     *
     * @param  {any}     val value to be checked.
     * @return {boolean}     If has a value equivalent to true.
     */
    isTrueProperty(val: any): boolean {
      if (typeof val === 'string') {
          val = val.toLowerCase().trim();

          return (val === 'true' || val === 'on' || val === '');
      }

      return !!val;
  }
}
