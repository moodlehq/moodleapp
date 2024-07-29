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

import { CoreDomUtils } from '@services/utils/dom';
import { CoreText } from '@singletons/text';
import { CoreCoordinates, CoreDom } from '@singletons/dom';
import { CoreEventObserver } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { AddonQtypeDdMarkerQuestionData } from '../component/ddmarker';
import { AddonQtypeDdMarkerGraphicsApi } from './graphics_api';
import { CoreUtils } from '@services/utils/utils';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreExternalContentDirective } from '@directives/external-content';

/**
 * Class to make a question of ddmarker type work.
 */
export class AddonQtypeDdMarkerQuestion {

    protected readonly COLOURS = ['#FFFFFF', '#B0C4DE', '#DCDCDC', '#D8BFD8', '#87CEFA', '#DAA520', '#FFD700', '#F0E68C'];

    protected logger: CoreLogger;
    protected afterImageLoadDone = false;
    protected topNode?: HTMLElement | null;
    protected nextColourIndex = 0;
    protected proportion = 1;
    protected selected?: HTMLElement; // Selected element (being "dragged").
    protected graphics: AddonQtypeDdMarkerGraphicsApi;
    protected resizeListener?: CoreEventObserver;

    doc!: AddonQtypeDdMarkerQuestionDocStructure;
    shapes: SVGElement[] = [];

    /**
     * Create the instance.
     *
     * @param container The container HTMLElement of the question.
     * @param question The question instance.
     * @param readOnly Whether it's read only.
     * @param dropZones The drop zones received in the init object of the question.
     * @param imgSrc Background image source (3.6+ sites).
     */
    constructor(
        protected container: HTMLElement,
        protected question: AddonQtypeDdMarkerQuestionData,
        protected readOnly: boolean,
        protected dropZones: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
        protected imgSrc?: string,
    ) {
        this.logger = CoreLogger.getInstance('AddonQtypeDdMarkerQuestion');

        this.graphics = new AddonQtypeDdMarkerGraphicsApi(this);

        this.initializer();
    }

