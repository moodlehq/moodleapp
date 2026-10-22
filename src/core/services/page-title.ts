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

import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { CoreConstants } from '@/core/constants';
import { CoreUrl, CoreUrlPartNames } from '@static/url';
import { Router, makeSingleton } from '@singletons';
import { CoreSites } from './sites';

/**
 * Service to keep `document.title` in sync with the currently visible page for accessibility (WCAG 2.4.2).
 *
 * Pages publish their title once it is known (typically after data has been fetched) together with the
 * page's `ActivatedRoute`. The service caches titles by URL and re-applies the cached value whenever
 * navigation lands on a matching URL, so cached Ionic pages (which do not re-run `ngOnInit`) do not need
 * to re-publish their title on re-entry.
 */
@Injectable({ providedIn: 'root' })
export class CorePageTitleService {

    protected title = inject(Title);
    protected titlesByUrl = new Map<string, string>();
    protected initialized = false;

    /**
     * Start listening to router events to keep `document.title` in sync.
     * Safe to call multiple times.
     */
    initialize(): void {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        this.apply(this.findBestMatch(this.getCurrentPath()));

        Router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe(() => this.apply(this.findBestMatch(this.getCurrentPath())));
    }

    /**
     * Publish the title for a page route and apply it if the route is (part of) the current route.
     *
     * @param route The page's activated route.
     * @param title Human-readable page title (e.g. discussion subject, forum name).
     */
    setTitle(route: ActivatedRoute, title: string): void {
        const cleanUrl = this.urlFromRoute(route);
        const cleanTitle = title.trim();

        if (!cleanTitle) {
            this.titlesByUrl.delete(cleanUrl);
        } else {
            this.titlesByUrl.set(cleanUrl, cleanTitle);
        }

        // Apply immediately if this page is (part of) the currently active route tree.
        const currentPath = this.getCurrentPath();
        if (cleanUrl === currentPath || currentPath.startsWith(`${cleanUrl}/`)) {
            this.apply(this.findBestMatch(currentPath));
        }
    }

    /**
     * Clear the cached title for a page route.
     *
     * @param route The page's activated route.
     */
    clearTitle(route: ActivatedRoute): void {
        const cleanUrl = this.urlFromRoute(route);
        this.titlesByUrl.delete(cleanUrl);
    }

    /**
     * Get the page title for a route, without additional title parts.
     *
     * @param route The page's activated route.
     * @returns Best-matching title, or an empty string if none was found.
     */
    getTitle(route: ActivatedRoute): string {
        return this.findBestMatch(this.urlFromRoute(route));
    }

    /**
     * Get the full composed title for a route.
     *
     * @param route The page's activated route.
     * @returns Full title, including the site or app name.
     */
    getFullTitle(route: ActivatedRoute): string {
        return this.composeFullTitle(this.getTitle(route));
    }

    /**
     * Compute the URL identifying a page from its `ActivatedRoute`.
     * The resulting URL contains the resolved path from the root up to (and including) this route,
     * excluding any child routes activated on top of it.
     *
     * @param route The page's activated route (typically `inject(ActivatedRoute)`).
     * @returns Normalized URL for use as a title cache key.
     */
    protected urlFromRoute(route: ActivatedRoute): string {
        const segments = route.snapshot?.pathFromRoot
            .flatMap(r => r.url.map(segment => segment.path))
            .filter(segment => segment.length > 0) ?? [];

        return this.normalizeUrl(`/${segments.join('/')}`);
    }

    /**
     * Set `document.title` from a resolved page title.
     *
     * @param title Page title without additional title parts.
     */
    protected apply(title: string): void {
        this.title.setTitle(this.composeFullTitle(title));
    }

    /**
     * Compose the full title from the page title and additional title parts.
     *
     * @param title Page title without additional title parts.
     * @returns Full title, including the site or app name.
     */
    protected composeFullTitle(title: string): string {
        const siteName = CoreSites.getCurrentSite()?.getInfo()?.sitename ?? CoreConstants.CONFIG.appname;

        return title ? `${title} | ${siteName}` : siteName;
    }

    /**
     * Find the cached title for the deepest ancestor of (or exact match to) the given path.
     *
     * Walks the path upwards one segment at a time and returns the first cached hit, so the returned
     * title is by construction the most specific one available. Runs in O(depth) of the current route.
     *
     * @param path Current route path.
     * @returns Best-matching cached title, or an empty string if none was found.
     */
    protected findBestMatch(path: string): string {
        const segments = path.split('/').filter(segment => segment.length > 0);

        for (let i = segments.length; i > 0; i--) {
            const url = `/${segments.slice(0, i).join('/')}`;
            const title = this.titlesByUrl.get(url);
            if (title !== undefined) {
                return title;
            }
        }

        return this.titlesByUrl.get('/') ?? '';
    }

    /**
     * Strip query and fragment from a URL to produce a stable cache key.
     *
     * @param url URL to normalize.
     * @returns Normalized URL (path only).
     */
    protected normalizeUrl(url: string): string {
        return CoreUrl.removeUrlParts(url, [CoreUrlPartNames.Query, CoreUrlPartNames.Fragment]);
    }

    /**
     * Get the current router path without query or fragment.
     *
     * @returns Current path.
     */
    protected getCurrentPath(): string {
        return this.normalizeUrl(Router.url);
    }

}

export const CorePageTitle = makeSingleton(CorePageTitleService);
