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
    Output,
    ElementRef,
    EventEmitter,
    OnDestroy,
    inject,
    viewChild,
    computed,
    effect,
    signal,
    input,
    untracked,
} from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

import { CoreUrl } from '@static/url';
import { CoreIframe } from '@static/iframe';
import { Router, StatusBar, Translate } from '@singletons';
import { CoreScreen, CoreScreenOrientation } from '@services/screen';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NavigationStart } from '@angular/router';
import { CoreSites } from '@services/sites';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreDom } from '@static/dom';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreLang, CoreLangFormat } from '@services/lang';
import { CoreBaseModule } from '@/core/base.module';
import { CoreLoadingComponent } from '@components/loading/loading';
import { CoreNavBarButtonsComponent } from '@components/navbar-buttons/navbar-buttons';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreUpdateNonReactiveAttributesDirective } from '@directives/update-non-reactive-attributes';
import { BackButtonEvent } from '@ionic/angular';
import { BackButtonPriority } from '@/core/constants';

/**
 * Component to render an iframe, handling auto-login if needed, fixing iOS cookies, check if content should be opened
 * with an external app, etc.
 * It's recommended to always use this component instead of a normal iframe.
 *
 * The "allow" attribute set to this component will be transferred to the iframe element. But it must be static, changing the
 * attribute once the iframe has been created won't have any effect for security reasons.
 */
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
export class CoreIframeComponent implements OnDestroy {

    static loadingTimeout = 15000;

    readonly iframeHostRef = viewChild<ElementRef<HTMLDivElement>>('iframeHost');
    protected readonly iframeElement = signal<HTMLIFrameElement | undefined>(undefined);

    readonly src = input.required<string>();
    readonly id = input<string | null>(null);
    readonly iframeWidth = input('100%');
    readonly iframeHeight = input('100%');
    /**
     * Changing this input after the iframe has been created will cause the iframe to be recreated
     * and navigation will be lost. This is because browsers only read the "allowfullscreen" attribute once,
     * when the iframe is created.
     */
    readonly allowFullscreen = input(false, { transform: toBoolean });
    readonly showFullscreenOnToolbar = input(false, { transform: toBoolean });
    readonly autoFullscreenOnRotate = input(false, { transform: toBoolean });
    readonly allowAutoLogin = input(true, { transform: toBoolean });
    readonly addSiteReferer = input(false, { transform: toBoolean });
    @Output() loaded = new EventEmitter<HTMLIFrameElement>();

    readonly safeUrl = signal<SafeResourceUrl | undefined>(undefined);
    // Attributes normalised from their raw inputs, applied reactively to the iframe created in createIframeElement().
    readonly formattedWidth = computed(() => (this.iframeWidth() && CoreDom.formatSizeUnits(this.iframeWidth())) || '100%');
    readonly formattedHeight = computed(() => (this.iframeHeight() && CoreDom.formatSizeUnits(this.iframeHeight())) || '100%');

    readonly loading = signal(true);
    readonly displayHelp = signal(false);
    readonly fullscreen = signal(false);
    readonly launchExternalLabel = signal<string | undefined>(undefined); // Text to set to the button to launch external app.

    protected fullScreenInitialized = false;
    protected style?: HTMLStyleElement;
    protected navSubscription?: Subscription;
    protected messageListenerFunction: (event: MessageEvent) => Promise<void>;
    protected backButtonListener?: EventListener;
    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected srcUpdateId = 0;
    protected loadingTimeout?: ReturnType<typeof setTimeout>;

