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

/**
 * Encapsulates operations on dd area.
 */
export interface AddonQtypeDdImageOrTextQuestionDocStructure {
    topNode?: () => HTMLElement;
    dragItemsArea?: () => HTMLElement;
    dragItems?: () => HTMLElement[];
    dropZones?: () => HTMLElement[];
    dropZoneGroup?: (groupNo: number) => HTMLElement[];
    dragItemsClonedFrom?: (dragItemNo: number) => HTMLElement[];
    dragItem?: (dragInstanceNo: number) => HTMLElement;
    dragItemsInGroup?: (groupNo: number) => HTMLElement[];
    dragItemHomes?: () => HTMLElement[];
    bgImg?: () => HTMLImageElement;
    dragItemHome?: (dragItemNo: number) => HTMLElement;
    getClassnameNumericSuffix?: (node: HTMLElement, prefix: string) => number;
    cloneNewDragItem?: (dragInstanceNo: number, dragItemNo: number) => HTMLElement;
}

/**
 * Class to make a question of ddimageortext type work.
 */
export class AddonQtypeDdImageOrTextQuestion {
    protected logger: any;
    protected toLoad = 0;
    protected doc: AddonQtypeDdImageOrTextQuestionDocStructure;
    protected afterImageLoadDone = false;
    protected topNode: HTMLElement;
    protected proportion = 1;
    protected selected: HTMLElement; // Selected element (being "dragged").
    protected resizeFunction;

    /**
     * Create the this.
     *
     * @param logger Logger provider.
     * @param domUtils Dom Utils provider.
     * @param container The container HTMLElement of the question.
     * @param question The question this.
     * @param readOnly Whether it's read only.
     * @param drops The drop zones received in the init object of the question.
     */
    constructor(logger: CoreLoggerProvider, protected domUtils: CoreDomUtilsProvider, protected container: HTMLElement,
                protected question: any, protected readOnly: boolean, protected drops: any[]) {
        this.logger = logger.getInstance('AddonQtypeDdImageOrTextQuestion');

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

        return [Number(bgImgXY[0]) + position[0] + 1, Number(bgImgXY[1]) + position[1] + 1];
    }

    /**
     * Create and initialize all draggable elements and drop zones.
     */
    createAllDragAndDrops(): void {
        // Initialize drop zones.
        this.initDrops();

        // Initialize drag items area.
        const dragItemsArea = this.doc.dragItemsArea();
        dragItemsArea.classList.add('clearfix');
        this.makeDragAreaClickable();

        const dragItemHomes = this.doc.dragItemHomes();
        let i = 0;

        // Create the draggable items.
        for (let x = 0; x < dragItemHomes.length; x++) {

            const dragItemHome = dragItemHomes[x],
                dragItemNo = this.doc.getClassnameNumericSuffix(dragItemHome, 'dragitemhomes'),
                choice = this.doc.getClassnameNumericSuffix(dragItemHome, 'choice'),
                group = this.doc.getClassnameNumericSuffix(dragItemHome, 'group');

            // Images need to be inside a div element to admit padding with width and height.
            if (dragItemHome.tagName == 'IMG') {
                const wrap = document.createElement('div');
                wrap.className = dragItemHome.className;
                dragItemHome.className = '';

                // Insert wrapper before the image in the DOM tree.
                dragItemHome.parentNode.insertBefore(wrap, dragItemHome);
                // Move the image into wrapper.
                wrap.appendChild(dragItemHome);
            }

            // Create a new drag item for this home.
            const dragNode = this.doc.cloneNewDragItem(i, dragItemNo);
            i++;

            // Make the item draggable.
            this.draggableForQuestion(dragNode, group, choice);

            // If the draggable item needs to be created more than once, create the rest of copies.
            if (dragNode.classList.contains('infinite')) {
                const groupSize = this.doc.dropZoneGroup(group).length;
                let dragsToCreate = groupSize - 1;

                while (dragsToCreate > 0) {
                    const newDragNode = this.doc.cloneNewDragItem(i, dragItemNo);
                    i++;
                    this.draggableForQuestion(newDragNode, group, choice);

                    dragsToCreate--;
                }
            }
        }

        // All drag items have been created, position them.
        this.repositionDragsForQuestion();

        if (!this.readOnly) {
            const dropZones = this.doc.dropZones();
            dropZones.forEach((dropZone) => {
                dropZone.setAttribute('tabIndex', '0');
            });
        }
    }

