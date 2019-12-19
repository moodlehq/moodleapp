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

import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonQtypeDdMarkerGraphicsApi } from './graphics_api';

/**
 * Encapsulates operations on dd area.
 */
export interface AddonQtypeDdMarkerQuestionDocStructure {
    topNode?: () => HTMLElement;
    bgImg?: () => HTMLImageElement;
    dragItemsArea?: () => HTMLElement;
    dragItems?: () => HTMLElement[];
    dragItemsForChoice?: (choiceNo: number) => HTMLElement[];
    dragItemForChoice?: (choiceNo: number, itemNo: number) => HTMLElement;
    dragItemBeingDragged?: (choiceNo: number) => HTMLElement;
    dragItemHome?: (choiceNo: number) => HTMLElement;
    dragItemHomes?: () => HTMLElement[];
    getClassnameNumericSuffix?: (node: HTMLElement, prefix: string) => number;
    inputsForChoices?: () => HTMLElement[];
    inputForChoice?: (choiceNo: number) => HTMLElement;
    markerTexts?: () => HTMLElement;
}

/**
 * Class to make a question of ddmarker type work.
 */
export class AddonQtypeDdMarkerQuestion {
    protected COLOURS = ['#FFFFFF', '#B0C4DE', '#DCDCDC', '#D8BFD8', '#87CEFA', '#DAA520', '#FFD700', '#F0E68C'];

    protected logger: any;
    protected afterImageLoadDone = false;
    protected drops;
    protected topNode;
    protected nextColourIndex = 0;
    protected proportion = 1;
    protected selected: HTMLElement; // Selected element (being "dragged").
    protected graphics: AddonQtypeDdMarkerGraphicsApi;
    protected resizeFunction;

    doc: AddonQtypeDdMarkerQuestionDocStructure;
    shapes = [];

    /**
     * Create the instance.
     *
     * @param logger Logger provider.
     * @param domUtils Dom Utils provider.
     * @param textUtils Text Utils provider.
     * @param container The container HTMLElement of the question.
     * @param question The question instance.
     * @param readOnly Whether it's read only.
     * @param dropZones The drop zones received in the init object of the question.
     * @param imgSrc Background image source (3.6+ sites).
     */
    constructor(logger: CoreLoggerProvider, protected domUtils: CoreDomUtilsProvider, protected textUtils: CoreTextUtilsProvider,
            protected container: HTMLElement, protected question: any, protected readOnly: boolean, protected dropZones: any[],
            protected imgSrc?: string) {
        this.logger = logger.getInstance('AddonQtypeDdMarkerQuestion');

        this.graphics = new AddonQtypeDdMarkerGraphicsApi(this, this.domUtils);

        this.initializer(question);
    }

    /**
     * Calculate image proportion to make easy conversions.
     */
    calculateImgProportion(): void {
        const bgImg = this.doc.bgImg();

        // Render the position related to the current image dimensions.
        this.proportion = 1;
        if (bgImg.width != bgImg.naturalWidth) {
            this.proportion = bgImg.width / bgImg.naturalWidth;
        }
    }

    /**
     * Create a new draggable element cloning a certain element.
     *
     * @param dragHome The element to clone.
     * @param itemNo The number of the new item.
     * @return The new element.
     */
    cloneNewDragItem(dragHome: HTMLElement, itemNo: number): HTMLElement {
        const marker = <HTMLElement> dragHome.querySelector('span.markertext');
        marker.style.opacity = '0.6';

        // Clone the element and add the right classes.
        const drag = <HTMLElement> dragHome.cloneNode(true);
        drag.classList.remove('draghome');
        drag.classList.add('dragitem');
        drag.classList.add('item' + itemNo);

        // Insert the new drag after the dragHome.
        dragHome.parentElement.insertBefore(drag, dragHome.nextSibling);
        if (!this.readOnly) {
            this.draggable(drag);
        }

        return drag;
    }