    constructor() {
        // Listen for messages from the iframe.
        window.addEventListener('message', this.messageListenerFunction = (event) => this.onIframeMessage(event));

        // Create the iframe element when the host is available and the iframe hasn't been created yet.
        effect(() => {
            const host = this.iframeHostRef();
            const iframe = this.iframeElement();
            if (!host || iframe) {
                return;
            }

            untracked(() => {
                this.createIframeElement(host);
            });
        });

        // Synchronize the iframe element with the inputs and signals.
        effect(() => {
            const iframe = this.iframeElement();
            if (!iframe) {
                return;
            }

            // The "allow" attribute is excluded on purpose: browsers only read it once, when the iframe is created.
            iframe.style.width = this.formattedWidth();
            iframe.style.height = this.formattedHeight();

            const id = this.id();
            if (id) {
                iframe.id = id;
            } else {
                iframe.removeAttribute('id');
            }

            const url = this.safeUrl();
            const src = url?.toString() ?? '';
            if (src !== iframe.src) {

                iframe.src = src;
                untracked(() => {
                    const originalSrc = this.src();
                    this.setLoading(!originalSrc || !CoreUrl.isLocalFileUrl(originalSrc));
                });
            }
        });

        // React to changes on the src input, resolving the final URL to load in the iframe.
        effect(() => {
            const src = this.src();
            untracked(() => {
                this.updateSrc(src);
            });
        });

        // The "allowfullscreen" attribute is excluded on purpose: browsers only read it once, when the iframe is created.
        effect(() => {
            const iframe = this.iframeElement();
            const host = this.iframeHostRef();
            if (!iframe || !host) {
                return;
            }

            const allowFullscreen = this.allowFullscreen();
            const previousAllowFullscreen = iframe.hasAttribute('allowfullscreen');
            // If they are the same, do nothing.
            if (allowFullscreen === previousAllowFullscreen) {
                return;
            }

            // If the attribute changed, we need to remove the iframe and create a new one with the new attribute.
            // This is because browsers only read the "allowfullscreen" attribute once, when the iframe is created.
            // Note: Recreating the iframe will also reset its src tot he original one.
            host.nativeElement.removeChild(iframe);
            this.iframeElement.set(undefined);
        });

        // React to changes on the screen orientation, if autoFullscreenOnRotate is enabled.
        effect(() => {
            const orientation = CoreScreen.orientationSignal();
            if (!this.autoFullscreenOnRotate() || this.isInHiddenPage()) {
                return;
            }
            untracked(() => {
                this.toggleFullscreen(orientation === CoreScreenOrientation.LANDSCAPE);
            });
        });

        // React to changes on the fullscreen inputs, if showFullscreenOnToolbar or autoFullscreenOnRotate is enabled.
        effect(() => {
            // Track the signals so this reruns whenever either of them changes.
            this.showFullscreenOnToolbar();
            this.autoFullscreenOnRotate();

            untracked(() => {
                this.configureFullScreen();
            });
        });
    }

    /**
     * Set loading and start or reset the loading timeout for the current iframe URL.
     *
     * @param loading Whether the iframe is loading. If not set, it will use the current value of the loading signal.
     */
    protected setLoading(loading: boolean): void {
        this.loading.set(loading);

        this.clearLoadingTimeout();

        if (loading) {
            this.loadingTimeout = setTimeout(() => {
                this.loading.set(false);
                this.loadingTimeout = undefined;
            }, CoreIframeComponent.loadingTimeout);
        }
    }

