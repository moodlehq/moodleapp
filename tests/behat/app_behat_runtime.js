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
    var log = function(text) {
        var now = new Date();
        var nowFormatted = String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0') + '.' +
                String(now.getMilliseconds()).padStart(2, '0');
        console.log('BEHAT: ' + nowFormatted + ' ' + text); // eslint-disable-line no-console
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

        // Add to the list of pending requests.
        addPending(key);

        // Detect when it finishes and remove it from the list.
        this.addEventListener('loadend', function() {
            removePending(key);
        });

        return realOpen.apply(this, arguments);
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

        if (element.parentElement === container)
            return true;

        if (!element.parentElement)
            return false;

        return isElementVisible(element.parentElement, container);
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
     * Finds an element within a given container.
     *
     * @param {HTMLElement} container Parent element to search the element within
     * @param {string} text Text to look for
     * @return {HTMLElement} Found element
     */
    var findElementBasedOnTextWithin = (container, text) => {
        const attributesSelector = `[aria-label*="${text}"], a[title*="${text}"], img[alt*="${text}"]`;

        for (const foundByAttributes of container.querySelectorAll(attributesSelector)) {
            if (isElementVisible(foundByAttributes, container))
                return foundByAttributes;
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
                    return currentNode.parentElement;
                }

                continue;
            }

            const labelledBy = currentNode.getAttribute('aria-labelledby');
            if (labelledBy && container.querySelector(`#${labelledBy}`)?.innerText?.includes(text))
                return currentNode;

            if (currentNode.shadowRoot) {
                for (const childNode of currentNode.shadowRoot.childNodes) {
                    if (!childNode) {
                        continue;
                    }

                    if (childNode.matches(attributesSelector)) {
                        return childNode;
                    }

                    const foundByText = findElementBasedOnTextWithin(childNode, text);

                    if (foundByText) {
                        return foundByText;
                    }
                }
            }
        }
    };

    /**
     * Function to find an element based on its text or Aria label.
     *
     * @param {string} text Text (full or partial)
     * @param {string} [near] Optional 'near' text - if specified, must have a single match on page
     * @return {HTMLElement} Found element
     */
    var findElementBasedOnText = function(text, near) {
        const topContainer = document.querySelector('ion-alert, ion-popover, ion-action-sheet, core-ion-tab.show-tab ion-page.show-page, ion-page.show-page, html');
        let container = topContainer;

        if (topContainer && near) {
            const nearElement = findElementBasedOnText(near);

            if (!nearElement) {
                return;
            }

            container = nearElement.parentElement;
        }

        do {
            const node = findElementBasedOnTextWithin(container, text);

            if (node) {
                return node;
            }
        } while ((container = container.parentElement) && container !== topContainer);
    };

    /**
     * Function to find and click an app standard button.
     *
     * @param {string} button Type of button to press
     * @return {string} OK if successful, or ERROR: followed by message
     */
    var behatPressStandard = function(button) {
        log('Action - Click standard button: ' + button);
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
        var foundButton = null;
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
        foundButton.click();

        // Mark busy until the button click finishes processing.
        addPendingDelay();

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
     * @param {string} text Text (full or partial)
     * @param {string} [near] Optional 'near' text
     * @return {string} OK if successful, or ERROR: followed by message
     */
    var behatFind = function(text, near) {
        log(`Action - Find ${text}`);

        try {
            const element = findElementBasedOnText(text, near);

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
     * Function to press arbitrary item based on its text or Aria label.
     *
     * @param {string} text Text (full or partial)
     * @param {string} near Optional 'near' text
     * @return {string} OK if successful, or ERROR: followed by message
     */
    var behatPress = function(text, near) {
        log('Action - Press ' + text + (near === undefined ? '' : ' - near ' + near));

        var found;
        try {
            found = findElementBasedOnText(text, near);

            if (!found) {
                return 'ERROR: No matches for text';
            }
        } catch (error) {
            return 'ERROR: ' + error.message;
        }

        if (window.BehatMoodleAppLegacy) {
            var mainContent = getNavCtrl().getActive().contentRef().nativeElement;
            var rect = found.getBoundingClientRect();

            // Scroll the item into view.
            mainContent.scrollTo(rect.x, rect.y);

            // Simulate a mouse click on the button.
            var eventOptions = {clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
                    bubbles: true, view: window, cancelable: true};
            setTimeout(function() {
                found.dispatchEvent(new MouseEvent('mousedown', eventOptions));
            }, 0);
            setTimeout(function() {
                found.dispatchEvent(new MouseEvent('mouseup', eventOptions));
            }, 0);
            setTimeout(function() {
                found.dispatchEvent(new MouseEvent('click', eventOptions));
            }, 0);
        } else {
            found.scrollIntoView();
            setTimeout(() => found.click(), 300);
        }

        // Mark busy until the button click finishes processing.
        addPendingDelay();

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
        var titles = Array.from(document.querySelectorAll('ion-header ion-title'));
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
        press : behatPress,
        setField : behatSetField,
        getHeader : behatGetHeader,
    };
})();