    /**
     * Convert the X and Y position of the BG IMG to a position relative to the window.
     *
     * @param bgImgXY X and Y of the BG IMG relative position.
     * @return Position relative to the window.
     */
    convertToWindowXY(bgImgXY: number[]): number[] {
        const bgImg = this.doc.bgImg(),
            position = this.domUtils.getElementXY(bgImg, null, 'ddarea');

        // Render the position related to the current image dimensions.
        bgImgXY[0] *= this.proportion;
        bgImgXY[1] *= this.proportion;

        return [Number(bgImgXY[0]) + position[0], Number(bgImgXY[1]) + position[1]];
    }

    /**
     * Check if some coordinates (X, Y) are inside the background image.
     *
     * @param coords Coordinates to check.
     * @return Whether they're inside the background image.
     */
    coordsInImg(coords: number[]): boolean {
        const bgImg = this.doc.bgImg();

        return (coords[0] * this.proportion <= bgImg.width && coords[1] * this.proportion <= bgImg.height);
    }

    /**
     * Deselect all draggable items.
     */
    deselectDrags(): void {
        const drags = this.doc.dragItems();
        drags.forEach((drag) => {
            drag.classList.remove('beingdragged');
        });
        this.selected = null;
    }

    /**
     * Function to call when the instance is no longer needed.
     */
    destroy(): void {
        if (this.resizeFunction) {
            window.removeEventListener('resize', this.resizeFunction);
        }
    }

    /**
     * Returns an object to encapsulate operations on dd area.
     *
     * @param slot The question slot.
     * @return The object.
     */
    docStructure(slot: number): AddonQtypeDdMarkerQuestionDocStructure {
        const topNode = <HTMLElement> this.container.querySelector('.addon-qtype-ddmarker-container'),
            dragItemsArea = <HTMLElement> topNode.querySelector('div.dragitems');

        return {
            topNode: (): HTMLElement => {
                return topNode;
            },
            bgImg: (): HTMLImageElement => {
                return <HTMLImageElement> topNode.querySelector('.dropbackground');
            },
            dragItemsArea: (): HTMLElement => {
                return dragItemsArea;
            },
            dragItems: (): HTMLElement[] => {
                return <HTMLElement[]> Array.from(dragItemsArea.querySelectorAll('.dragitem'));
            },
            dragItemsForChoice: (choiceNo: number): HTMLElement[] => {
                return <HTMLElement[]> Array.from(dragItemsArea.querySelectorAll('span.dragitem.choice' + choiceNo));
            },
            dragItemForChoice: (choiceNo: number, itemNo: number): HTMLElement => {
                return <HTMLElement> dragItemsArea.querySelector('span.dragitem.choice' + choiceNo + '.item' + itemNo);
            },
            dragItemBeingDragged: (choiceNo: number): HTMLElement => {
                return <HTMLElement> dragItemsArea.querySelector('span.dragitem.beingdragged.choice' + choiceNo);
            },
            dragItemHome: (choiceNo: number): HTMLElement => {
                return <HTMLElement> dragItemsArea.querySelector('span.draghome.choice' + choiceNo);
            },
            dragItemHomes: (): HTMLElement[] => {
                return <HTMLElement[]> Array.from(dragItemsArea.querySelectorAll('span.draghome'));
            },
            getClassnameNumericSuffix: (node: HTMLElement, prefix: string): number => {

                if (node.classList && node.classList.length) {
                    const patt1 = new RegExp('^' + prefix + '([0-9])+$'),
                        patt2 = new RegExp('([0-9])+$');

                    for (let index = 0; index < node.classList.length; index++) {
                        if (patt1.test(node.classList[index])) {
                            const match = patt2.exec(node.classList[index]);

                            return Number(match[0]);
                        }
                    }
                }

                this.logger.warn('Prefix "' + prefix + '" not found in class names.');
            },
            inputsForChoices: (): HTMLElement[] => {
                return <HTMLElement[]> Array.from(topNode.querySelectorAll('input.choices'));
            },
            inputForChoice: (choiceNo: number): HTMLElement => {
                return <HTMLElement> topNode.querySelector('input.choice' + choiceNo);
            },
            markerTexts: (): HTMLElement => {
                return <HTMLElement> topNode.querySelector('div.markertexts');
            }
        };
    }

