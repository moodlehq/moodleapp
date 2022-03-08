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

import { renderInlineStyles } from '@/core/utils/style-helpers';

/**
 * Helper class to calculate layout styles for the focused area in a User Tour.
 */
export class CoreUserToursFocusLayout {

    inlineStyles!: string;

    private targetBoundingBox: DOMRect;
    private targetComputedStyle: CSSStyleDeclaration;

    constructor(target: HTMLElement) {
        this.targetBoundingBox = target.getBoundingClientRect();
        this.targetComputedStyle = window.getComputedStyle(target);

        this.calculateStyles();
    }

    /**
     * Calculate styles.
     */
    private calculateStyles(): void {
        this.inlineStyles = renderInlineStyles({
            'top': this.targetBoundingBox.top,
            'left': this.targetBoundingBox.left,
            'width': this.targetBoundingBox.width,
            'height': this.targetBoundingBox.height,
            'border-top-left-radius': this.targetComputedStyle.borderTopLeftRadius,
            'border-top-right-radius': this.targetComputedStyle.borderTopRightRadius,
            'border-bottom-left-radius': this.targetComputedStyle.borderBottomLeftRadius,
            'border-bottom-right-radius': this.targetComputedStyle.borderBottomRightRadius,
        });
    }

}