    /**
     * Calculate image proportion to make easy conversions.
     */
    calculateImgProportion(): void {
        const bgImg = this.doc.bgImg();
        if (!bgImg) {
            return;
        }

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
     * @returns The new element.
     */
    cloneNewDragItem(dragHome: HTMLElement, itemNo: number): HTMLElement {
        // Clone the element and add the right classes.
        const drag = <HTMLElement> dragHome.cloneNode(true);
        drag.classList.remove('draghome');
        drag.classList.add('dragitem');
        drag.classList.add('item' + itemNo);
        drag.classList.remove('dragplaceholder'); // In case it has it.
        dragHome.classList.add('dragplaceholder');

        // Insert the new drag after the dragHome.
        dragHome.parentElement?.insertBefore(drag, dragHome.nextSibling);
        if (!this.readOnly) {
            this.draggable(drag);
        }

        return drag;
    }

    /**
     * Convert the X and Y position of the BG IMG to a position relative to the window.
     *
     * @param bgImgXY X and Y of the BG IMG relative position.
     * @returns Position relative to the window.
     */
    convertToWindowXY(bgImgXY: string): number[] {
        const bgImg = this.doc.bgImg();
        if (!bgImg) {
            return [];
        }

        const position = this.getElementCoordinates(bgImg);
        let coordsNumbers = this.parsePoint(bgImgXY);

        coordsNumbers = this.makePointProportional(coordsNumbers);

        return [coordsNumbers.x + position[0], coordsNumbers.y + position[1]];
    }

    /**
     * Returns elements coordinates relative to ddarea container.
     *
     * @param element Element.
     * @returns Array of X and Y coordinates.
     */
    protected getElementCoordinates(element: HTMLElement): number[] {
        const ddArea = this.container.querySelector<HTMLElement>('.ddarea');
        if (!ddArea) {
            return [];
        }

        const position = CoreDom.getRelativeElementPosition(element, ddArea);

        return [position.x, position.y];
    }

    /**
     * Check if some coordinates (X, Y) are inside the background image.
     *
     * @param coords Coordinates to check.
     * @returns Whether they're inside the background image.
     */
    coordsInImg(coords: CoreCoordinates): boolean {
        const bgImg = this.doc.bgImg();
        if (!bgImg) {
            return false;
        }

        return (coords.x * this.proportion <= bgImg.width + 1) && (coords.y * this.proportion <= bgImg.height + 1);
    }

    /**
     * Deselect all draggable items.
     */
    deselectDrags(): void {
        const drags = this.doc.dragItems();
        drags.forEach((drag) => {
            drag.classList.remove('beingdragged');
        });
        this.selected = undefined;
    }

    /**
     * Function to call when the instance is no longer needed.
     */
    destroy(): void {
        this.resizeListener?.off();
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

                const position = this.getElementCoordinates(drag);
                const bgImg = this.doc.bgImg();
                if (!bgImg) {
                    return;
                }

                const bgImgPos = this.getElementCoordinates(bgImg);

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
     * @returns Coordinates.
     */
    dragHomeXY(choiceNo: number): number[] {
        const dragItemHome = this.doc.dragItemHome(choiceNo);
        if (!dragItemHome) {
            return [];
        }

        const position = this.getElementCoordinates(dragItemHome);

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
        const markerTexts = this.doc.markerTexts();
        // Check if there is already a marker text for this drop zone.
        const existingMarkerText = markerTexts?.querySelector<HTMLElement>('span.markertext' + dropZoneNo);

        if (existingMarkerText) {
            // Marker text already exists. Update it or remove it if empty.
            if (markerText !== '') {
                existingMarkerText.innerHTML = markerText;
            } else {
                existingMarkerText.remove();
            }
        } else if (markerText !== '' && markerTexts) {
            // Create and add the marker text.
            const classNames = 'markertext markertext' + dropZoneNo;
            const span = document.createElement('span');

            span.className = classNames;
            span.innerHTML = markerText;

            markerTexts.appendChild(span);
        }

        // Check that a function to draw this shape exists.
        const drawFunc = 'drawShape' + CoreText.capitalize(shape);
        if (!(this[drawFunc] instanceof Function)) {
            return;
        }

        // Call the function.
        const xyForText = this[drawFunc](dropZoneNo, coords, colour);
        if (xyForText === null || xyForText === undefined) {
            return;
        }

        // Search the marker for the drop zone.
        const markerSpan = this.doc.topNode?.querySelector<HTMLElement>(`div.ddarea div.markertexts span.markertext${dropZoneNo}`);
        if (!markerSpan) {
            return;
        }

        const computedStyle = getComputedStyle(markerSpan);
        const width = markerSpan.getBoundingClientRect().width +
            CoreDomUtils.getComputedStyleMeasure(computedStyle, 'borderLeftWidth') +
            CoreDomUtils.getComputedStyleMeasure(computedStyle, 'borderRightWidth') +
            CoreDomUtils.getComputedStyleMeasure(computedStyle, 'paddingLeft') +
            CoreDomUtils.getComputedStyleMeasure(computedStyle, 'paddingRight');

        const height =  markerSpan.getBoundingClientRect().height +
            CoreDomUtils.getComputedStyleMeasure(computedStyle, 'borderTopWidth') +
            CoreDomUtils.getComputedStyleMeasure(computedStyle, 'borderBottomWidth') +
            CoreDomUtils.getComputedStyleMeasure(computedStyle, 'paddingTop') +
            CoreDomUtils.getComputedStyleMeasure(computedStyle, 'paddingBottom');
        markerSpan.style.opacity = '0.6';
        markerSpan.style.left = (xyForText.x - (width / 2)) + 'px';
        markerSpan.style.top = (xyForText.y - (height / 2)) + 'px';

        const markerSpanAnchor = markerSpan.querySelector('a');
        if (markerSpanAnchor !== null) {

            markerSpanAnchor.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                this.shapes.forEach((elem) => {
                    elem.style.fillOpacity = '0.5';
                });

                this.shapes[dropZoneNo].style.fillOpacity = '1';
                setTimeout(() => {
                    this.shapes[dropZoneNo].style.fillOpacity = '0.5';
                }, 2000);
            });

            markerSpanAnchor.setAttribute('tabIndex', '0');
        }
    }

