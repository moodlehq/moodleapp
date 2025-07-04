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

import {
    Component,
    Input,
    Output,
    ViewChild,
    ElementRef,
    EventEmitter,
    OnChanges,
    SimpleChange,
    OnDestroy,
    inject,
} from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

import { CoreFile } from '@services/file';
import { CoreUrl } from '@singletons/url';
import { CoreIframe } from '@singletons/iframe';
import { DomSanitizer, Router, StatusBar, Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreScreen, CoreScreenOrientation } from '@services/screen';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NavigationStart } from '@angular/router';
import { CoreSites } from '@services/sites';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreDom } from '@singletons/dom';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreLang, CoreLangFormat } from '@services/lang';
import { CoreBaseModule } from '@/core/base.module';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreNavBarButtonsComponent } from '@components/navbar-buttons/navbar-buttons';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreUpdateNonReactiveAttributesDirective } from '@directives/update-non-reactive-attributes';
import { BackButtonEvent } from '@ionic/angular';
import { BackButtonPriority } from '@/core/constants';

@Component({
    selector: 'core-iframe',
    templateUrl: 'core-iframe.html',
    styleUrl: 'iframe.scss',
    imports: [
        CoreBaseModule,
        CoreLoadingComponent,
        CoreNavBarButtonsComponent,
        CoreUpdateNonReactiveAttributesDirective,
        CoreFaIconDirective,
    ],
})
export class CoreIframeComponent implements OnChanges, OnDestroy {

    protected element: HTMLElement = inject(ElementRef).nativeElement;

    static loadingTimeout = 15000;

    @ViewChild('iframe') set iframeElement(iframeRef: ElementRef | undefined) {
        this.iframe = iframeRef?.nativeElement;

        this.initIframeElement();
    }

    @Input() src?: string;
    @Input() id: string | null = null;
    @Input() iframeWidth = '100%';
    @Input() iframeHeight = '100%';
    @Input({ transform: toBoolean }) allowFullscreen = false;
    @Input({ transform: toBoolean }) showFullscreenOnToolbar = false;
    @Input({ transform: toBoolean }) autoFullscreenOnRotate = false;
    @Input({ transform: toBoolean }) allowAutoLogin = true;
    @Output() loaded: EventEmitter<HTMLIFrameElement> = new EventEmitter<HTMLIFrameElement>();

    loading?: boolean;
    safeUrl?: SafeResourceUrl;
    displayHelp = false;
    fullscreen = false;
    launchExternalLabel?: string; // Text to set to the button to launch external app.

    initialized = false;

    protected fullScreenInitialized = false;
    protected iframe?: HTMLIFrameElement;
    protected style?: HTMLStyleElement;
    protected orientationObs?: CoreEventObserver;
    protected navSubscription?: Subscription;
    protected messageListenerFunction: (event: MessageEvent) => Promise<void>;
    protected backButtonListener?: (event: BackButtonEvent) => void;

    constructor() {
        this.loaded = new EventEmitter<HTMLIFrameElement>();

        // Listen for messages from the iframe.
        window.addEventListener('message', this.messageListenerFunction = (event) => this.onIframeMessage(event));
    }

    /**
     * Init the data.
     */
    protected init(): void {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        // Show loading only with external URLs.
        this.loading = !this.src || !CoreUrl.isLocalFileUrl(this.src);

        if (this.loading) {
            setTimeout(() => {
                this.loading = false;
            }, CoreIframeComponent.loadingTimeout);
        }
    }

    /**
     * Configure fullscreen based on the inputs.
     */
    protected configureFullScreen(): void {
        if (!this.showFullscreenOnToolbar && !this.autoFullscreenOnRotate) {
            // Full screen disabled, stop watchers if enabled.
            this.navSubscription?.unsubscribe();
            this.orientationObs?.off();
            this.style?.remove();
            this.backButtonListener && document.removeEventListener('ionBackButton', this.backButtonListener);
            this.navSubscription = undefined;
            this.orientationObs = undefined;
            this.style = undefined;
            this.backButtonListener = undefined;
            this.fullScreenInitialized = true;

            return;
        }

        if (!this.navSubscription) {
            // Leave fullscreen when navigating.
            this.navSubscription = Router.events
                .pipe(filter(event => event instanceof NavigationStart))
                .subscribe(async () => {
                    if (this.fullscreen) {
                        this.toggleFullscreen(false);
                    }
                });
        }

        if (!this.backButtonListener) {
            // Exit fullscreen when back button is clicked.
            document.addEventListener('ionBackButton', this.backButtonListener = ({ detail }) => detail.register(
                BackButtonPriority.IFRAME_FULLSCREEN,
                (processNextHandler) => {
                    if (this.fullscreen) {
                        this.toggleFullscreen(false);
                    } else {
                        processNextHandler();
                    }
                },
            ));
        }

        if (!this.style) {
            const shadow = this.element.closest('.ion-page')?.querySelector('ion-header ion-toolbar')?.shadowRoot;
            if (shadow) {
                this.style = document.createElement('style');
                shadow.appendChild(this.style);
            }
        }

        if (!this.autoFullscreenOnRotate) {
            this.orientationObs?.off();
            this.orientationObs = undefined;
            this.fullScreenInitialized = true;

            return;
        }

        if (this.orientationObs) {
            this.fullScreenInitialized = true;

            return;
        }

        if (!this.fullScreenInitialized) {
            // Only change full screen value if it's being initialized.
            this.toggleFullscreen(CoreScreen.isLandscape);
        }

        this.orientationObs = CoreEvents.on(CoreEvents.ORIENTATION_CHANGE, (data) => {
            if (this.isInHiddenPage()) {
                return;
            }

            this.toggleFullscreen(data.orientation == CoreScreenOrientation.LANDSCAPE);
        });

        this.fullScreenInitialized = true;
    }

