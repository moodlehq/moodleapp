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

import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonQtypeDdMarkerQuestion } from './ddmarker';

/**
 * Graphics API for drag-and-drop markers question type.
 */
export class AddonQtypeDdMarkerGraphicsApi {

    protected NS = 'http://www.w3.org/2000/svg';
    protected dropZone: SVGSVGElement;

    /**
     * Create the instance.
     *
     * @param instance Question instance.
     * @param domUtils Dom Utils provider.
     */
    constructor(protected instance: AddonQtypeDdMarkerQuestion, protected domUtils: CoreDomUtilsProvider) { }

    /**
     * Add a shape.
     *
     * @param shapeAttribs Attributes for the shape: type and color.
     * @param styles Object with the styles for the shape (name -> value).
     * @return The new shape.
     */
    addShape(shapeAttribs: {type: string, color: string}, styles: {[name: string]: number | string}): Element {
        const shape = document.createElementNS(this.NS, shapeAttribs.type);
        shape.setAttribute('fill', shapeAttribs.color);
        shape.setAttribute('fill-opacity', '0.5');
        shape.setAttribute('stroke', 'black');

        for (const x in styles) {
            shape.setAttribute(x, String(styles[x]));
        }

        this.dropZone.appendChild(shape);

        return shape;
    }

    /**
     * Clear the shapes.
     */
    clear(): void {
        const bgImg = this.instance.doc.bgImg(),
            position = this.domUtils.getElementXY(bgImg, null, 'ddarea'),
            dropZones = <HTMLElement> this.instance.doc.topNode().querySelector('div.ddarea div.dropzones');

        dropZones.style.left = position[0] + 'px';
        dropZones.style.top = position[1] + 'px';
        dropZones.style.width = bgImg.width + 'px';
        dropZones.style.height = bgImg.height + 'px';

        const markerTexts = this.instance.doc.markerTexts();
        markerTexts.style.left = position[0] + 'px';
        markerTexts.style.top = position[1] + 'px';
        markerTexts.style.width = bgImg.width + 'px';
        markerTexts.style.height = bgImg.height + 'px';

        if (!this.dropZone) {
            this.dropZone = <SVGSVGElement> document.createElementNS(this.NS, 'svg');
            dropZones.appendChild(this.dropZone);
        } else {
            // Remove all children.
            while (this.dropZone.firstChild) {
                this.dropZone.removeChild(this.dropZone.firstChild);
            }
        }

        this.dropZone.style.width = bgImg.width + 'px';
        this.dropZone.style.height = bgImg.height + 'px';

        this.instance.shapes = [];
    }
}