    /**
     * Make an element "draggable". In the mobile app, items are "dragged" using tap and drop.
     *
     * @param drag Element.
     */
    draggable(drag: HTMLElement): void {
        drag.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const dragging = this.selected;
            if (dragging && !drag.classList.contains('unplaced')) {

                const position = this.domUtils.getElementXY(drag, null, 'ddarea'),
                    bgImg = this.doc.bgImg(),
                    bgImgPos = this.domUtils.getElementXY(bgImg, null, 'ddarea');

                position[0] = position[0] - bgImgPos[0] + e.offsetX;
                position[1] = position[1] - bgImgPos[1] + e.offsetY;

                // Ensure the we click on a placed dragitem.
                if (position[0] <= bgImg.width && position[1] <= bgImg.height) {
                    this.deselectDrags();
                    this.dropDrag(dragging, position);

                    return;
                }
            }

            if (drag.classList.contains('beingdragged')) {
                this.deselectDrags();
            } else {
                this.selectDrag(drag);
            }
        });
    }

    /**
     * Get the coordinates of the drag home of a certain choice.
     *
     * @param choiceNo Choice number.
     * @return Coordinates.
     */
    dragHomeXY(choiceNo: number): number[] {
        const dragItemHome = this.doc.dragItemHome(choiceNo),
            position = this.domUtils.getElementXY(dragItemHome, null, 'ddarea');

        return [position[0], position[1]];
    }

    /**
     * Draw a drop zone.
     *
     * @param dropZoneNo Number of the drop zone.
     * @param markerText The marker text to set.
     * @param shape Name of the shape of the drop zone (circle, rectangle, polygon).
     * @param coords Coordinates of the shape.
     * @param colour Colour of the shape.
     */
    drawDropZone(dropZoneNo: number, markerText: string, shape: string, coords: string, colour: string): void {
        let existingMarkerText: HTMLElement;

        const markerTexts = this.doc.markerTexts();
        // Check if there is already a marker text for this drop zone.
        existingMarkerText = <HTMLElement> markerTexts.querySelector('span.markertext' + dropZoneNo);

        if (existingMarkerText) {
            // Marker text already exists. Update it or remove it if empty.
            if (markerText !== '') {
                existingMarkerText.innerHTML = markerText;
            } else {
                existingMarkerText.remove();
            }
        } else if (markerText !== '') {
            // Create and add the marker text.
            const classNames = 'markertext markertext' + dropZoneNo,
                span = document.createElement('span');

            span.className = classNames;
            span.innerHTML = markerText;

            markerTexts.appendChild(span);
        }

        // Check that a function to draw this shape exists.
        const drawFunc = 'drawShape' + this.textUtils.ucFirst(shape);
        if (this[drawFunc] instanceof Function) {

            // Call the function.
            const xyForText = this[drawFunc](dropZoneNo, coords, colour);
            if (xyForText !== null) {

                // Search the marker for the drop zone.
                const markerSpan = <HTMLElement> this.doc.topNode().querySelector(
                        'div.ddarea div.markertexts span.markertext' + dropZoneNo);
                if (markerSpan !== null) {

                    xyForText[0] = (xyForText[0] - markerSpan.offsetWidth / 2) * this.proportion;
                    xyForText[1] = (xyForText[1] - markerSpan.offsetHeight / 2) * this.proportion;

                    markerSpan.style.opacity = '0.6';
                    markerSpan.style.left = xyForText[0] + 'px';
                    markerSpan.style.top = xyForText[1] + 'px';

                    const markerSpanAnchor = markerSpan.querySelector('a');
                    if (markerSpanAnchor !== null) {

                        markerSpanAnchor.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            this.shapes.forEach((elem) => {
                                elem.css('fill-opacity', 0.5);
                            });

                            this.shapes[dropZoneNo].css('fill-opacity', 1);
                            setTimeout(() => {
                                this.shapes[dropZoneNo].css('fill-opacity', 0.5);
                            }, 2000);
                        });

                        markerSpanAnchor.setAttribute('tabIndex', '0');
                   }
               }
           }
        }
    }

    /**
     * Draw a circle in a drop zone.
     *
     * @param dropZoneNo Number of the drop zone.
     * @param coords Coordinates of the circle.
     * @param colour Colour of the circle.
     * @return X and Y position of the center of the circle.
     */
    drawShapeCircle(dropZoneNo: number, coords: string, colour: string): number[] {
        // Extract the numbers in the coordinates.
        const coordsParts = coords.match(/(\d+),(\d+);(\d+)/);

        if (coordsParts && coordsParts.length === 4) {
            // Remove first element and convert them to number.
            coordsParts.shift();

            const coordsPartsNum = coordsParts.map((i) => {
               return Number(i);
            });

            // Calculate circle limits and check it's inside the background image.
            const circleLimit = [coordsPartsNum[0] - coordsPartsNum[2], coordsPartsNum[1] - coordsPartsNum[2]];
            if (this.coordsInImg(circleLimit)) {
                // All good, create the shape.
                this.shapes[dropZoneNo] = this.graphics.addShape({
                    type: 'circle',
                    color: colour
                }, {
                    cx: coordsPartsNum[0] * this.proportion,
                    cy: coordsPartsNum[1] * this.proportion,
                    r: coordsPartsNum[2] * this.proportion
                });

                // Return the center.
                return [coordsPartsNum[0], coordsPartsNum[1]];
            }
        }

        return null;
    }

    /**
     * Draw a rectangle in a drop zone.
     *
     * @param dropZoneNo Number of the drop zone.
     * @param coords Coordinates of the rectangle.
     * @param colour Colour of the rectangle.
     * @return X and Y position of the center of the rectangle.
     */
    drawShapeRectangle(dropZoneNo: number, coords: string, colour: string): number[] {
        // Extract the numbers in the coordinates.
        const coordsParts = coords.match(/(\d+),(\d+);(\d+),(\d+)/);

        if (coordsParts && coordsParts.length === 5) {
            // Remove first element and convert them to number.
            coordsParts.shift();

            const coordsPartsNum = coordsParts.map((i) => {
               return Number(i);
            });

            // Calculate rectangle limits and check it's inside the background image.
            const rectLimits = [coordsPartsNum[0] + coordsPartsNum[2], coordsPartsNum[1] + coordsPartsNum[3]];
            if (this.coordsInImg(rectLimits)) {
                // All good, create the shape.
                this.shapes[dropZoneNo] = this.graphics.addShape({
                    type: 'rect',
                    color: colour
                }, {
                    x: coordsPartsNum[0] * this.proportion,
                    y: coordsPartsNum[1] * this.proportion,
                    width: coordsPartsNum[2] * this.proportion,
                    height: coordsPartsNum[3] * this.proportion
                });

                // Return the center.
                return [coordsPartsNum[0] + coordsPartsNum[2] / 2, coordsPartsNum[1] + coordsPartsNum[3] / 2];
            }
        }

        return null;
    }

    /**
     * Draw a polygon in a drop zone.
     *
     * @param dropZoneNo Number of the drop zone.
     * @param coords Coordinates of the polygon.
     * @param colour Colour of the polygon.
     * @return X and Y position of the center of the polygon.
     */
    drawShapePolygon(dropZoneNo: number, coords: string, colour: string): number[] {
        const coordsParts = coords.split(';'),
            points = [],
            bgImg = this.doc.bgImg(),
            maxXY = [0, 0],
            minXY = [bgImg.width, bgImg.height];

        for (const i in coordsParts) {
            // Extract the X and Y of this point.
            const partsString = coordsParts[i].match(/^(\d+),(\d+)$/),
                parts = partsString && partsString.map((part) => {
                    return Number(part);
                });

            if (parts !== null && this.coordsInImg([parts[1], parts[2]])) {
                parts[1] *= this.proportion;
                parts[2] *= this.proportion;

                // Calculate min and max points to find center to show marker on.
                minXY[0] = Math.min(parts[1], minXY[0]);
                minXY[1] = Math.min(parts[2], minXY[1]);
                maxXY[0] = Math.max(parts[1], maxXY[0]);
                maxXY[1] = Math.max(parts[2], maxXY[1]);

                points.push(parts[1] + ',' + parts[2]);
            }
        }

        if (points.length > 2) {
            this.shapes[dropZoneNo] = this.graphics.addShape({
                type: 'polygon',
                color: colour
            }, {
                points: points.join(' ')
            });

            // Return the center.
            return [(minXY[0] + maxXY[0]) / 2, (minXY[1] + maxXY[1]) / 2];
        }

        return null;
    }

    /**
     * Drop a drag element into a certain position.
     *
     * @param drag The element to drop.
     * @param position Position to drop to (X, Y).
     */
    dropDrag(drag: HTMLElement, position: number[]): void {
        const choiceNo = this.getChoiceNoForNode(drag);

        if (position) {
            // Set the position related to the natural image dimensions.
            if (this.proportion < 1) {
                position[0] = Math.round(position[0] / this.proportion);
            }

            if (this.proportion < 1) {
                position[1] = Math.round(position[1] / this.proportion);
            }
        }

        this.saveAllXYForChoice(choiceNo, drag, position);
        this.redrawDragsAndDrops();
    }

    /**
     * Determine which drag items need to be shown and return coords of all drag items except any that are currently being
     * dragged based on contents of hidden inputs and whether drags are 'infinite' or how many drags should be shown.
     *
     * @param input The input element.
     * @return List of coordinates.
     */
    getCoords(input: HTMLElement): number[][] {
        const choiceNo = this.getChoiceNoForNode(input),
            fv = input.getAttribute('value'),
            infinite = input.classList.contains('infinite'),
            noOfDrags = this.getNoOfDragsForNode(input),
            dragging = (this.doc.dragItemBeingDragged(choiceNo) !== null),
            coords: number[][] = [];

        if (fv !== '' && typeof fv != 'undefined' && fv !== null) {
            // Get all the coordinates in the input and add them to the coords list.
            const coordsStrings = fv.split(';');

            for (let i = 0; i < coordsStrings.length; i++) {
                const coordsNumbers = coordsStrings[i].split(',').map((i) => {
                    return Number(i);
                });

                coords[coords.length] = this.convertToWindowXY(coordsNumbers);
            }
        }

        const displayedDrags = coords.length + (dragging ? 1 : 0);
        if (infinite || (displayedDrags < noOfDrags)) {
            coords[coords.length] = this.dragHomeXY(choiceNo);
        }

        return coords;
    }

    /**
     * Get the choice number from an HTML element.
     *
     * @param node Element to check.
     * @return Choice number.
     */
    getChoiceNoForNode(node: HTMLElement): number {
        return Number(this.doc.getClassnameNumericSuffix(node, 'choice'));
    }

    /**
     * Get the coordinates (X, Y) of a draggable element.
     *
     * @param dragItem The draggable item.
     * @return Coordinates.
     */
    getDragXY(dragItem: HTMLElement): number[] {
        const position = this.domUtils.getElementXY(dragItem, null, 'ddarea'),
            bgImg = this.doc.bgImg(),
            bgImgXY = this.domUtils.getElementXY(bgImg, null, 'ddarea');

        position[0] -= bgImgXY[0];
        position[1] -= bgImgXY[1];

        // Set the position related to the natural image dimensions.
        if (this.proportion < 1) {
            position[0] = Math.round(position[0] / this.proportion);
        }

        if (this.proportion < 1) {
            position[1] = Math.round(position[1] / this.proportion);
        }

        return position;
    }

    /**
     * Get the item number from an HTML element.
     *
     * @param node Element to check.
     * @return Choice number.
     */
    getItemNoForNode(node: HTMLElement): number {
        return Number(this.doc.getClassnameNumericSuffix(node, 'item'));
    }

    /**
     * Get the next colour.
     *
     * @return Colour.
     */
    getNextColour(): string {
        const colour = this.COLOURS[this.nextColourIndex];
        this.nextColourIndex++;

        // If we reached the end of the list, start again.
        if (this.nextColourIndex === this.COLOURS.length) {
            this.nextColourIndex = 0;
        }

        return colour;
    }

    /**
     * Get the number of drags from an HTML element.
     *
     * @param node Element to check.
     * @return Choice number.
     */
    getNoOfDragsForNode(node: HTMLElement): number {
        return Number(this.doc.getClassnameNumericSuffix(node, 'noofdrags'));
    }

    /**
     * Initialize the question.
     *
     * @param question Question.
     */
    initializer(question: any): void {
        this.doc = this.docStructure(question.slot);

        // Wait the DOM to be rendered.
        setTimeout(() => {
            this.pollForImageLoad();
        });

        this.resizeFunction = this.redrawDragsAndDrops.bind(this);
        window.addEventListener('resize', this.resizeFunction);
    }

    /**
     * Make background image and home zone dropable.
     */
    makeImageDropable(): void {
        if (this.readOnly) {
            return;
        }

        // Listen for click events in the background image to make it dropable.
        const bgImg = this.doc.bgImg();
        bgImg.addEventListener('click', (e) => {

            const drag = this.selected;
            if (!drag) {
                // No draggable element selected, nothing to do.
                return false;
            }

            // There's an element being dragged. Deselect it and drop it in the position.
            const position = [e.offsetX, e.offsetY];
            this.deselectDrags();
            this.dropDrag(drag, position);

            e.preventDefault();
            e.stopPropagation();
        });

        const home = this.doc.dragItemsArea();
        home.addEventListener('click', (e) => {

            const drag = this.selected;
            if (!drag) {
                // No draggable element selected, nothing to do.
                return false;
            }

            // There's an element being dragged but it's not placed yet, deselect.
            if (drag.classList.contains('unplaced')) {
                this.deselectDrags();

                return false;
            }

            // There's an element being dragged and it's placed somewhere. Move it back to the home area.
            this.deselectDrags();
            this.dropDrag(drag, null);

            e.preventDefault();
            e.stopPropagation();
        });
    }

    /**
     * Wait for the background image to be loaded.
     */
    pollForImageLoad(): void {
        if (this.afterImageLoadDone) {
            // Already treated.
            return;
        }

        const bgImg = this.doc.bgImg();
        if (!bgImg.src && this.imgSrc) {
            bgImg.src = this.imgSrc;
        }

        const imgLoaded = (): void => {
            bgImg.removeEventListener('load', imgLoaded);

            this.makeImageDropable();

            setTimeout(() => {
                this.redrawDragsAndDrops();
            });

            this.afterImageLoadDone = true;
            this.question.loaded = true;
        };

        bgImg.addEventListener('load', imgLoaded);

        // Try again after a while.
        setTimeout(() => {
            this.pollForImageLoad();
        }, 500);
    }

    /**
     * Redraw all draggables and drop zones.
     */
    redrawDragsAndDrops(): void {
        // Mark all the draggable items as not placed.
        const drags = this.doc.dragItems();
        drags.forEach((drag) => {
            drag.classList.add('unneeded', 'unplaced');
        });

        // Re-calculate the image proportion.
        this.calculateImgProportion();

        // Get all the inputs.
        const inputs = this.doc.inputsForChoices();
        for (let x = 0; x < inputs.length; x++) {

            // Get all the drag items for the choice.
            const input = inputs[x],
                choiceNo = this.getChoiceNoForNode(input),
                coords = this.getCoords(input),
                dragItemHome = this.doc.dragItemHome(choiceNo),
                homePosition = this.dragHomeXY(choiceNo);

            for (let i = 0; i < coords.length; i++) {
                let dragItem = this.doc.dragItemForChoice(choiceNo, i);

                if (!dragItem || dragItem.classList.contains('beingdragged')) {
                    dragItem = this.cloneNewDragItem(dragItemHome, i);
                } else {
                    dragItem.classList.remove('unneeded');
                }

                // Remove the class only if is placed on the image.
                if (homePosition[0] != coords[i][0] || homePosition[1] != coords[i][1]) {
                    dragItem.classList.remove('unplaced');
                }

                dragItem.style.left = coords[i][0] + 'px';
                dragItem.style.top = coords[i][1] + 'px';
            }
        }

        // Remove unneeded draggable items.
        for (let y = 0; y < drags.length; y++) {
            const item = drags[y];
            if (item.classList.contains('unneeded') && !item.classList.contains('beingdragged')) {
                item.remove();
            }
        }

        // Re-draw drop zones.
        if (this.dropZones && this.dropZones.length !== 0) {
            this.graphics.clear();
            this.restartColours();

            for (const dropZoneNo in this.dropZones) {
                const colourForDropZone = this.getNextColour(),
                    dropZone = this.dropZones[dropZoneNo],
                    dzNo = Number(dropZoneNo);

                this.drawDropZone(dzNo, dropZone.markertext, dropZone.shape, dropZone.coords, colourForDropZone);
            }
        }
    }

    /**
     * Reset the coordinates stored for a choice.
     *
     * @param choiceNo Choice number.
     */
    resetDragXY(choiceNo: number): void {
        this.setFormValue(choiceNo, '');
    }

    /**
     * Restart the colour index.
     */
    restartColours(): void {
        this.nextColourIndex = 0;
    }

    /**
     * Save all the coordinates of a choice into the right input.
     *
     * @param choiceNo Number of the choice.
     * @param dropped Element being dropped.
     * @param position Position where the element is dropped.
     */
    saveAllXYForChoice(choiceNo: number, dropped: HTMLElement, position: number[]): void {
        const coords = [];
        let bgImgXY;

        // Calculate the coords for the choice.
        const dragItemsChoice = this.doc.dragItemsForChoice(choiceNo);
        for (let i = 0; i < dragItemsChoice.length; i++) {

            const dragItem = this.doc.dragItemForChoice(choiceNo, i);
            if (dragItem) {

                dragItem.classList.remove('item' + i);
                bgImgXY = this.getDragXY(dragItem);
                dragItem.classList.add('item' + coords.length);
                coords.push(bgImgXY);
            }
        }

        if (position !== null) {
            // Element dropped into a certain position. Mark it as placed and save the position.
            dropped.classList.remove('unplaced');
            dropped.classList.add('item' + coords.length);
            coords.push(position);
        } else {
            // Element back at home, mark it as unplaced.
            dropped.classList.add('unplaced');
        }

        if (coords.length > 0) {
            // Save the coordinates in the input.
            this.setFormValue(choiceNo, coords.join(';'));
        } else {
            // Empty the input.
            this.resetDragXY(choiceNo);
        }
    }

    /**
     * Save a certain value in the input of a choice.
     *
     * @param choiceNo Choice number.
     * @param value The value to set.
     */
    setFormValue(choiceNo: number, value: string): void {
        this.doc.inputForChoice(choiceNo).setAttribute('value', value);
    }

    /**
     * Select a draggable element.
     *
     * @param drag Element.
     */
    selectDrag(drag: HTMLElement): void {
        // Deselect previous drags.
        this.deselectDrags();

        this.selected = drag;
        drag.classList.add('beingdragged');

        const itemNo = this.getItemNoForNode(drag);
        if (itemNo !== null) {
            drag.classList.remove('item' + itemNo);
        }
    }
}
