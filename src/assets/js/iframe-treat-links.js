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

(function () {
    const locationHref = location.href;

    if (locationHref.match(/^moodleappfs:\/\/localhost/i) || !locationHref.match(/^[a-z0-9]+:\/\//i)) {
        // Same domain as the app, stop.
        return;
    }

    // Redefine window.open.
    window.open = function(url, name, specs) {
        if (name == '_self') {
            // Link should be loaded in the same frame.
            location.href = toAbsolute(url);

            return;
        }

        getRootWindow(window).postMessage({
            environment: 'moodleapp',
            context: 'iframe',
            action: 'window_open',
            frameUrl: location.href,
            url: url,
            name: name,
            specs: specs,
        }, '*');
    };

    // Handle link clicks.
    document.addEventListener('click', (documentClickEvent) => {
        if (documentClickEvent.defaultPrevented) {
            // Event already prevented by some other code.
            return;
        }

        // Find the link being clicked.
        let el = documentClickEvent.target;
        while (el && (el.tagName !== 'A' && el.tagName !== 'a')) {
            el = el.parentElement;
        }

        if (!el || el.treated) {
            return;
        }

        // Add click listener to the link, this way if the iframe has added a listener to the link it will be executed first.
        el.treated = true;
        el.addEventListener('click', function(elementClickEvent) {
            linkClicked(el, elementClickEvent);
        });
    }, {
        capture: true // Use capture to fix this listener not called if the element clicked is too deep in the DOM.
    });



    /**
     * Concatenate two paths, adding a slash between them if needed.
     *
     * @param leftPath Left path.
     * @param rightPath Right path.
     * @returns Concatenated path.
     */
    function concatenatePaths(leftPath, rightPath) {
        if (!leftPath) {
            return rightPath;
        } else if (!rightPath) {
            return leftPath;
        }

        const lastCharLeft = leftPath.slice(-1);
        const firstCharRight = rightPath.charAt(0);

        if (lastCharLeft === '/' && firstCharRight === '/') {
            return leftPath + rightPath.substr(1);
        } else if (lastCharLeft !== '/' && firstCharRight !== '/') {
            return leftPath + '/' + rightPath;
        } else {
            return leftPath + rightPath;
        }
    }

    /**
     * Get the root window.
     *
     * @param win Current window to check.
     * @returns Root window.
     */
    function getRootWindow(win) {
        if (win.parent === win) {
            return win;
        }

        return getRootWindow(win.parent);
    }

    /**
     * Get the scheme from a URL.
     *
     * @param url URL to treat.
     * @returns Scheme, undefined if no scheme found.
     */
    function getUrlScheme(url) {
        if (!url) {
            return;
        }

        const matches = url.match(/^([a-z][a-z0-9+\-.]*):/);
        if (matches && matches[1]) {
            return matches[1];
        }
    }

    /**
     * Check if a URL is absolute.
     *
     * @param url URL to treat.
     * @returns Whether it's absolute.
     */
    function isAbsoluteUrl(url) {
        return /^[^:]{2,}:\/\//i.test(url);
    }

    /**
     * Check whether a URL scheme belongs to a local file.
     *
     * @param scheme Scheme to check.
     * @returns Whether the scheme belongs to a local file.
     */
    function isLocalFileUrlScheme(scheme) {
        if (scheme) {
            scheme = scheme.toLowerCase();
        }

        return scheme == 'cdvfile' ||
                scheme == 'file' ||
                scheme == 'filesystem' ||
                scheme == 'moodleappfs';
    }

    /**
     * Handle a click on an anchor element.
     *
     * @param link Anchor element clicked.
     * @param event Click event.
     */
    function linkClicked(link, event) {
        if (event.defaultPrevented) {
            // Event already prevented by some other code.
            return;
        }

        const linkScheme = getUrlScheme(link.href);
        const pageScheme = getUrlScheme(location.href);
        const isTargetSelf = !link.target || link.target == '_self';

        if (!link.href || linkScheme == 'javascript') {
            // Links with no URL and Javascript links are ignored.
            return;
        }

        event.preventDefault();

        if (isTargetSelf && (isLocalFileUrlScheme(linkScheme) || !isLocalFileUrlScheme(pageScheme))) {
            // Link should be loaded in the same frame. Don't do it if link is online and frame is local.
            location.href = toAbsolute(link.href);

            return;
        }

        getRootWindow(window).postMessage({
            environment: 'moodleapp',
            context: 'iframe',
            action: 'link_clicked',
            frameUrl: location.href,
            link: {
                href: link.href,
                target: link.target,
                originalHref: link.getAttribute('href'),
            },
        }, '*');
    }

    /**
     * Convert a URL to an absolute URL if needed using the frame src.
     *
     * @param url URL to convert.
     * @returns Absolute URL.
     */
    function toAbsolute(url) {
        if (isAbsoluteUrl(url)) {
            return url;
        }

        // It's a relative URL, use the frame src to create the full URL.
        const pathToDir = location.href.substring(0, location.href.lastIndexOf('/'));

        return concatenatePaths(pathToDir, url);
    }
})();