    /**
     * Initialize things related to the iframe element.
     */
    protected initIframeElement(): void {
        if (!this.iframe) {
            return;
        }

        CoreIframe.treatFrame(this.iframe, false);

        this.iframe.addEventListener('load', () => {
            this.loading = false;
            this.loaded.emit(this.iframe); // Notify iframe was loaded.
        });

        this.iframe.addEventListener('error', () => {
            this.loading = false;
            CoreAlerts.showError(Translate.instant('core.errorloadingcontent'));
        });
    }

    /**
     * Check if the element is in a hidden page.
     *
     * @returns Whether the element is in a hidden page.
     */
    protected isInHiddenPage(): boolean {
        // If we can't find the parent ion-page, consider it to be hidden too.
        return !this.element.closest('.ion-page') || !!this.element.closest('.ion-page-hidden');
    }

    /**
     * Detect changes on input properties.
     */
    async ngOnChanges(changes: {[name: string]: SimpleChange }): Promise<void> {
        if (changes.iframeWidth) {
            this.iframeWidth = (this.iframeWidth && CoreDom.formatSizeUnits(this.iframeWidth)) || '100%';
        }
        if (changes.iframeHeight) {
            this.iframeHeight = (this.iframeHeight && CoreDom.formatSizeUnits(this.iframeHeight)) || '100%';
        }

        if (!changes.src) {
            if (changes.showFullscreenOnToolbar || changes.autoFullscreenOnRotate) {
                this.configureFullScreen();
            }

            return;
        }

        let url = this.src;

        if (url) {
            const { launchExternal, label } = CoreIframe.frameShouldLaunchExternal(url);

            if (launchExternal) {
                this.launchExternalLabel = label;
                this.loading = false;

                return;
            }
        }

        this.launchExternalLabel = undefined;

        if (url && !CoreUrl.isLocalFileUrl(url)) {
            url = CoreUrl.getYoutubeEmbedUrl(url) || url;
            this.displayHelp = CoreIframe.shouldDisplayHelpForUrl(url);

            const currentSite = CoreSites.getCurrentSite();
            if (currentSite?.containsUrl(url)) {
                // Format the URL to add auto-login if needed and add the lang parameter.
                const autoLoginUrl = this.allowAutoLogin ?
                    await currentSite.getAutoLoginUrl(url, false) :
                    url;

                const lang = await CoreLang.getCurrentLanguage(CoreLangFormat.LMS);
                url = CoreUrl.addParamsToUrl(autoLoginUrl, { lang }, {
                    checkAutoLoginUrl: autoLoginUrl !== url,
                });
            }

            if (currentSite?.isVersionGreaterEqualThan('3.7') && CoreUrl.isVimeoVideoUrl(url)) {
                // Only treat the Vimeo URL if site is 3.7 or bigger. In older sites the width and height params were mandatory,
                // and there was no easy way to make the iframe responsive.
                url = CoreUrl.getVimeoPlayerUrl(url, currentSite) ?? url;
            }

            await CoreIframe.fixIframeCookies(url);
        }

        this.safeUrl = url ? DomSanitizer.bypassSecurityTrustResourceUrl(CoreFile.convertFileSrc(url)) : undefined;

        // Now that the URL has been set, initialize the iframe. Wait for the iframe to the added to the DOM.
        setTimeout(() => {
            this.init();
            if (changes.showFullscreenOnToolbar || changes.autoFullscreenOnRotate) {
                this.configureFullScreen();
            }
        });
    }

    /**
     * Open help modal for iframes.
     */
    openIframeHelpModal(): void {
        CoreIframe.openIframeHelpModal();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.orientationObs?.off();
        this.navSubscription?.unsubscribe();
        window.removeEventListener('message', this.messageListenerFunction);

        if (this.fullscreen) {
            // Make sure to leave fullscreen mode when the iframe is destroyed. This can happen if there's a race condition
            // between clicking back button and some code toggling the fullscreen on.
            this.toggleFullscreen(false);
        }
    }

    /**
     * Toggle fullscreen mode.
     */
    toggleFullscreen(enable?: boolean, notifyIframe = true): void {
        if (enable !== undefined) {
            this.fullscreen = enable;
        } else {
            this.fullscreen = !this.fullscreen;
        }

        this.fullscreen ? StatusBar.hide() : StatusBar.show();

        if (this.style) {
            // Done this way because of the shadow DOM.
            this.style.textContent = this.fullscreen
                ? '@media screen and (orientation: landscape) {\
                    .core-iframe-fullscreen .toolbar-container { flex-direction: column-reverse !important; height: 100%; } }'
                : '';
        }

        document.body.classList.toggle('core-iframe-fullscreen', this.fullscreen);

        if (notifyIframe && this.iframe) {
            this.iframe.contentWindow?.postMessage(
                this.fullscreen ? 'enterFullScreen' : 'exitFullScreen',
                '*',
            );
        }
    }

    /**
     * Treat an iframe message event.
     *
     * @param event Event.
     * @returns Promise resolved when done.
     */
    protected async onIframeMessage(event: MessageEvent): Promise<void> {
        if (event.data == 'enterFullScreen' && this.showFullscreenOnToolbar && !this.fullscreen) {
            this.toggleFullscreen(true, false);
        } else if (event.data == 'exitFullScreen' && this.fullscreen) {
            this.toggleFullscreen(false, false);
        }
    }

    /**
     * Launch content in an external app.
     */
    launchExternal(): void {
        if (!this.src) {
            return;
        }

        CoreIframe.frameLaunchExternal(this.src, {
            site: CoreSites.getCurrentSite(),
        });
    }

}