    /**
     * Draw a circle in a drop zone.
     *
     * @param dropZoneNo Number of the drop zone.
     * @param coordinates Coordinates of the circle.
     * @param colour Colour of the circle.
     * @returns X and Y position of the center of the circle.
     */
    drawShapeCircle(dropZoneNo: number, coordinates: string, colour: string): CoreCoordinates | null {
        if (!coordinates.match(/^\d+(\.\d+)?,\d+(\.\d+)?;\d+(\.\d+)?$/)) {
            return null;
        }

        const bits = coordinates.split(';');
        let centre = this.parsePoint(bits[0]);
        const radius = Number(bits[1]);

        // Calculate circle limits and check it's inside the background image.
        const circleLimit = { x: centre.x - radius, y: centre.y - radius };
        if (this.coordsInImg(circleLimit)) {
            centre = this.makePointProportional(centre);

            // All good, create the shape.
            this.shapes[dropZoneNo] = this.graphics.addShape({
                type: 'circle',
                color: colour,
            }, {
                cx: centre.x,
                cy: centre.y,
                r: Math.round(radius * this.proportion),
            });

            // Return the centre.
            return centre;
        }

        return null;
    }

    /**
     * Draw a rectangle in a drop zone.
     *
     * @param dropZoneNo Number of the drop zone.
     * @param coordinates Coordinates of the rectangle.
     * @param colour Colour of the rectangle.
     * @returns X and Y position of the center of the rectangle.
     */
    drawShapeRectangle(dropZoneNo: number, coordinates: string, colour: string): CoreCoordinates | null {
        if (!coordinates.match(/^\d+(\.\d+)?,\d+(\.\d+)?;\d+(\.\d+)?,\d+(\.\d+)?$/)) {
            return null;
        }

        const bits = coordinates.split(';');
        const startPoint = this.parsePoint(bits[0]);
        const size = this.parsePoint(bits[1]);

        // Calculate rectangle limits and check it's inside the background image.
        const rectLimits = { x: startPoint.x + size.x, y: startPoint.y + size.y };
        if (this.coordsInImg(rectLimits)) {
            const startPointProp = this.makePointProportional(startPoint);
            const sizeProp = this.makePointProportional(size);

            // All good, create the shape.
            this.shapes[dropZoneNo] = this.graphics.addShape({
                type: 'rect',
                color: colour,
            }, {
                x: startPointProp.x,
                y: startPointProp.y,
                width: sizeProp.x,
                height: sizeProp.y,
            });

            const centre = { x: startPoint.x + (size.x / 2) , y: startPoint.y + (size.y / 2) };

            // Return the centre.
            return this.makePointProportional(centre);
        }

        return null;
    }