    /**
     * Deselect all drags.
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
        this.stopPolling();

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
    docStructure(slot: number): AddonQtypeDdImageOrTextQuestionDocStructure {
        const topNode = <HTMLElement> this.container.querySelector('.addon-qtype-ddimageortext-container'),
            doc: AddonQtypeDdImageOrTextQuestionDocStructure = {};

        let dragItemsArea = <HTMLElement> topNode.querySelector('div.draghomes');

        if (dragItemsArea) {
            // On 3.9+ dragitems were removed.
            const dragItems = topNode.querySelector('div.dragitems');

            if (dragItems) {
                // Remove empty div.dragitems.
                dragItems.remove();
            }

            // 3.6+ site, transform HTML so it has the same structure as in Moodle 3.5.
            const ddArea = topNode.querySelector('div.ddarea');

            // Move div.dropzones to div.ddarea.
            ddArea.appendChild(topNode.querySelector('div.dropzones'));

            // Move div.draghomes to div.ddarea and rename the class to .dragitems.
            ddArea.appendChild(dragItemsArea);
            dragItemsArea.classList.remove('draghomes');
            dragItemsArea.classList.add('dragitems');

            // Add .dragitemhomesNNN class to drag items.
            Array.from(dragItemsArea.querySelectorAll('.draghome')).forEach((draghome, index) => {
                draghome.classList.add('dragitemhomes' + index);
            });
        } else {
            dragItemsArea = <HTMLElement> topNode.querySelector('div.dragitems');
        }

        doc.topNode = (): HTMLElement => {
            return topNode;
        };
        doc.dragItemsArea = (): HTMLElement => {
            return dragItemsArea;
        };
        doc.dragItems = (): HTMLElement[] => {
            return <HTMLElement[]> Array.from(dragItemsArea.querySelectorAll('.drag'));
        };
        doc.dropZones = (): HTMLElement[] => {
            return <HTMLElement[]> Array.from(topNode.querySelectorAll('div.dropzones div.dropzone'));
        };
        doc.dropZoneGroup = (groupNo: number): HTMLElement[] => {
            return <HTMLElement[]> Array.from(topNode.querySelectorAll('div.dropzones div.group' + groupNo));
        };
        doc.dragItemsClonedFrom = (dragItemNo: number): HTMLElement[] => {
            return <HTMLElement[]> Array.from(dragItemsArea.querySelectorAll('.dragitems' + dragItemNo));
        };
        doc.dragItem = (dragInstanceNo: number): HTMLElement => {
            return <HTMLElement> dragItemsArea.querySelector('.draginstance' + dragInstanceNo);
        };
        doc.dragItemsInGroup = (groupNo: number): HTMLElement[] => {
            return <HTMLElement[]> Array.from(dragItemsArea.querySelectorAll('.drag.group' + groupNo));
        };
        doc.dragItemHomes = (): HTMLElement[] => {
            return <HTMLElement[]> Array.from(dragItemsArea.querySelectorAll('.draghome'));
        };
        doc.bgImg = (): HTMLImageElement => {
            return <HTMLImageElement> topNode.querySelector('.dropbackground');
        };
        doc.dragItemHome = (dragItemNo: number): HTMLElement => {
            return <HTMLElement> dragItemsArea.querySelector('.dragitemhomes' + dragItemNo);
        };
        doc.getClassnameNumericSuffix = (node: HTMLElement, prefix: string): number => {

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
        };
        doc.cloneNewDragItem = (dragInstanceNo: number, dragItemNo: number): HTMLElement => {
            const dragHome = doc.dragItemHome(dragItemNo);
            if (dragHome === null) {
                return null;
            }

            const dragHomeImg = dragHome.querySelector('img');
            let divDrag: HTMLElement;

            // Images need to be inside a div element to admit padding with width and height.
            if (dragHomeImg) {
                // Clone the image.
                const drag = <HTMLElement> dragHomeImg.cloneNode(true);

                // Create a div and put the image in it.
                divDrag = document.createElement('div');
                divDrag.appendChild(drag);
                divDrag.className = dragHome.className;
                drag.className = '';
            } else {
                // The drag item doesn't have an image, just clone it.
                divDrag = <HTMLElement> dragHome.cloneNode(true);
            }

            // Set the right classes and styles.
            divDrag.classList.remove('dragitemhomes' + dragItemNo);
            divDrag.classList.remove('draghome');
            divDrag.classList.add('dragitems' + dragItemNo);
            divDrag.classList.add('draginstance' + dragInstanceNo);
            divDrag.classList.add('drag');

            divDrag.style.visibility = 'inherit';
            divDrag.style.position = 'absolute';
            divDrag.setAttribute('draginstanceno', String(dragInstanceNo));
            divDrag.setAttribute('dragitemno', String(dragItemNo));

            // Insert the new drag after the dragHome.
            dragHome.parentElement.insertBefore(divDrag, dragHome.nextSibling);

            return divDrag;
        };

        return doc;
    }

    /**
     * Make an element draggable.
     *
     * @param drag Element to make draggable.
     * @param group Group the element belongs to.
     * @param choice Choice the element belongs to.
     */
    draggableForQuestion(drag: HTMLElement, group: number, choice: number): void {
        // Set attributes.
        drag.setAttribute('group', String(group));
        drag.setAttribute('choice', String(choice));

        if (!this.readOnly) {
            // Listen to click events.
            drag.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (drag.classList.contains('beingdragged')) {
                    this.deselectDrags();
                } else {
                    this.selectDrag(drag);
                }
            });
        }
    }

    /**
     * Function called when a drop zone is clicked.
     *
     * @param dropNode Drop element.
     */
    dropClick(dropNode: HTMLElement): void {
        const drag = this.selected;
        if (!drag) {
            // No selected item, nothing to do.
            return;
        }

        // Deselect the drag and place it in the position of this drop zone if it belongs to the same group.
        this.deselectDrags();

        if (Number(dropNode.getAttribute('group')) === Number(drag.getAttribute('group'))) {
            this.placeDragInDrop(drag, dropNode);
        }
    }

    /**
     * Get all the draggable elements for a choice and a drop zone.
     *
     * @param choice Choice number.
     * @param drop Drop zone.
     * @return Draggable elements.
     */
    getChoicesForDrop(choice: number, drop: HTMLElement): HTMLElement[] {
        return <HTMLElement[]> Array.from(this.doc.topNode().querySelectorAll(
                'div.dragitemgroup' + drop.getAttribute('group') + ' .choice' + choice + '.drag'));
    }

    /**
     * Get an unplaced draggable element that belongs to a certain choice and drop zone.
     *
     * @param choice Choice number.
     * @param drop Drop zone.
     * @return Unplaced draggable element.
     */
    getUnplacedChoiceForDrop(choice: number, drop: HTMLElement): HTMLElement {
        const dragItems = this.getChoicesForDrop(choice, drop);

        return dragItems.find((dragItem) => {
            return (!dragItem.classList.contains('placed') && !dragItem.classList.contains('beingdragged'));
        }) || null;
    }

    /**
     * Initialize drop zones.
     */
    initDrops(): void {
        const dropAreas = this.doc.topNode().querySelector('div.dropzones'),
            groupNodes = {};

        // Create all group nodes and add them to the drop area.
        for (let groupNo = 1; groupNo <= 8; groupNo++) {
            const groupNode = document.createElement('div');
            groupNode.className = 'dropzonegroup' + groupNo;

            dropAreas.appendChild(groupNode);
            groupNodes[groupNo] = groupNode;
        }

        // Create the drops specified by the init object.
        for (const dropNo in this.drops) {
            const drop = this.drops[dropNo],
                nodeClass = 'dropzone group' + drop.group + ' place' + dropNo,
                title = drop.text.replace('"', '\"'),
                dropNode = document.createElement('div');

            dropNode.setAttribute('title', title);
            dropNode.className = nodeClass;

            groupNodes[drop.group].appendChild(dropNode);
            dropNode.style.opacity = '0.5';
            dropNode.setAttribute('xy', drop.xy);
            dropNode.setAttribute('aria-label', drop.text);
            dropNode.setAttribute('place', dropNo);
            dropNode.setAttribute('inputid', drop.fieldname.replace(':', '_'));
            dropNode.setAttribute('group', drop.group);

            dropNode.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                this.dropClick(dropNode);
            });
        }
    }

    /**
     * Initialize the question.
     *
     * @param question Question.
     */
    initializer(question: any): void {
        this.doc = this.docStructure(question.slot);

        if (this.readOnly) {
            const container = this.doc.topNode();
            container.classList.add('readonly');
        }

        // Wait the DOM to be rendered.
        setTimeout(() => {
            const bgImg = this.doc.bgImg();

            // Wait for background image to be loaded.
            // On iOS, complete is mistakenly true, check also naturalWidth for compatibility.
            if (!bgImg.complete || !bgImg.naturalWidth) {
                this.toLoad++;
                bgImg.addEventListener('load', () => {
                    this.toLoad--;
                });
            }

            const itemHomes = this.doc.dragItemHomes();
            itemHomes.forEach((item) => {
                if (item.tagName == 'IMG') {
                    // Wait for drag images to be loaded.
                    // On iOS, complete is mistakenly true, check also naturalWidth for compatibility.
                    const itemImg = <HTMLImageElement> item;

                    if (!itemImg.complete || !itemImg.naturalWidth) {
                        this.toLoad++;
                        itemImg.addEventListener('load', () => {
                            this.toLoad--;
                        });
                    }
                }
            });

            this.pollForImageLoad();
        });

        this.resizeFunction = this.repositionDragsForQuestion.bind(this);
        window.addEventListener('resize', this.resizeFunction);
    }

    /**
     * Make the drag items area clickable.
     */
    makeDragAreaClickable(): void {
        if (this.readOnly) {
            return;
        }

        const home = this.doc.dragItemsArea();
        home.addEventListener('click', (e) => {
            const drag = this.selected;
            if (!drag) {
                // No element selected, nothing to do.
                return false;
            }

            // An element was selected. Deselect it and move it back to the area if needed.
            this.deselectDrags();
            this.removeDragFromDrop(drag);

            e.preventDefault();
            e.stopPropagation();
        });
    }

    /**
     * Place a draggable element into a certain drop zone.
     *
     * @param drag Draggable element.
     * @param drop Drop zone element.
     */
    placeDragInDrop(drag: HTMLElement, drop: HTMLElement): void {
        // Search the input related to the drop zone.
        const targetInputId = drop.getAttribute('inputid'),
            inputNode = <HTMLInputElement> this.doc.topNode().querySelector('input#' + targetInputId);

        // Check if the draggable item is already assigned to an input and if it's the same as the one of the drop zone.
        const originInputId = drag.getAttribute('inputid');
        if (originInputId && originInputId != targetInputId) {
            // Remove it from the previous place.
            const originInputNode = <HTMLInputElement> this.doc.topNode().querySelector('input#' + originInputId);
            originInputNode.setAttribute('value', '0');
        }

        // Now position the draggable and set it to the input.
        const position = this.domUtils.getElementXY(drop, null, 'ddarea');
        drag.style.left = position[0] - 1 + 'px';
        drag.style.top = position[1] - 1 + 'px';
        drag.classList.add('placed');

        if (drag.getAttribute('choice')) {
            inputNode.setAttribute('value', drag.getAttribute('choice'));
        }

        drag.setAttribute('inputid', targetInputId);
    }

    /**
     * Wait for images to be loaded.
     */
    pollForImageLoad(): void {
        if (this.afterImageLoadDone) {
            // Already done, stop.
            return;
        }

        if (this.toLoad <= 0) {
            // All images loaded.
            this.createAllDragAndDrops();
            this.afterImageLoadDone = true;
            this.question.loaded = true;
        }

        // Try again after a while.
        setTimeout(() => {
            this.pollForImageLoad();
        }, 1000);
    }

    /**
     * Remove a draggable element from the drop zone where it is.
     *
     * @param drag Draggable element to remove.
     */
    removeDragFromDrop(drag: HTMLElement): void {
        // Check if the draggable element is assigned to an input. If so, empty the input's value.
        const inputId = drag.getAttribute('inputid');
        if (inputId) {
            const inputNode = <HTMLInputElement> this.doc.topNode().querySelector('input#' + inputId);
            inputNode.setAttribute('value', '0');
        }

        // Move the element to its original position.
        const dragItemHome = this.doc.dragItemHome(Number(drag.getAttribute('dragitemno'))),
            position = this.domUtils.getElementXY(dragItemHome, null, 'ddarea');

        drag.style.left = position[0] + 'px';
        drag.style.top = position[1] + 'px';
        drag.classList.remove('placed');

        drag.setAttribute('inputid', '');
    }

    /**
     * Reposition all the draggable elements and drop zones.
     */
    repositionDragsForQuestion(): void {
        const dragItems = this.doc.dragItems();

        // Mark all draggable items as "unplaced", they will be placed again later.
        dragItems.forEach((dragItem) => {
            dragItem.classList.remove('placed');
            dragItem.setAttribute('inputid', '');
        });

        // Calculate the proportion to apply to images.
        this.calculateImgProportion();

        // Apply the proportion to all images in drag item homes.
        const dragItemHomes = this.doc.dragItemHomes();
        for (let x = 0; x < dragItemHomes.length; x++) {
            const dragItemHome = dragItemHomes[x],
                dragItemHomeImg = dragItemHome.querySelector('img');

            if (dragItemHomeImg && dragItemHomeImg.naturalWidth > 0) {
                const widthHeight = [Math.round(dragItemHomeImg.naturalWidth * this.proportion),
                    Math.round(dragItemHomeImg.naturalHeight * this.proportion)];

                dragItemHomeImg.style.width = widthHeight[0] + 'px';
                dragItemHomeImg.style.height = widthHeight[1] + 'px';

                // Apply the proportion to all the images cloned from this home.
                const dragItemNo = this.doc.getClassnameNumericSuffix(dragItemHome, 'dragitemhomes'),
                    groupNo = this.doc.getClassnameNumericSuffix(dragItemHome, 'group'),
                    dragsImg = <HTMLElement[]> Array.from(this.doc.topNode().querySelectorAll(
                            '.drag.group' + groupNo + '.dragitems' + dragItemNo + '  img'));

                dragsImg.forEach((dragImg) => {
                    dragImg.style.width = widthHeight[0] + 'px';
                    dragImg.style.height = widthHeight[1] + 'px';
                });
            }
        }

        // Update the padding of all draggable elements.
        this.updatePaddingSizesAll();

        const dropZones = this.doc.dropZones();
        for (let x = 0; x < dropZones.length; x++) {
            // Re-position the drop zone based on the proportion.
            const dropZone = dropZones[x],
                dropZoneXY = dropZone.getAttribute('xy').split(',').map((i) => {
                    return Number(i);
                }),
                relativeXY = this.convertToWindowXY(dropZoneXY);

            dropZone.style.left = relativeXY[0] + 'px';
            dropZone.style.top = relativeXY[1] + 'px';

            // Re-place items got from the inputs.
            const inputCss = 'input#' + dropZone.getAttribute('inputid'),
                input = <HTMLInputElement> this.doc.topNode().querySelector(inputCss),
                choice = Number(input.value);

            if (choice > 0) {
                const dragItem = this.getUnplacedChoiceForDrop(choice, dropZone);

                if (dragItem !== null) {
                    this.placeDragInDrop(dragItem, dropZone);
                }
            }
        }

        // Re-place draggable items not placed drop zones (they will be placed in the original position).
        for (let x = 0; x < dragItems.length; x++) {
            const dragItem = dragItems[x];
            if (!dragItem.classList.contains('placed') && !dragItem.classList.contains('beingdragged')) {
                this.removeDragFromDrop(dragItem);
            }
        }
    }

    /**
     * Mark a draggable element as selected.
     *
     * @param drag Element to select.
     */
    selectDrag(drag: HTMLElement): void {
        // Deselect previous ones.
        this.deselectDrags();

        this.selected = drag;
        drag.classList.add('beingdragged');
    }

    /**
     * Stop waiting for images to be loaded.
     */
    stopPolling(): void {
        this.afterImageLoadDone = true;
    }

    /**
     * Update the padding of all items in a group to make them all have the same width and height.
     *
     * @param groupNo The group number.
     */
    updatePaddingSizeForGroup(groupNo: number): void {

        // Get all the items for this group.
        const groupItems = <HTMLElement[]> Array.from(this.doc.topNode().querySelectorAll('.draghome.group' + groupNo));
        if (groupItems.length !== 0) {

            // Get the max width and height of the items.
            let maxWidth = 0,
                maxHeight = 0;

            for (let x = 0; x < groupItems.length; x++) {
                // Check if the item has an img.
                const item = groupItems[x],
                    img = item.querySelector('img');

                if (img) {
                    maxWidth = Math.max(maxWidth, Math.round(this.proportion * img.naturalWidth));
                    maxHeight = Math.max(maxHeight, Math.round(this.proportion * img.naturalHeight));
                } else {
                    // Remove the padding to calculate the size.
                    const originalPadding = item.style.padding;
                    item.style.padding = '';

                    // Text is not affected by the proportion.
                    maxWidth = Math.max(maxWidth, Math.round(item.clientWidth));
                    maxHeight = Math.max(maxHeight, Math.round(item.clientHeight));

                    // Restore the padding.
                    item.style.padding = originalPadding;
                }
            }

            if (maxWidth <= 0 || maxHeight <= 0) {
                return;
            }

            // Add a variable padding to the image or text.
            maxWidth = Math.round(maxWidth + this.proportion * 8);
            maxHeight = Math.round(maxHeight + this.proportion * 8);

            for (let x = 0; x < groupItems.length; x++) {
                // Check if the item has an img and calculate its width and height.
                const item = groupItems[x],
                    img = item.querySelector('img');
                let width, height;

                if (img) {
                    width = Math.round(img.naturalWidth * this.proportion);
                    height = Math.round(img.naturalHeight * this.proportion);
                } else {
                    // Remove the padding to calculate the size.
                    const originalPadding = item.style.padding;
                    item.style.padding = '';

                    // Text is not affected by the proportion.
                    width = Math.round(item.clientWidth);
                    height = Math.round(item.clientHeight);

                    // Restore the padding.
                    item.style.padding = originalPadding;
                }

                // Now set the right padding to make this item have the max height and width.
                const marginTopBottom = Math.round((maxHeight - height) / 2),
                    marginLeftRight = Math.round((maxWidth - width) / 2);

                // Correction for the roundings.
                const widthCorrection = maxWidth - (width + marginLeftRight * 2),
                    heightCorrection = maxHeight - (height + marginTopBottom * 2);

                item.style.padding = marginTopBottom + 'px ' + marginLeftRight + 'px ' +
                    (marginTopBottom + heightCorrection) + 'px ' + (marginLeftRight + widthCorrection) + 'px';

                const dragItemNo = this.doc.getClassnameNumericSuffix(item, 'dragitemhomes'),
                    drags = <HTMLElement[]> Array.from(this.doc.topNode().querySelectorAll(
                            '.drag.group' + groupNo + '.dragitems' + dragItemNo));

                drags.forEach((drag) => {
                    drag.style.padding = marginTopBottom + 'px ' + marginLeftRight + 'px ' +
                            (marginTopBottom + heightCorrection) + 'px ' + (marginLeftRight + widthCorrection) + 'px';
                });
            }

            // It adds the border of 1px to the width.
            const zoneGroups = this.doc.dropZoneGroup(groupNo);
            zoneGroups.forEach((zone) => {
                zone.style.width = maxWidth + 2 + 'px ';
                zone.style.height = maxHeight + 2 + 'px ';
            });
        }
    }

    /**
     * Update the padding of all items in all groups.
     */
    updatePaddingSizesAll(): void {
        for (let groupNo = 1; groupNo <= 8; groupNo++) {
            this.updatePaddingSizeForGroup(groupNo);
        }
    }
}
