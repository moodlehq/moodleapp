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

import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, ProviderToken, Signal, Type, viewChild } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ComponentFixture, TestBed, TestModuleMetadata } from '@angular/core/testing';
import { Observable, of, Subject } from 'rxjs';
import { sep } from 'path';

import { CORE_SITE_SCHEMAS } from '@services/sites';
import { ApplicationInit, CoreSingletonProxy, Translate } from '@singletons';
import { CoreText } from '@static/text';

import { CoreExternalContentDirectiveStub } from './stubs/directives/core-external-content';
import { CoreNetwork } from '@services/network';
import { CorePlatform } from '@services/platform';
import { CoreDB } from '@services/db';
import { CoreNavigator } from '@services/navigator';
import { CoreLoadings } from '@services/overlays/loadings';
import { TranslatePipe, TranslateService, TranslateStore } from '@ngx-translate/core';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DefaultUrlSerializer, UrlSerializer } from '@angular/router';
import { Equal } from '@/core/utils/types';
import type { Provider } from '@angular/core';

abstract class WrapperComponent<U> {

    readonly child!: Signal<U>;

}

type ServiceInjectionToken<Service = unknown> = ProviderToken<Service>;

let testBedInitialized = false;
const DEFAULT_SERVICE_SINGLETON_MOCKS: [CoreSingletonProxy, unknown][] = [
    [Translate, mock({
        instant: key => key,
        get: key => of(key),
        onTranslationChange: new EventEmitter(),
        onLangChange: new EventEmitter(),
        onFallbackLangChange: new EventEmitter(),
    })],
    [CoreDB, mock({ getDB: () => mock() })],
    [CoreNavigator, mock({ navigateToSitePath: () => Promise.resolve(true) })],
    [ApplicationInit, mock({
        donePromise: Promise.resolve(),
        runInitializers: () => Promise.resolve(),
    })],
    [CorePlatform, mock({
        is: () => false,
        isMobile: () => false,
        isAndroid: () => false,
        isIOS: () => false,
        ready: () => Promise.resolve(),
        resume: new Subject<void>(),
        isAutomated: () => true,
    })],
    [CoreNetwork, mock({
        isOnline: () => true,
        onChange: () => new Observable(),
    })],
    [CoreLoadings, mock({
        show: () => Promise.resolve(mock<CoreIonLoadingElement>({ dismiss: jest.fn() })),
    })],
];

/**
 * Renders an Angular component for testing.
 *
 * @param component The Angular component to render.
 * @param config Configuration options for rendering.
 * @returns A promise that resolves to the testing component fixture.
 */
async function renderAngularComponent<T>(component: Type<T>, config: RenderConfig): Promise<TestingComponentFixture<T>> {

    // Default to standalone unless explicitly set to false.
    const isStandalone = config.standalone ?? true;

    const providers = getDefaultProviders(config, config.providers);

    let testModuleConfig: TestModuleMetadata = {};

    if (isStandalone) {
        // For standalone components, use 'imports' only.
        testModuleConfig = {
            providers,
            imports: [
                component,
                NoopAnimationsModule,
                CoreExternalContentDirectiveStub,
                ...(config.imports ?? []),
            ],
        };
    } else {
        // For non-standalone, use declarations, imports, schemas.
        testModuleConfig = {
            declarations: [
                ...(config.declarations ?? []),
                component,
            ],
            providers,
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            imports: [
                BrowserModule,
                NoopAnimationsModule,
                TranslatePipe,
                CoreExternalContentDirectiveStub,
                ...(config.imports ?? []),
            ],
        };
    }

    try {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule(testModuleConfig);

        await TestBed.compileComponents();
        testBedInitialized = true;

        const fixture = TestBed.createComponent(component);
        fixture.autoDetectChanges();

        await fixture.whenRenderingDone();
        await fixture.whenStable();

        return fixture;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in renderAngularComponent:', error);
        throw error;
    }
}

