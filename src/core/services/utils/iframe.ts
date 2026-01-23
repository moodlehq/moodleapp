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

import { Injectable } from '@angular/core';
import { WKUserScriptWindow } from 'cordova-plugin-wkuserscript';

import { makeSingleton } from '@singletons';
import { FrameElement } from '@classes/element-controllers/FrameElementController';
import { CoreSite } from '@classes/sites/site';
import { CoreIframe } from '@singletons/iframe';

/**
 * "Utils" service with helper functions for iframes, embed and similar.
 *
 * @deprecated since 5.0. Use CoreIframe instead.
 */
@Injectable({ providedIn: 'root' })
export class CoreIframeUtilsProvider {

    /**
     * List of tags that can contain an iframe.
     *
     * @deprecated since 5.0. Use CoreIframe.FRAME_TAGS instead.
     */
    static readonly FRAME_TAGS = CoreIframe.FRAME_TAGS;

    /**
     * Check if a frame uses an online URL but the app is offline. If it does, the iframe is hidden and a warning is shown.
     *
     * @param element The frame to check (iframe, embed, ...).
     * @param isSubframe Whether it's a frame inside another frame.
     * @returns True if frame is online and the app is offline, false otherwise.
     * @deprecated since 5.0. Use CoreIframe.checkOnlineFrameInOffline instead.
     */
    checkOnlineFrameInOffline(element: CoreFrameElement, isSubframe?: boolean): boolean {
        return CoreIframe.checkOnlineFrameInOffline(element, isSubframe);
    }

    /**
     * Get auto-login URL for an iframe.
     *
     * @param iframe Iframe element.
     * @param url Original URL.
     * @returns Promise resolved with the URL.
     * @deprecated since 5.0. Use CoreIframe.getAutoLoginUrlForIframe instead.
     */
    async getAutoLoginUrlForIframe(iframe: HTMLIFrameElement, url: string): Promise<string> {
        return CoreIframe.getAutoLoginUrlForIframe(iframe, url);
    }

    /**
     * Given an element, return the content window and document.
     * Please notice that the element should be an iframe, embed or similar.
     *
     * @param element Element to treat (iframe, embed, ...).
     * @returns Window and Document.
     * @deprecated since 5.0. Use CoreIframe.getContentWindowAndDocument instead.
     */
    getContentWindowAndDocument(element: CoreFrameElement): { window: Window | null; document: Document | null } {
        return CoreIframe.getContentWindowAndDocument(element);
    }

    /**
     * Handle some iframe messages.
     *
     * @param event Message event.
     * @deprecated since 5.0. Use CoreIframe.handleIframeMessage instead.
     */
    handleIframeMessage(event: MessageEvent): void {
        CoreIframe.handleIframeMessage(event);
    }

    /**
     * Redefine the open method in the contentWindow of an element and the sub frames.
     * Please notice that the element should be an iframe, embed or similar.
     *
     * @param element Element to treat (iframe, embed, ...).
     * @param contentWindow The window of the element contents.
     * @param contentDocument The document of the element contents.
     * @deprecated since 5.0. Use CoreIframe.redefineWindowOpen instead.
     */
    redefineWindowOpen(
        element: CoreFrameElement,
        contentWindow: Window,
        contentDocument: Document,
    ): void {
        CoreIframe.redefineWindowOpen(element, contentWindow, contentDocument);
    }

    /**
     * Intercept window.open in a frame and its subframes, shows an error modal instead.
     * Search links (<a>) and open them in browser or InAppBrowser if needed.
     *
     * @param element Element to treat (iframe, embed, ...).
     * @param isSubframe Whether it's a frame inside another frame.
     * @deprecated since 5.0. Use CoreIframe.treatFrame instead.
     */
    treatFrame(element: CoreFrameElement, isSubframe?: boolean): void {
        CoreIframe.treatFrame(element, isSubframe);
    }

    /**
     * Search links (<a>) in a frame and open them in browser or InAppBrowser if needed.
     * Only links that haven't been treated by the frame's Javascript will be treated.
     *
     * @param element Element to treat (iframe, embed, ...). Unused parameter.
     * @param contentDocument The document of the element contents.
     * @deprecated since 5.0. Use CoreIframe.treatFrameLinks instead.
     */
    treatFrameLinks(element: CoreFrameElement, contentDocument: Document): void {
        CoreIframe.treatFrameLinks(contentDocument);
    }

    /**
     * Inject code to the iframes because we cannot access the online ones.
     *
     * @param userScriptWindow Window.
     * @deprecated since 5.0. Use CoreIframe.injectiOSScripts instead.
     */
    injectiOSScripts(userScriptWindow: WKUserScriptWindow): void {
        CoreIframe.injectiOSScripts(userScriptWindow);
    }

    /**
     * Fix cookies for an iframe URL.
     *
     * @param url URL of the iframe.
     * @deprecated since 5.0. Use CoreIframe.fixIframeCookies instead.
     */
    async fixIframeCookies(url: string): Promise<void> {
        await CoreIframe.fixIframeCookies(url);
    }

    /**
     * Check whether the help should be displayed in current OS.
     *
     * @returns Boolean.
     * @deprecated since 5.0. Use CoreIframe.shouldDisplayHelp instead.
     */
    shouldDisplayHelp(): boolean {
        return CoreIframe.shouldDisplayHelp();
    }

    /**
     * Check whether the help should be displayed for a certain iframe.
     *
     * @param url Iframe URL.
     * @returns Boolean.
     * @deprecated since 5.0. Use CoreIframe.shouldDisplayHelpForUrl instead.
     */
    shouldDisplayHelpForUrl(url: string): boolean {
        return CoreIframe.shouldDisplayHelpForUrl(url);
    }

    /**
     * Open help modal for iframes.
     *
     * @deprecated since 5.0. Use CoreIframe.openIframeHelpModal instead.
     */
    openIframeHelpModal(): void {
        CoreIframe.openIframeHelpModal();
    }

    /**
     * Check if a frame content should be opened with an external app (PDF reader, browser, etc.).
     *
     * @param urlOrFrame Either a URL of a frame, or the frame to check.
     * @returns Whether it should be opened with an external app, and the label for the action to launch in external.
     * @deprecated since 5.0. Use CoreIframe.frameShouldLaunchExternal instead.
     */
    frameShouldLaunchExternal(urlOrFrame: string | FrameElement): { launchExternal: boolean; label: string } {
        return CoreIframe.frameShouldLaunchExternal(urlOrFrame);
    }

    /**
     * Launch a frame content in an external app.
     *
     * @param url Frame URL.
     * @param options Options.
     * @deprecated since 5.0. Use CoreIframe.frameLaunchExternal instead.
     */
    async frameLaunchExternal(url: string, options: LaunchExternalOptions = {}): Promise<void> {
        return CoreIframe.frameLaunchExternal(url, options);
    }

}
/**
 * @deprecated since 5.0. Use CoreIframe instead.
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated
export const CoreIframeUtils = makeSingleton(CoreIframeUtilsProvider);

/**
 * Options to pass to frameLaunchExternal.
 */
type LaunchExternalOptions = {
    site?: CoreSite; // Site the frame belongs to.
    component?: string; // Component to download the file if needed.
    componentId?: string | number; // Component ID to use in conjunction with the component.
};

type CoreFrameElement = FrameElement & {
    window?: Window;
    getWindow?(): Window;
};
