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

import { InjectionToken, Injector, ModuleWithProviders, NgModule } from '@angular/core';
import {
    PreloadAllModules,
    RouterModule,
    Route,
    Routes,
    ROUTES,
    UrlMatcher,
    UrlMatchResult,
    UrlSegment,
    UrlSegmentGroup,
} from '@angular/router';

import { CoreArray } from '@singletons/array';

/**
 * Build app routes.
 *
 * @param injector Module injector.
 * @returns App routes.
 */
function buildAppRoutes(injector: Injector): Routes {
    return CoreArray.flatten(injector.get<Routes[]>(APP_ROUTES, []));
}

/**
 * Create a url matcher that will only match when a given condition is met.
 *
 * @param pathOrMatcher Original path or matcher configured in the route.
 * @param condition Condition.
 * @returns Conditional url matcher.
 */
function buildConditionalUrlMatcher(pathOrMatcher: string | UrlMatcher, condition: () => boolean): UrlMatcher {
    // Create a matcher based on Angular's default matcher.
    // see https://github.com/angular/angular/blob/10.0.x/packages/router/src/shared.ts#L127
    return (segments: UrlSegment[], segmentGroup: UrlSegmentGroup, route: Route): UrlMatchResult | null => {
        // If the condition isn't met, the route will never match.
        if (!condition()) {
            return null;
        }

        // Use existing matcher if any.
        if (typeof pathOrMatcher === 'function') {
            return pathOrMatcher(segments, segmentGroup, route);
        }

        const path = pathOrMatcher;
        const parts = path.split('/');
        const isFullMatch = route.pathMatch === 'full';
        const posParams: Record<string, UrlSegment> = {};

        // The path matches anything.
        if (path === '') {
            return (!isFullMatch || segments.length === 0) ? { consumed: [] } : null;
        }

        // The actual URL is shorter than the config, no match.
        if (parts.length > segments.length) {
            return null;
        }

        // The config is longer than the actual URL but we are looking for a full match, return null.
        if (isFullMatch && (segmentGroup.hasChildren() || parts.length < segments.length)) {
            return null;
        }

        // Check each config part against the actual URL.
        for (let index = 0; index < parts.length; index++) {
            const part = parts[index];
            const segment = segments[index];
            const isParameter = part.startsWith(':');

            if (isParameter) {
                posParams[part.substring(1)] = segment;
            } else if (part !== segment.path) {
                // The actual URL part does not match the config, no match.
                return null;
            }
        }

        // Return consumed segments with params.
        return { consumed: segments.slice(0, parts.length), posParams };
    };
}

/**
 * Build url matcher using a regular expression.
 *
 * @param regexp Regular expression.
 * @returns Url matcher.
 */
export function buildRegExpUrlMatcher(regexp: RegExp): UrlMatcher {
    return (segments: UrlSegment[]): UrlMatchResult | null => {
        // Ignore empty paths.
        if (segments.length === 0) {
            return null;
        }

        const path = segments.map(segment => segment.path).join('/');
        const match = regexp.exec(path)?.[0];

        // Ignore paths that don't match the start of the url.
        if (!match || !path.startsWith(match)) {
            return null;
        }

        // Consume segments that match.
        const [consumedSegments, consumedPath] = segments.slice(1).reduce(([segments, path], segment) => path === match
            ? [segments, path]
            : [
                segments.concat(segment),
                `${path}/${segment.path}`,
            ], [[segments[0]] as UrlSegment[], segments[0].path]);

        if (consumedPath !== match) {
            return null;
        }

        return { consumed: consumedSegments };
    };
}

export type ModuleRoutes = { children: Routes; siblings: Routes };
export type ModuleRoutesConfig = Routes | Partial<ModuleRoutes>;

/**
 * Configure routes so that they'll only match when a given condition is met.
 *
 * @param routes Routes.
 * @param condition Condition to determine if routes should be activated or not.
 * @returns Conditional routes.
 */
export function conditionalRoutes(routes: Routes, condition: () => boolean): Routes {
    return routes.map(route => {
        // We need to remove the path from the route because Angular doesn't call the matcher for empty paths.
        const { path, matcher, ...newRoute } = route;
        const matcherOrPath = matcher ?? path;

        if (matcherOrPath === undefined) {
            throw new Error('Route defined without matcher nor path');
        }

        return {
            ...newRoute,
            matcher: buildConditionalUrlMatcher(matcherOrPath, condition),
        };
    });
}

/**
 * Resolve module routes.
 *
 * @param injector Module injector.
 * @param token Routes injection token.
 * @returns Routes.
 */
export function resolveModuleRoutes(injector: Injector, token: InjectionToken<ModuleRoutesConfig[]>): ModuleRoutes {
    const configs = injector.get(token, []);
    const routes = configs.map(config => {
        if (Array.isArray(config)) {
            return {
                children: [],
                siblings: config,
            };
        }

        return {
            children: config.children || [],
            siblings: config.siblings || [],
        };
    });

    return {
        children: CoreArray.flatten(routes.map(r => r.children)),
        siblings: CoreArray.flatten(routes.map(r => r.siblings)),
    };
}

export const APP_ROUTES = new InjectionToken('APP_ROUTES');

@NgModule({
    imports: [
        RouterModule.forRoot([], {
            preloadingStrategy: PreloadAllModules,
            relativeLinkResolution: 'corrected',
        }),
    ],
    providers: [
        { provide: ROUTES, multi: true, useFactory: buildAppRoutes, deps: [Injector] },
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {

    static forChild(routes: Routes): ModuleWithProviders<AppRoutingModule> {
        return {
            ngModule: AppRoutingModule,
            providers: [
                { provide: APP_ROUTES, multi: true, useValue: routes },
            ],
        };
    }

}