    /**
     * Draw a polygon in a drop zone.
     *
     * @param dropZoneNo Number of the drop zone.
     * @param coordinates Coordinates of the polygon.
     * @param colour Colour of the polygon.
     * @returns X and Y position of the center of the polygon.
     */
    drawShapePolygon(dropZoneNo: number, coordinates: string, colour: string): CoreCoordinates | null {
        if (!coordinates.match(/^\d+(\.\d+)?,\d+(\.\d+)?(?:;\d+(\.\d+)?,\d+(\.\d+)?)*$/)) {
            return null;
        }

        const bits = coordinates.split(';');
        const centre = { x: 0, y: 0 };
        const points = bits.map((bit) => {
            const point = this.parsePoint(bit);
            centre.x += point.x;
            centre.y += point.y;

            return point;
        });

        if (points.length > 0) {
            centre.x = Math.round(centre.x / points.length);
            centre.y = Math.round(centre.y / points.length);
        }

        const pointsOnImg: string[] = [];
        points.forEach((point) => {
            if (this.coordsInImg(point)) {
                point = this.makePointProportional(point);

                pointsOnImg.push(point.x + ',' + point.y);
            }
        });

        if (pointsOnImg.length > 2) {
            this.shapes[dropZoneNo] = this.graphics.addShape({
                type: 'polygon',
                color: colour,
            }, {
                points: pointsOnImg.join(' '),
            });

            // Return the centre.
            return this.makePointProportional(centre);
        }

        return null;
    }

    /**
     * Make a point from the string representation.
     *
     * @param coordinates "x,y".
     * @returns Coordinates to the point.
     */
    parsePoint(coordinates: string): CoreCoordinates {
        const bits = coordinates.split(',');
        if (bits.length !== 2) {
            throw coordinates + ' is not a valid point';
        }

        return { x: Number(bits[0]), y: Number(bits[1]) };
    }

    /**
     * Make proportional position of the point.
     *
     * @param point Point coordinates.
     * @returns Converted point.
     */
    makePointProportional(point: CoreCoordinates): CoreCoordinates {
        return {
            x: Math.round(point.x * this.proportion),
            y: Math.round(point.y * this.proportion),

        };
    }

