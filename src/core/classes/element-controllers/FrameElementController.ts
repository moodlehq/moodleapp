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

import { ElementController } from './ElementController';

/**
 * Possible types of frame elements.
 *
 * @todo Remove frame TAG support.
 */
export type FrameElement = HTMLIFrameElement | HTMLFrameElement | HTMLObjectElement | HTMLEmbedElement;

/**
 * Wrapper class to control the interactivity of a frame element.
 */
export class FrameElementController extends ElementController {

    private frame: FrameElement;
    private placeholder: Node;

    constructor(element: FrameElement, enabled: boolean) {
        super(enabled);

        this.frame = element;
        this.placeholder = document.createComment('disabled frame placeholder');

        enabled || this.onDisabled();
    }

    /**
     * @inheritdoc
     */
    onEnabled(): void {
        this.placeholder.parentElement?.replaceChild(this.frame, this.placeholder);
    }

    /**
     * @inheritdoc
     */
    onDisabled(): void {
        this.frame.parentElement?.replaceChild(this.placeholder, this.frame);
    }

}
