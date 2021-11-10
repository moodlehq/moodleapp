(function() {
    // Set up the M object - only pending_js is implemented.
    window.M = window.M ? window.M : {};
    var M = window.M;
    M.util = M.util ? M.util : {};
    M.util.pending_js = M.util.pending_js ? M.util.pending_js : []; // eslint-disable-line camelcase

    /**
     * Logs information from this Behat runtime JavaScript, including the time and the 'BEHAT'
     * keyword so we can easily filter for it if needed.
     *
     * @param {string} text Information to log
     */
    var log = function() {
        var now = new Date();
        var nowFormatted = String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0') + '.' +
                String(now.getMilliseconds()).padStart(2, '0');
        console.log('BEHAT: ' + nowFormatted, ...arguments); // eslint-disable-line no-console
    };

    /**
     * Run after several setTimeouts to ensure queued events are finished.
     *
     * @param {function} target function to run
     * @param {number} count Number of times to do setTimeout (leave blank for 10)
     */
    var runAfterEverything = function(target, count) {
        if (count === undefined) {
            count = 10;
        }
        setTimeout(function() {
            count--;
            if (count == 0) {
                target();
            } else {
                runAfterEverything(target, count);
            }
        }, 0);
    };

    /**
     * Adds a pending key to the array.
     *
     * @param {string} key Key to add
     */
    var addPending = function(key) {
        // Add a special DELAY entry whenever another entry is added.
        if (window.M.util.pending_js.length == 0) {
            window.M.util.pending_js.push('DELAY');
        }
        window.M.util.pending_js.push(key);

        log('PENDING+: ' + window.M.util.pending_js);
    };

    /**
     * Removes a pending key from the array. If this would clear the array, the actual clear only
     * takes effect after the queued events are finished.
     *
     * @param {string} key Key to remove
     */
    var removePending = function(key) {
        // Remove the key immediately.
        window.M.util.pending_js = window.M.util.pending_js.filter(function(x) { // eslint-disable-line camelcase
            return x !== key;
        });
        log('PENDING-: ' + window.M.util.pending_js);

        // If the only thing left is DELAY, then remove that as well, later...
        if (window.M.util.pending_js.length === 1) {
            runAfterEverything(function() {
                // Check there isn't a spinner...
                checkUIBlocked();

                // Only remove it if the pending array is STILL empty after all that.
                if (window.M.util.pending_js.length === 1) {
                    window.M.util.pending_js = []; // eslint-disable-line camelcase
                    log('PENDING-: ' + window.M.util.pending_js);
                }
            });
        }
    };

    /**
     * Adds a pending key to the array, but removes it after some setTimeouts finish.
     */
    var addPendingDelay = function() {
        addPending('...');
        removePending('...');
    };

    // Override XMLHttpRequest to mark things pending while there is a request waiting.
    var realOpen = XMLHttpRequest.prototype.open;
    var requestIndex = 0;
    XMLHttpRequest.prototype.open = function() {
        var index = requestIndex++;
        var key = 'httprequest-' + index;

        try {
            // Add to the list of pending requests.
            addPending(key);

            // Detect when it finishes and remove it from the list.
            this.addEventListener('loadend', function() {
                removePending(key);
            });

            return realOpen.apply(this, arguments);
        } catch (e) {
            removePending(key);
            throw e;
        }
    };

    var waitingBlocked = false;

    /**
     * Checks if a loading spinner is present and visible; if so, adds it to the pending array
     * (and if not, removes it).
     */
    var checkUIBlocked = function() {
        var blocked = document.querySelector('span.core-loading-spinner, ion-loading, .click-block-active');
        if (blocked && blocked.offsetParent) {
            if (!waitingBlocked) {
                addPending('blocked');
                waitingBlocked = true;
            }
        } else {
            if (waitingBlocked) {
                removePending('blocked');
                waitingBlocked = false;
            }
        }
    };

    // It would be really beautiful if you could detect CSS transitions and animations, that would
    // cover almost everything, but sadly there is no way to do this because the transitionstart
    // and animationcancel events are not implemented in Chrome, so we cannot detect either of
    // these reliably. Instead, we have to look for any DOM changes and do horrible polling. Most
    // of the animations are set to 500ms so we allow it to continue from 500ms after any DOM
    // change.

    var recentMutation = false;
    var lastMutation;

    /**
     * Called from the mutation callback to remove the pending tag after 500ms if nothing else
     * gets mutated.
     *
     * This will be called after 500ms, then every 100ms until there have been no mutation events
     * for 500ms.
     */
    var pollRecentMutation = function() {
        if (Date.now() - lastMutation > 500) {
            recentMutation = false;
            removePending('dom-mutation');
        } else {
            setTimeout(pollRecentMutation, 100);
        }
    };

    /**
     * Mutation callback, called whenever the DOM is mutated.
     */
    var mutationCallback = function() {
        lastMutation = Date.now();
        if (!recentMutation) {
            recentMutation = true;
            addPending('dom-mutation');
            setTimeout(pollRecentMutation, 500);
        }
        // Also update the spinner presence if needed.
        checkUIBlocked();
    };

    // Set listener using the mutation callback.
    var observer = new MutationObserver(mutationCallback);
    observer.observe(document, {attributes: true, childList: true, subtree: true});

    /**
     * Check if an element is visible.
     *
     * @param {HTMLElement} element Element
     * @param {HTMLElement} container Container
     * @returns {boolean} Whether the element is visible or not
     */
    var isElementVisible = (element, container) => {
        if (element.getAttribute('aria-hidden') === 'true' || getComputedStyle(element).display === 'none')
            return false;

        const parentElement = getParentElement(element);
        if (parentElement === container)
            return true;

        if (!parentElement)
            return false;

        return isElementVisible(parentElement, container);
    };

    /**
     * Check if an element is selected.
     *
     * @param {HTMLElement} element Element
     * @param {HTMLElement} container Container
     * @returns {boolean} Whether the element is selected or not
     */
    var isElementSelected = (element, container) => {
        const ariaCurrent = element.getAttribute('aria-current');
        if (
            (ariaCurrent && ariaCurrent !== 'false') ||
            (element.getAttribute('aria-selected') === 'true') ||
            (element.getAttribute('aria-checked') === 'true')
        )
            return true;

        const parentElement = getParentElement(element);
        if (!parentElement || parentElement === container)
            return false;

        return isElementSelected(parentElement, container);
    };

    /**
     * Generic shared function to find possible xpath matches within the document, that are visible,
     * and then process them using a callback function.
     *
     * @param {string} xpath Xpath to use
     * @param {function} process Callback function that handles each matched node
     */
    var findPossibleMatches = function(xpath, process) {
        var select = 'ion-alert, ion-popover, ion-action-sheet, core-ion-tab.show-tab ion-page.show-page, ion-page.show-page, html';
        var parent = document.querySelector(select);
        var matches = document.evaluate(xpath, parent || document);
        while (true) {
            var match = matches.iterateNext();
            if (!match) {
                break;
            }
            // Skip invisible text nodes.
            if (!match.offsetParent) {
                continue;
            }

            process(match);
        }
    };

    /**
     * Finds elements within a given container.
     *
     * @param {HTMLElement} container Parent element to search the element within
     * @param {string} text Text to look for
     * @return {HTMLElement} Elements containing the given text
     */
    var findElementsBasedOnTextWithin = (container, text) => {
        const elements = [];
        const attributesSelector = `[aria-label*="${text}"], a[title*="${text}"], img[alt*="${text}"]`;

        for (const foundByAttributes of container.querySelectorAll(attributesSelector)) {
            if (!isElementVisible(foundByAttributes, container))
                continue;

            elements.push(foundByAttributes);
        }

        const treeWalker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_DOCUMENT_FRAGMENT | NodeFilter.SHOW_TEXT,
            {
                acceptNode: node => {
                    if (
                        node instanceof HTMLStyleElement ||
                        node instanceof HTMLLinkElement ||
                        node instanceof HTMLScriptElement
                    )
                        return NodeFilter.FILTER_REJECT;

                    if (
                        node instanceof HTMLElement && (
                            node.getAttribute('aria-hidden') === 'true' || getComputedStyle(node).display === 'none'
                        )
                    )
                        return NodeFilter.FILTER_REJECT;

                    return NodeFilter.FILTER_ACCEPT;
                }
            },
        );

        let currentNode;
        while (currentNode = treeWalker.nextNode()) {
            if (currentNode instanceof Text) {
                if (currentNode.textContent.includes(text)) {
                    elements.push(currentNode.parentElement);
                }

                continue;
            }

            const labelledBy = currentNode.getAttribute('aria-labelledby');
            const labelElement = labelledBy && container.querySelector(`#${labelledBy}`);
            if (labelElement && labelElement.innerText && labelElement.innerText.includes(text)) {
                elements.push(currentNode);

                continue;
            }

            if (currentNode.shadowRoot) {
                for (const childNode of currentNode.shadowRoot.childNodes) {
                    if (
                        !(childNode instanceof HTMLElement) || (
                            childNode instanceof HTMLStyleElement ||
                            childNode instanceof HTMLLinkElement ||
                            childNode instanceof HTMLScriptElement
                        )
                    ) {
                        continue;
                    }

                    if (childNode.matches(attributesSelector)) {
                        elements.push(childNode);

                        continue;
                    }

                    elements.push(...findElementsBasedOnTextWithin(childNode, text));
                }
            }
        }

        return elements;
    };

    /**
     * Given a list of elements, get the top ancestors among all of them.
     *
     * This will remote duplicates and drop any elements nested within each other.
     *
     * @param {Array} elements Elements list.
     * @return {Array} Top ancestors.
     */
    var getTopAncestors = function(elements) {
        const uniqueElements = new Set(elements);

        for (const element of uniqueElements) {
            for (otherElement of uniqueElements) {
                if (otherElement === element) {
                    continue;
                }

                if (element.contains(otherElement)) {
                    uniqueElements.delete(otherElement);
                }
            }
        }

        return [...uniqueElements];
    };

    /**
     * Get parent element, including Shadow DOM parents.
     *
     * @param {HTMLElement} element Element.
     * @return {HTMLElement} Parent element.
     */
    var getParentElement = function(element) {
        return element.parentElement || (element.getRootNode() && element.getRootNode().host) || null;
    };

    /**
     * Function to find elements based on their text or Aria label.
     *
     * @param {object} locator Element locator.
     * @return {HTMLElement} Found elements
     */
    var findElementsBasedOnText = function(locator) {
        const topContainer = document.querySelector('ion-alert, ion-popover, ion-action-sheet, core-ion-tab.show-tab ion-page.show-page, ion-page.show-page, html');
        let container = topContainer;

        if (topContainer && locator.near) {
            const nearElements = findElementsBasedOnText(locator.near);

            if (nearElements.length === 0) {
                throw new Error('There was no match for near text')
            } else if (nearElements.length > 1) {
                const nearElementsAncestors = getTopAncestors(nearElements);

                if (nearElementsAncestors.length > 1) {
                    throw new Error('Too many matches for near text');
                }

                container = getParentElement(nearElementsAncestors[0]);
            } else {
                container = getParentElement(nearElements[0]);
            }
        }

        do {
            const elements = findElementsBasedOnTextWithin(container, locator.text);
            const filteredElements = locator.selector
                ? elements.filter(element => element.matches(locator.selector))
                : elements;

            if (filteredElements.length > 0) {
                return filteredElements;
            }
        } while ((container = getParentElement(container)) && container !== topContainer);

        return [];
    };

    /**
     * Press an element.
     *
     * @param {HTMLElement} element Element to press.
     */
    var pressElement = function(element) {
        if (window.BehatMoodleAppLegacy) {
            var mainContent = getNavCtrl().getActive().contentRef().nativeElement;
            var rect = element.getBoundingClientRect();

            // Scroll the item into view.
            mainContent.scrollTo(rect.x, rect.y);

            // Simulate a mouse click on the button.
            var eventOptions = {
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
                bubbles: true,
                view: window,
                cancelable: true,
            };
            setTimeout(() => element.dispatchEvent(new MouseEvent('mousedown', eventOptions)), 0);
            setTimeout(() => element.dispatchEvent(new MouseEvent('mouseup', eventOptions)), 0);
            setTimeout(() => element.dispatchEvent(new MouseEvent('click', eventOptions)), 0);
        } else {
            // Scroll the item into view.
            element.scrollIntoView();

            // Events don't bubble up across Shadow DOM boundaries, and some buttons
            // may not work without doing this.
            const parentElement = getParentElement(element);

            if (parentElement && parentElement.matches('ion-button, ion-back-button')) {
                element = parentElement;
            }

            // There are some buttons in the app that don't respond to click events, for example
            // buttons using the core-supress-events directive. That's why we need to send both
            // click and mouse events.
            element.dispatchEvent(new MouseEvent('mousedown', eventOptions));

            setTimeout(() => {
                element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
                element.click();
            }, 300);
        }

        // Mark busy until the button click finishes processing.
        addPendingDelay();
    };

    /**
     * Function to find and click an app standard button.
     *
     * @param {string} button Type of button to press
     * @return {string} OK if successful, or ERROR: followed by message
     */
    var behatPressStandard = function(button) {
        log('Action - Click standard button: ' + button);

        // Find button
        var foundButton = null;

        if (window.BehatMoodleAppLegacy) {
            var selector;
            switch (button) {
                case 'back' :
                    selector = 'ion-navbar > button.back-button-md';
                    break;
                case 'main menu' :
                    // Change in app version 3.8.
                    selector = 'page-core-mainmenu .tab-button > ion-icon[aria-label=more], ' +
                            'page-core-mainmenu .tab-button > ion-icon[aria-label=menu]';
                    break;
                case 'page menu' :
                    // This lang string was changed in app version 3.6.
                    selector = 'core-context-menu > button[aria-label=Info], ' +
                            'core-context-menu > button[aria-label=Information], ' +
                            'core-context-menu > button[aria-label="Display options"]';
                    break;
                default:
                    return 'ERROR: Unsupported standard button type';
            }
            var buttons = Array.from(document.querySelectorAll(selector));
            var tooMany = false;
            buttons.forEach(function(button) {
                if (button.offsetParent) {
                    if (foundButton === null) {
                        foundButton = button;
                    } else {
                        tooMany = true;
                    }
                }
            });
            if (!foundButton) {
                return 'ERROR: Could not find button';
            }
            if (tooMany) {
                return 'ERROR: Found too many buttons';
            }
        } else {
            switch (button) {
                case 'back':
                    foundButton = findElementsBasedOnText({ text: 'Back' })[0];
                    break;
                case 'main menu':
                    foundButton = findElementsBasedOnText({
                        text: 'More',
                        near: { text: 'Notifications' },
                    })[0];
                    break;
                case 'accounts menu' :
                    foundButton = findElementsBasedOnText({ text: 'Account' })[0];
                    break;
                case 'page menu':
                    foundButton = findElementsBasedOnText({ text: 'Display options' })[0];
                    break;
                default:
                    return 'ERROR: Unsupported standard button type';
            }
        }

        // Click button
        pressElement(foundButton);

        return 'OK';
    };

    /**
     * When there is a popup, clicks on the backdrop.
     *
     * @return {string} OK if successful, or ERROR: followed by message
     */
    var behatClosePopup = function() {
        log('Action - Close popup');

        var backdrops = Array.from(document.querySelectorAll('ion-backdrop'));
        var found = null;
        var tooMany = false;
        backdrops.forEach(function(backdrop) {
            if (backdrop.offsetParent) {
                if (found === null) {
                    found = backdrop;
                } else {
                    tooMany = true;
                }
            }
        });
        if (!found) {
            return 'ERROR: Could not find backdrop';
        }
        if (tooMany) {
            return 'ERROR: Found too many backdrops';
        }
        found.click();

        // Mark busy until the click finishes processing.
        addPendingDelay();

        return 'OK';
    };

    /**
     * Function to find an arbitrary item based on its text or aria label.
     *
     * @param {object} locator Element locator.
     * @return {string} OK if successful, or ERROR: followed by message
     */
    var behatFind = function(locator) {
        log('Action - Find', locator);

        try {
            const element = findElementsBasedOnText(locator)[0];

            if (!element) {
                return 'ERROR: No matches for text';
            }

            return 'OK';
        } catch (error) {
            return 'ERROR: ' + error.message;
        }
    };

    /**
     * Get main navigation controller.
     *
     * @return {Object} main navigation controller.
     */
    var getNavCtrl = function() {
        var mainNav = window.appProvider.appCtrl.getRootNavs()[0].getActiveChildNav();
        if (mainNav && mainNav.tabsIds.length && mainNav.firstSelectedTab) {
            var tabPos = mainNav.tabsIds.indexOf(mainNav.firstSelectedTab);
            if (tabPos !== -1 && mainNav._tabs && mainNav._tabs.length > tabPos) {
                return mainNav._tabs[tabPos];
            }
        }
        // Fallback to return main nav - this will work but will overlay current tab.
        return window.appProvider.appCtrl.getRootNavs()[0];
    };

    /**
     * Check whether an item is selected or not.
     *
     * @param {object} locator Element locator.
     * @return {string} YES or NO if successful, or ERROR: followed by message
     */
    var behatIsSelected = function(locator) {
        log('Action - Is Selected', locator);

        try {
            const element = findElementsBasedOnText(locator)[0];

            return isElementSelected(element, document.body) ? 'YES' : 'NO';
        } catch (error) {
            return 'ERROR: ' + error.message;
        }
    }

    /**
     * Function to press arbitrary item based on its text or Aria label.
     *
     * @param {object} locator Element locator.
     * @return {string} OK if successful, or ERROR: followed by message
     */
    var behatPress = function(locator) {
        log('Action - Press', locator);

        var found;
        try {
            found = findElementsBasedOnText(locator)[0];

            if (!found) {
                return 'ERROR: No matches for text';
            }
        } catch (error) {
            return 'ERROR: ' + error.message;
        }

        pressElement(found);

        return 'OK';
    };

    /**
     * Gets the currently displayed page header.
     *
     * @return {string} OK: followed by header text if successful, or ERROR: followed by message.
     */
    var behatGetHeader = function() {
        log('Action - Get header');

        var result = null;
        var resultCount = 0;
        var titles = Array.from(document.querySelectorAll('ion-header ion-title, ion-header h1'));
        titles.forEach(function(title) {
            if (
                (window.BehatMoodleAppLegacy && title.offsetParent) ||
                (!window.BehatMoodleAppLegacy && isElementVisible(title, document.body))
            ) {
                result = title.innerText.trim();
                resultCount++;
            }
        });

        if (resultCount > 1) {
            return 'ERROR: Too many possible titles';
        } else if (!resultCount) {
            return 'ERROR: No title found';
        } else {
            return 'OK:' + result;
        }
    };

    /**
     * Sets the text of a field to the specified value.
     *
     * This currently matches fields only based on the placeholder attribute.
     *
     * @param {string} field Field name
     * @param {string} value New value
     * @return {string} OK or ERROR: followed by message
     */
    var behatSetField = function(field, value) {
        log('Action - Set field ' + field + ' to: ' + value);

        if (window.BehatMoodleAppLegacy) {
            // Find input(s) with given placeholder.
            var escapedText = field.replace('"', '""');
            var exactMatches = [];
            var anyMatches = [];
            findPossibleMatches(
                    '//input[contains(@placeholder, "' + escapedText + '")] |' +
                    '//textarea[contains(@placeholder, "' + escapedText + '")] |' +
                    '//core-rich-text-editor/descendant::div[contains(@data-placeholder-text, "' +
                    escapedText + '")]', function(match) {
                        // Add to array depending on if it's an exact or partial match.
                        var placeholder;
                        if (match.nodeName === 'DIV') {
                            placeholder = match.getAttribute('data-placeholder-text');
                        } else {
                            placeholder = match.getAttribute('placeholder');
                        }
                        if (placeholder.trim() === field) {
                            exactMatches.push(match);
                        } else {
                            anyMatches.push(match);
                        }
                    });

            // Select the resulting match.
            var found = null;
            do {
                // If there is an exact text match, use that (regardless of other matches).
                if (exactMatches.length > 1) {
                    return 'ERROR: Too many exact placeholder matches for text';
                } else if (exactMatches.length) {
                    found = exactMatches[0];
                    break;
                }

                // If there is one partial text match, use that.
                if (anyMatches.length > 1) {
                    return 'ERROR: Too many partial placeholder matches for text';
                } else if (anyMatches.length) {
                    found = anyMatches[0];
                    break;
                }
            } while (false);

            if (!found) {
                return 'ERROR: No matches for text';
            }
        } else {
            found = findElementsBasedOnText({ text: field, selector: 'input, textarea, [contenteditable="true"]' })[0];

            if (!found) {
                return 'ERROR: No matches for text';
            }
        }

        // Functions to get/set value depending on field type.
        var setValue;
        var getValue;
        switch (found.nodeName) {
            case 'INPUT':
            case 'TEXTAREA':
                setValue = function(text) {
                    found.value = text;
                };
                getValue = function() {
                    return found.value;
                };
                break;
            case 'DIV':
                setValue = function(text) {
                    found.innerHTML = text;
                };
                getValue = function() {
                    return found.innerHTML;
                };
                break;
        }

        // Pretend we have cut and pasted the new text.
        var event;
        if (getValue() !== '') {
            event = new InputEvent('input', {bubbles: true, view: window, cancelable: true,
                inputType: 'devareByCut'});
            setTimeout(function() {
                setValue('');
                found.dispatchEvent(event);
            }, 0);
        }
        if (value !== '') {
            event = new InputEvent('input', {bubbles: true, view: window, cancelable: true,
                inputType: 'insertFromPaste', data: value});
            setTimeout(function() {
                setValue(value);
                found.dispatchEvent(event);
            }, 0);
        }

        return 'OK';
    };

    // Make some functions publicly available for Behat to call.
    window.behat = {
        pressStandard : behatPressStandard,
        closePopup : behatClosePopup,
        find : behatFind,
        isSelected : behatIsSelected,
        press : behatPress,
        setField : behatSetField,
        getHeader : behatGetHeader,
    };
})();