    /**
     * Drop a drag element into a certain position.
     *
     * @param drag The element to drop.
     * @param position Position to drop to (X, Y).
     */
    dropDrag(drag: HTMLElement, position: number[] | null): void {
        const choiceNo = this.getChoiceNoForNode(drag);

        if (position) {
            // Set the position related to the natural image dimensions.
            if (this.proportion < 1) {
                position[0] = Math.round(position[0] / this.proportion);
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
     * @returns List of coordinates.
     */
    getCoords(input: HTMLElement): number[][] {
        const choiceNo = this.getChoiceNoForNode(input);
        const fv = input.getAttribute('value');
        const infinite = input.classList.contains('infinite');
        const noOfDrags = this.getNoOfDragsForNode(input);
        const dragging = !!this.doc.dragItemBeingDragged(choiceNo);
        const coords: number[][] = [];

        if (fv !== '' && fv !== undefined && fv !== null) {
            // Get all the coordinates in the input and add them to the coords list.
            const coordsStrings = fv.split(';');

            for (let i = 0; i < coordsStrings.length; i++) {
                coords[coords.length] = this.convertToWindowXY(coordsStrings[i]);
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
     * @returns Choice number.
     */
    getChoiceNoForNode(node: HTMLElement): number {
        return Number(this.doc.getClassnameNumericSuffix(node, 'choice'));
    }

    /**
     * Get the coordinates (X, Y) of a draggable element.
     *
     * @param dragItem The draggable item.
     * @returns Coordinates.
     */
    getDragXY(dragItem: HTMLElement): number[] {
        const position = this.getElementCoordinates(dragItem);
        const bgImg = this.doc.bgImg();
        if (bgImg) {
            const bgImgXY = this.getElementCoordinates(bgImg);

            position[0] -= bgImgXY[0];
            position[1] -= bgImgXY[1];
        }

        // Set the position related to the natural image dimensions.
        if (this.proportion < 1) {
            position[0] = Math.round(position[0] / this.proportion);
            position[1] = Math.round(position[1] / this.proportion);
        }

        return position;
    }

    /**
     * Get the item number from an HTML element.
     *
     * @param node Element to check.
     * @returns Choice number.
     */
    getItemNoForNode(node: HTMLElement): number {
        return Number(this.doc.getClassnameNumericSuffix(node, 'item'));
    }

    /**
     * Get the next colour.
     *
     * @returns Colour.
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
     * @returns Choice number.
     */
    getNoOfDragsForNode(node: HTMLElement): number {
        return Number(this.doc.getClassnameNumericSuffix(node, 'noofdrags'));
    }

    /**
     * Initialize the question.
     */
    initializer(): void {
        this.doc = new AddonQtypeDdMarkerQuestionDocStructure(this.container);

        // Wait the DOM to be rendered.
        setTimeout(() => {
            this.pollForImageLoad();
        });

        this.resizeListener = CoreDom.onWindowResize(() => {
            this.redrawDragsAndDrops();
        });
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
        bgImg?.addEventListener('click', (e) => {

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

        const home = this.doc.dragItemsArea;
        home?.addEventListener('click', (e) => {

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
    async pollForImageLoad(): Promise<void> {
        if (this.afterImageLoadDone) {
            // Already treated.
            return;
        }

        const bgImg = this.doc.bgImg();
        if (!bgImg) {
            return;
        }

        // Wait for external-content to finish, otherwise the image doesn't have a src and the calculations are wrong.
        await CoreDirectivesRegistry.waitDirectivesReady(bgImg, undefined, CoreExternalContentDirective);

        if (!bgImg.src && this.imgSrc) {
            bgImg.src = this.imgSrc;
        }

        const imgLoaded = async (): Promise<void> => {
            bgImg.removeEventListener('load', imgLoaded);

            this.makeImageDropable();

            this.afterImageLoadDone = true;
            this.question.loaded = true;

            // Wait for image to be visible, otherwise the calculated positions are wrong.
            const visiblePromise = CoreDom.waitToBeVisible(bgImg);

            await CoreUtils.ignoreErrors(CoreUtils.timeoutPromise(visiblePromise, 500));
            visiblePromise.cancel(); // In case of timeout, cancel the promise.

            this.redrawDragsAndDrops();
        };

        if (!bgImg.src || (bgImg.complete && bgImg.naturalWidth)) {
            imgLoaded();

            return;
        }

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
            const input = inputs[x];
            const choiceNo = this.getChoiceNoForNode(input);
            const coords = this.getCoords(input);
            const dragItemHome = this.doc.dragItemHome(choiceNo);
            const homePosition = this.dragHomeXY(choiceNo);
            if (!dragItemHome) {
                continue;
            }

            for (let i = 0; i < coords.length; i++) {
                let dragItem = this.doc.dragItemForChoice(choiceNo, i);

                if (!dragItem || dragItem.classList.contains('beingdragged')) {
                    dragItem = this.cloneNewDragItem(dragItemHome, i);
                } else {
                    dragItem.classList.remove('unneeded');
                }

                const placeholder = this.doc.dragItemPlaceholder(choiceNo);

                // Remove the class only if is placed on the image.
                if (homePosition[0] != coords[i][0] || homePosition[1] != coords[i][1]) {
                    dragItem.classList.remove('unplaced');
                    dragItem.classList.add('placed');

                    const computedStyle = getComputedStyle(dragItem);
                    const left = coords[i][0] - CoreDomUtils.getComputedStyleMeasure(computedStyle, 'marginLeft');
                    const top = coords[i][1] - CoreDomUtils.getComputedStyleMeasure(computedStyle, 'marginTop');

                    dragItem.style.left = left + 'px';
                    dragItem.style.top = top + 'px';
                    placeholder?.classList.add('active');
                } else {
                    dragItem.classList.remove('placed');
                    dragItem.classList.add('unplaced');
                    placeholder?.classList.remove('active');
                }
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
                const colourForDropZone = this.getNextColour();
                const dropZone = this.dropZones[dropZoneNo];
                const dzNo = Number(dropZoneNo);

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
    saveAllXYForChoice(choiceNo: number, dropped: HTMLElement, position: number[] | null): void {
        const coords: number[][] = [];

        // Calculate the coords for the choice.
        const dragItemsChoice = this.doc.dragItemsForChoice(choiceNo);
        for (let i = 0; i < dragItemsChoice.length; i++) {

            const dragItem = this.doc.dragItemForChoice(choiceNo, i);
            if (dragItem) {
                const bgImgXY = this.getDragXY(dragItem);
                dragItem.classList.remove('item' + i);
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
        this.doc.inputForChoice(choiceNo)?.setAttribute('value', value);
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

/**
 * Encapsulates operations on dd area.
 */
export class AddonQtypeDdMarkerQuestionDocStructure {

    topNode: HTMLElement | null;
    dragItemsArea: HTMLElement | null;

    protected logger: CoreLogger;

    constructor(
        protected container: HTMLElement,
    ) {
        this.logger = CoreLogger.getInstance('AddonQtypeDdMarkerQuestionDocStructure');

        this.topNode = this.container.querySelector<HTMLElement>('.addon-qtype-ddmarker-container');
        this.dragItemsArea = this.topNode?.querySelector<HTMLElement>('div.dragitems, div.draghomes') || null;
    }

    querySelector<T = HTMLElement>(element: HTMLElement | null, selector: string): T | null {
        if (!element) {
            return null;
        }

        return <T | null> element.querySelector(selector);
    }

    querySelectorAll(element: HTMLElement | null, selector: string): HTMLElement[] {
        if (!element) {
            return [];
        }

        return Array.from(element.querySelectorAll(selector));
    }

    bgImg(): HTMLImageElement | null {
        return this.querySelector(this.topNode, '.dropbackground');
    }

    dragItems(): HTMLElement[] {
        return this.querySelectorAll(this.dragItemsArea, '.dragitem');
    }

    dragItemsForChoice(choiceNo: number): HTMLElement[] {
        return this.querySelectorAll(this.dragItemsArea, `span.dragitem.choice${choiceNo}`);
    }

    dragItemForChoice(choiceNo: number, itemNo: number): HTMLElement | null {
        return this.querySelector(this.dragItemsArea, `span.dragitem.choice${choiceNo}.item${itemNo}`);
    }

    dragItemPlaceholder(choiceNo: number): HTMLElement | null {
        return this.querySelector(this.dragItemsArea, `span.dragplaceholder.choice${choiceNo}`);
    }

    dragItemBeingDragged(choiceNo: number): HTMLElement | null {
        return this.querySelector(this.dragItemsArea, `span.dragitem.beingdragged.choice${choiceNo}`);

    }

    dragItemHome(choiceNo: number): HTMLElement | null {
        return this.querySelector(this.dragItemsArea, `span.draghome.choice${choiceNo}, span.marker.choice${choiceNo}`);
    }

    dragItemHomes(): HTMLElement[] {
        return this.querySelectorAll(this.dragItemsArea, 'span.draghome, span.marker');
    }

    getClassnameNumericSuffix(node: HTMLElement, prefix: string): number | undefined {
        if (node.classList.length) {
            const patt1 = new RegExp('^' + prefix + '([0-9])+$');
            const patt2 = new RegExp('([0-9])+$');

            for (let index = 0; index < node.classList.length; index++) {
                if (patt1.test(node.classList[index])) {
                    const match = patt2.exec(node.classList[index]);

                    return Number(match?.[0]);
                }
            }
        }

        this.logger.warn('Prefix "' + prefix + '" not found in class names.');
    }

    inputsForChoices(): HTMLElement[] {
        return this.querySelectorAll(this.topNode, 'input.choices');
    }

    inputForChoice(choiceNo: number): HTMLElement | null {
        return this.querySelector(this.topNode, `input.choice${choiceNo}`);
    }

    markerTexts(): HTMLElement | null {
        return this.querySelector(this.topNode, 'div.markertexts');
    }

}