/**
 * Creates a wrapper component for testing.
 *
 * @param template The template for the wrapper component.
 * @param componentClass The class of the component to be wrapped.
 * @returns The wrapper component class.
 */
function createWrapperComponent<U>(template: string, componentClass: Type<U>): Type<WrapperComponent<U>> {
    @Component({
        template,
        imports: [
            componentClass,
        ],
    })
    class HostComponent extends WrapperComponent<U> {

        readonly child = viewChild.required<U>(componentClass);

    }

    return HostComponent;
}

/**
 * Gets the default providers for testing.
 *
 * @param config Configuration options for rendering.
 * @param overrides Optional: array of providers to override or extend defaults.
 * @returns Array of Angular providers for the test module.
 */
function getDefaultProviders(config: RenderConfig, overrides: Provider[] = []): Provider[] {
    const serviceProviders: Provider[] = DEFAULT_SERVICE_SINGLETON_MOCKS.map(
        ([singleton, mockInstance]) => ({
            provide: singleton.injectionToken,
            useValue: mockInstance,
        }),
    );

    if (config.translations) {
        // @todo Use mockTranslate when possible.
        const translateProvider = {
            provide: TranslateStore,
            useFactory: () => {
                const store = new TranslateStore();

                store.setTranslations('en', config.translations ?? {}, false);

                return store;
            },
        };

        serviceProviders.push(translateProvider);
    }

    return [
        ...serviceProviders,
        { provide: UrlSerializer, useClass: DefaultUrlSerializer },
        { provide: CORE_SITE_SCHEMAS, multi: true, useValue: [] },
        ...overrides,
    ];
}

export type RenderConfig = {
    declarations: unknown[];
    providers: Provider[];
    imports: unknown[];
    translations?: Record<string, string>;
    standalone?: boolean;
};

export type RenderPageConfig = RenderConfig & {
    routeParams: Record<string, unknown>;
};

export type TestingComponentFixture<T = unknown> = Omit<ComponentFixture<T>, 'nativeElement'> & { nativeElement: Element };

export type WrapperComponentFixture<T = unknown> = TestingComponentFixture<WrapperComponent<T>>;

/**
 * Finds an element in the fixture's native element.
 *
 * @param fixture The testing component fixture.
 * @param selector The CSS selector for the element.
 * @param content The text content or regular expression to match.
 * @returns The element or null if not found.
 */
export function findElement<E = HTMLElement>(
    fixture: TestingComponentFixture,
    selector: string,
    content?: string | RegExp,
): E | null {
    const elements = fixture.nativeElement.querySelectorAll(selector);
    const matches = typeof content === 'string'
        ? (textContent: string | null) => textContent?.includes(content)
        : (textContent: string | null) => textContent?.match(content ?? '');

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];

        if (content && !matches(element.textContent)) {
            continue;
        }

        return element as unknown as E;
    }

    return null;
}

/**
 * Requires an element in the fixture's native element.
 *
 * @param fixture The testing component fixture.
 * @param selector The CSS selector for the element.
 * @param content The text content or regular expression to match.
 * @returns The element.
 */
export function requireElement<E = HTMLElement>(
    fixture: TestingComponentFixture,
    selector: string,
    content?: string | RegExp,
): E {
    const element = findElement<E>(fixture, selector, content);

    if (!element) {
        throw Error(`Could not find '${selector}' element`);
    }

    return element;
}

/**
 * Mock a certain class, converting its methods to Mock functions and overriding the specified properties and methods.
 *
 * @param instance Instance to mock.
 * @param overrides Object with the properties or methods to override, or a list of methods to override with an empty function.
 * @returns Mock instance.
 */
export function mock<Service>(
    instance: Service | Partial<Service> = {},
    overrides: string[] | Record<string, unknown> = {},
): Service {
    // If overrides is an object, apply them to the instance.
    if (!Array.isArray(overrides)) {
        Object.assign(instance as Record<string, unknown>, overrides);
    }

    // Convert instance functions to jest functions.
    for (const property of Object.getOwnPropertyNames(instance)) {
        const value = instance[property];

        if (typeof value !== 'function') {
            continue;
        }

        instance[property] = jest.fn((...args) => value.call(instance, ...args));
    }

    // If overrides is a list of methods, add them now.
    if (Array.isArray(overrides)) {
        for (const method of overrides) {
            instance[method] = jest.fn();
        }
    }

    return instance as Service;
}