    /**
     * Clear the loading timeout if it exists.
     */
    protected clearLoadingTimeout(): void {
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = undefined;
        }
    }

    /**
     * Configure fullscreen based on the inputs.
     */
    protected configureFullScreen(): void {
        const autoFullscreenOnRotate = this.autoFullscreenOnRotate();
        if (!this.showFullscreenOnToolbar() && !autoFullscreenOnRotate) {
            this.disableFullScreen();
            this.fullScreenInitialized = true;

            return;
        }

        if (!this.navSubscription) {
            // Leave fullscreen when navigating.
            this.navSubscription = Router.events
                .pipe(filter(event => event instanceof NavigationStart))
                .subscribe(async () => {
                    if (this.fullscreen()) {
                        this.toggleFullscreen(false);
                    }
                });
        }

        if (!this.backButtonListener) {
            // Exit fullscreen when back button is clicked.
            document.addEventListener('ionBackButton', this.backButtonListener = (event: Event) => {
                const backButtonEvent = event as BackButtonEvent;

                backButtonEvent.detail.register(
                    BackButtonPriority.IFRAME_FULLSCREEN,
                    (processNextHandler) => {
                        if (this.fullscreen()) {
                            this.toggleFullscreen(false);
                        } else {
                            processNextHandler();
                        }
                    },
                );
            });
        }

        if (!this.style) {
            const shadow = this.element.closest('.ion-page')?.querySelector('ion-header ion-toolbar')?.shadowRoot;
            if (shadow) {
                this.style = document.createElement('style');
                shadow.appendChild(this.style);
            }
        }

        if (!this.fullScreenInitialized && autoFullscreenOnRotate) {
            // Only change full screen value if it's being initialized.
            this.toggleFullscreen(CoreScreen.isLandscape);
        }

        this.fullScreenInitialized = true;
    }

    /**
     * Initialize things related to the iframe element.
     *
     * @param host Host element to add the iframe.
     */
    protected createIframeElement(host: ElementRef<HTMLDivElement>): void {
        const iframe = document.createElement('iframe');
        iframe.className = 'core-iframe';

        const allow = this.element.getAttribute('allow')?.trim();
        if (allow) {
            iframe.setAttribute('allow', allow);
        }

        iframe.toggleAttribute('allowfullscreen', this.allowFullscreen());

        CoreIframe.treatFrame(iframe, false);

        host.nativeElement.appendChild(iframe);

        iframe.addEventListener('load', () => {
            this.setLoading(false);
            this.loaded.emit(iframe); // Notify iframe was loaded.
        });

        iframe.addEventListener('error', () => {
            this.setLoading(false);
            CoreAlerts.showError(Translate.instant('core.errorloadingcontent'));
        });

        this.iframeElement.set(iframe);
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
     * React to changes on the src input, resolving the final URL to load in the iframe.
     *
     * @param src Src input value.
     */
    protected async updateSrc(src?: string): Promise<void> {
        // Discard outdated resolutions if src changes again before this one finishes.
        const updateId = ++this.srcUpdateId;
        let url = src;

        this.safeUrl.set(undefined);
        this.displayHelp.set(false);
        this.clearLoadingTimeout();

        if (url) {
            const { launchExternal, label } = CoreIframe.frameShouldLaunchExternal(url);

            if (launchExternal) {
                this.launchExternalLabel.set(label);
                this.setLoading(false);

                return;
            }
        }

        this.launchExternalLabel.set(undefined);

        if (url && !CoreUrl.isLocalFileUrl(url)) {
            url = CoreUrl.getYoutubeEmbedUrl(url) || url;
            this.displayHelp.set(CoreIframe.shouldDisplayHelpForUrl(url));

            const currentSite = CoreSites.getCurrentSite();
            if (currentSite?.containsUrl(url)) {
                // Format the URL to add auto-login if needed and add the lang parameter.
                const autoLoginUrl = this.allowAutoLogin() ?
                    await currentSite.getAutoLoginUrl(url, false) :
                    url;

                const lang = await CoreLang.getCurrentLanguage(CoreLangFormat.LMS);
                url = CoreUrl.addParamsToUrl(autoLoginUrl, { lang }, {
                    checkAutoLoginUrl: autoLoginUrl !== url,
                });
            } else if (this.addSiteReferer() || CoreUrl.urlNeedsReferer(url)) {
                url = currentSite?.fixRefererForUrl(url) || url;
            }

            if (currentSite?.isVersionGreaterEqualThan('3.7') && CoreUrl.isVimeoVideoUrl(url)) {
                // Only treat the Vimeo URL if site is 3.7 or bigger. In older sites the width and height params were mandatory,
                // and there was no easy way to make the iframe responsive.
                url = CoreUrl.getVimeoPlayerUrl(url, currentSite) ?? url;
            }

            await CoreIframe.fixIframeCookies(url);
        }

        if (updateId !== this.srcUpdateId) {
            return;
        }

        this.safeUrl.set(url);
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
        window.removeEventListener('message', this.messageListenerFunction);
        this.clearLoadingTimeout();
        this.disableFullScreen();
    }

    /**
     * Disable fullscreen mode and remove any listeners or styles related to it.
     */
    protected disableFullScreen(): void {
        // Full screen disabled, stop watchers if enabled.
        if (this.fullscreen()) {
            this.toggleFullscreen(false);
        }

        this.navSubscription?.unsubscribe();
        this.style?.remove();
        this.backButtonListener && document.removeEventListener('ionBackButton', this.backButtonListener);
        this.navSubscription = undefined;
        this.style = undefined;
        this.backButtonListener = undefined;
    }

    /**
     * Toggle fullscreen mode.
     *
     * @param enable Whether to enable or disable fullscreen mode. If not set, it will toggle the current state.
     * @param notifyIframe Whether to notify the iframe about the change. Defaults to true.
     */
    toggleFullscreen(enable?: boolean, notifyIframe = true): void {
        if (enable !== undefined) {
            this.fullscreen.set(enable);
        } else {
            this.fullscreen.set(!this.fullscreen());
        }

        if (this.fullscreen()) {
            StatusBar.hide();
        } else {
            StatusBar.show();
        }

        if (this.style) {
            // Done this way because of the shadow DOM.
            this.style.textContent = this.fullscreen()
                ? '@media screen and (orientation: landscape) {\
                    .toolbar-container { flex-direction: column-reverse !important; height: 100%; } }'
                : '';
        }

        document.body.classList.toggle('core-iframe-fullscreen', this.fullscreen());

        const iframe = this.iframeElement();
        if (notifyIframe && iframe) {
            iframe.contentWindow?.postMessage(
                this.fullscreen() ? 'enterFullScreen' : 'exitFullScreen',
                '*',
            );
        }
    }

    /**
     * Treat an iframe message event.
     *
     * @param event Event.
     */
    protected async onIframeMessage(event: MessageEvent): Promise<void> {
        if (event.data === 'enterFullScreen' && this.showFullscreenOnToolbar() && !this.fullscreen()) {
            this.toggleFullscreen(true, false);
        } else if (event.data === 'exitFullScreen' && this.fullscreen()) {
            this.toggleFullscreen(false, false);
        }
    }

    /**
     * Launch content in an external app.
     */
    launchExternal(): void {
        const src = this.src();
        if (!src) {
            return;
        }

        CoreIframe.frameLaunchExternal(src, {
            site: CoreSites.getCurrentSite(),
        });
    }

}