/**
 * Mocks a singleton instance for testing purposes.
 *
 * @param singleton The singleton class or proxy.
 * @param overrides Object with the properties or methods to override, or a list of methods to override with an empty function.
 * @param options Options.
 * @param options.forceConstructorFallback Whether to force using the constructor instead of TestBed.inject.
 * @returns The mocked singleton instance.
 */
export function mockSingleton<Service>(
    singleton: CoreSingletonProxy<Service>,
    overrides: string[] | Record<string, unknown> = {},
    { forceConstructorFallback = false } = {},
): Service {
    // Get the original instance (from DI or constructor).
    const instance = getServiceInstance<Service>(singleton.injectionToken, { forceConstructorFallback }) as Service;

    // Create the mock instance.
    const mockInstance = mock(instance, overrides);

    // Set the mocked instance on the singleton proxy
    singleton.setInstance(mockInstance);

    return mockInstance;
}

/**
 * Resets the testing environment by marking the test bed as uninitialized and
 * restoring default service singleton mocks.
 */
export function resetTestingEnvironment(): void {
    testBedInitialized = false;

    TestBed.resetTestingModule();

    TestBed.runInInjectionContext(() => {
        for (const [singleton, mockInstance] of DEFAULT_SERVICE_SINGLETON_MOCKS) {
            // Pass mockInstance as property overrides
            mockSingleton(singleton, mockInstance as Record<string, unknown>);
        }
    });
}

/**
 * Resolves a service instance for the given injection token.
 *
 * - Uses TestBed.inject for DI-managed services.
 * - Falls back to direct constructor for POJOs or non-DI classes.
 * - If the token is a string, returns an empty object (cannot instantiate).
 *
 * @param injectionToken The injection token for the desired service.
 * @param options Options.
 * @param options.forceConstructorFallback Whether to force using the constructor instead of TestBed.inject.
 * @returns The service instance or an empty object.
 */
export function getServiceInstance<Service = unknown>(
    injectionToken: ServiceInjectionToken<Service>,
    { forceConstructorFallback = false } = {},
): Service | Record<string, unknown> | null {
    // If the token is a string, cannot instantiate or inject.
    if (typeof injectionToken === 'string') {
        // eslint-disable-next-line no-console
        console.warn('Cannot instantiate service for string injection token:', injectionToken);

        return {};
    }

    // Try TestBed.inject first (preferred for DI-managed services)
    if (!forceConstructorFallback) {
        try {
            const instance = TestBed.inject<Service>(injectionToken);

            return instance;
        } catch (error) {
            if (testBedInitialized) {
                // eslint-disable-next-line no-console
                console.warn('TestBed.inject failed:', error);
            }
        }
    }

    // Fallback: direct constructor (for non-DI classes)
    try {
        const constructor = injectionToken as { new (): Service };

        return new constructor();
    } catch (error) {
        // @todo Remove special case when TranslateLoader and Router issue is resolved.
        const errorMessage = (error as Error).message || '';
        if (errorMessage.includes('TranslateLoader') || errorMessage.includes('_Console')) {
            return {};
        }

        // eslint-disable-next-line no-console
        console.warn('Direct constructor failed:', error);
    }

    return {};
}

/**
 * Renders a component with the given configuration.
 *
 * @param component The Angular component to render.
 * @param config Configuration options for rendering.
 * @returns A promise that resolves to the testing component fixture.
 */
export async function renderComponent<T>(
    component: Type<T>,
    config: Partial<RenderConfig> = {},
): Promise<TestingComponentFixture<T>> {
    return renderAngularComponent(component, {
        declarations: [],
        providers: [],
        imports: [],
        ...config,
    });
}

/**
 * Renders a page component with the given configuration.
 *
 * @param component The Angular component to render.
 * @param config Configuration options for rendering a page component.
 * @returns A promise that resolves to the testing component fixture.
 */
export async function renderPageComponent<T>(
    component: Type<T>,
    config: Partial<RenderPageConfig> = {},
): Promise<TestingComponentFixture<T>> {
    mockSingleton(CoreNavigator, {
        getRequiredRouteParam<T>(name: string) {
            if (!config.routeParams?.[name]) {
                throw new Error();
            }

            return config.routeParams?.[name] as T;
        },
        getRouteParam: <T>(name: string) => config.routeParams?.[name] as T | undefined,
    });

    return renderComponent(component, config);
}

/**
 * Renders a template with the given configuration.
 *
 * @param component The Angular component to wrap in a template.
 * @param template The template for the wrapper component.
 * @param config Configuration options for rendering.
 * @returns A promise that resolves to the wrapper component fixture.
 */
export async function renderTemplate<T>(
    component: Type<T>,
    template: string,
    config: Partial<RenderConfig> = {},
): Promise<WrapperComponentFixture<T>> {
    const standalone = config.standalone ?? true;

    const renderConfig: RenderConfig = {
        declarations: [ ...(config.declarations ?? []) ],
        providers: [ ...(config.providers ?? []) ],
        imports: [ ...(config.imports ?? []) ],
        ...config,
    };

    if (!standalone) {
        renderConfig.declarations.push(component);
    }

    return renderAngularComponent(
        createWrapperComponent(template, component),
        renderConfig,
    );
}

/**
 * Renders a wrapper component with the given configuration.
 *
 * @param component The Angular component to wrap.
 * @param tag The HTML tag for the wrapper component.
 * @param inputs Input attributes for the wrapper component.
 * @param config Configuration options for rendering.
 * @returns A promise that resolves to the wrapper component fixture.
 */
export async function renderWrapperComponent<T>(
    component: Type<T>,
    tag: string,
    inputs: Record<string, unknown> = {},
    config: Partial<RenderConfig> = {},
): Promise<WrapperComponentFixture<T>> {
    const inputAttributes = Object
        .entries(inputs)
        .map(([name, value]) => `[${name}]="${CoreText.escapeHTML(JSON.stringify(value)).replace(/\//g, '\\/')}"`)
        .join(' ');

    return renderTemplate(component, `<${tag} ${inputAttributes}></${tag}>`, config);
}

/**
 * Transform the provided path into a cross-platform path.
 *
 * @param unixPath path in unix format.
 * @returns cross-platform path.
 */
export function agnosticPath(unixPath: string): string {
    return unixPath.replace(/\//g, sep);
}

/**
 * Waits a certain time.
 *
 * @param time Number of milliseconds.
 */
export function wait(time: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

/**
 * Mocks translate service with certain translations.
 *
 * @param translations List of translations.
 */
export function mockTranslate(translations: Record<string, string> = {}): void {
    mockSingleton(Translate as CoreSingletonProxy<TranslateService>, {
        instant: (key, replacements) => {
            const applyReplacements = (text: string): string => Object.entries(replacements ?? {}).reduce(
                (text, [name, value]) => text.replace(`{{${name}}}`, value),
                text,
            );

            return Array.isArray(key)
                ? key.map(k => applyReplacements(translations[k] ?? k))
                : applyReplacements(translations[key] ?? key);
        },
    });
}

/**
 * Creates a test function that asserts that two types are equal.
 *
 * @param equal The equality check function for types A and B.
 * @returns A test function that asserts equality.
 */
export function expectSameTypes<A, B>(equal: Equal<A, B>): () => void {
    return () => expect(equal).toBe(true);
}

/**
 * Creates a test function that always asserts true, used for testing generic types.
 *
 * @returns A test function that always asserts true.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function expectAnyType<T>(): () => void {
    return () => expect(true).toBe(true);
}
