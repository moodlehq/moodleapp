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

import { AbstractType, Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Type, ViewChild } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject } from 'rxjs';
import { sep } from 'path';

import { CORE_SITE_SCHEMAS } from '@services/sites';
import { ApplicationInit, CoreSingletonProxy, Translate } from '@singletons';
import { CoreText } from '@singletons/text';

import { CoreExternalContentDirectiveStub } from './stubs/directives/core-external-content';
import { CoreNetwork } from '@services/network';
import { CorePlatform } from '@services/platform';
import { CoreDB } from '@services/db';
import { CoreNavigator, CoreNavigatorService } from '@services/navigator';
import { CoreLoadings } from '@services/overlays/loadings';
import { TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DefaultUrlSerializer, UrlSerializer } from '@angular/router';
import { Equal } from '@/core/utils/types';

abstract class WrapperComponent<U> {

    child!: U;

}

type ServiceInjectionToken = AbstractType<unknown> | Type<unknown> | string;

let testBedInitialized = false;
const DEFAULT_SERVICE_SINGLETON_MOCKS: [CoreSingletonProxy, unknown][] = [
    [Translate, mock({
        instant: key => key,
        get: key => of(key),
        onTranslationChange: new EventEmitter(),
        onLangChange: new EventEmitter(),
        onDefaultLangChange: new EventEmitter(),
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
    if (!config.standalone) {
        config.declarations.push(component);

        TestBed.configureTestingModule({
            declarations: [
                ...config.declarations,
            ],
            providers: [
                ...getDefaultProviders(config),
                ...config.providers,
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            imports: [
                BrowserModule,
                NoopAnimationsModule,
                TranslateModule.forChild(),
                CoreExternalContentDirectiveStub,
                ...config.imports,
            ],
        });
    } else {
        TestBed.configureTestingModule({
            providers: [
                ...getDefaultProviders(config),
                ...config.providers,
            ],
            imports: [
                component,
                NoopAnimationsModule,
                CoreExternalContentDirectiveStub,
                ...config.imports,
            ],
        });
    }

    testBedInitialized = true;

    await TestBed.compileComponents();

    const fixture = TestBed.createComponent(component);

    fixture.autoDetectChanges();

    await fixture.whenRenderingDone();
    await fixture.whenStable();

    return fixture;
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

        @ViewChild(componentClass) child!: U;

    }

    return HostComponent;
}

/**
 * Gets the default providers for testing.
 *
 * @param config Configuration options for rendering.
 * @returns An array of default providers.
 */
function getDefaultProviders(config: RenderConfig): unknown[] {
    const serviceProviders = DEFAULT_SERVICE_SINGLETON_MOCKS.map(
        ([singleton, mockInstance]) => ({
            provide: singleton.injectionToken,
            useValue: mockInstance,
        }),
    );

    return [
        ...serviceProviders,
        {
            provide: TranslateStore,
            useFactory: () => {
                const store = new TranslateStore();

                store.translations = {
                    en: config.translations ?? {},
                };

                return store;
            },
        },
        { provide: UrlSerializer, useClass: DefaultUrlSerializer },
        { provide: CORE_SITE_SCHEMAS, multiple: true, useValue: [] },
    ];
}

/**
 * Resolves a service instance from the TestBed.
 *
 * @param injectionToken The injection token for the service.
 * @returns The service instance or null if not found.
 */
function resolveServiceInstanceFromTestBed(injectionToken: Exclude<ServiceInjectionToken, string>): Record<string, unknown> | null {
    if (!testBedInitialized) {
        return null;
    }

    return TestBed.inject(injectionToken) as Record<string, unknown> | null;
}

/**
 * Creates a new instance of a service.
 *
 * @param injectionToken The injection token for the service.
 * @returns The new service instance or null if an error occurs.
 */
function createNewServiceInstance(injectionToken: Exclude<ServiceInjectionToken, string>): Record<string, unknown> | null {
    try {
        const constructor = injectionToken as { new (): Record<string, unknown> };

        return new constructor();
    } catch {
        return null;
    }
}

export interface RenderConfig {
    declarations: unknown[];
    providers: unknown[];
    imports: unknown[];
    translations?: Record<string, string>;
    standalone?: boolean;
}

export interface RenderPageConfig extends RenderConfig {
    routeParams: Record<string, unknown>;
}

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
export function mock<T>(
    instance: T | Partial<T> = {},
    overrides: string[] | Record<string, unknown> = {},
): T {
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

    return instance as T;
}

export function mockSingleton<T>(singletonClass: CoreSingletonProxy<T>, instance: T | Partial<T>): T;
export function mockSingleton<T>(
    singletonClass: CoreSingletonProxy<unknown>,
    methods: string[],
    instance?: Record<string, unknown>,
): T;

/**
 * Mocks a singleton instance for testing purposes.
 *
 * @param singleton The singleton class or proxy.
 * @param methodsOrProperties An array of method names to mock or an object containing property names and values.
 * @param properties If `methodsOrProperties` is an array, this object contains the properties to mock.
 * @returns The mocked singleton instance.
 */
export function mockSingleton<T>(
    singleton: CoreSingletonProxy<T>,
    methodsOrProperties: string[] | Record<string, unknown> = [],
    properties: Record<string, unknown> = {},
): T {
    properties = Array.isArray(methodsOrProperties) ? properties : methodsOrProperties;

    const methods = Array.isArray(methodsOrProperties) ? methodsOrProperties : [];
    const instance = getServiceInstance(singleton.injectionToken) as T;
    const mockInstance = mock(instance, methods);
    const mockInstancePrototype = Object.getPrototypeOf(mockInstance);

    for (const [name, value] of Object.entries(properties)) {
        const descriptor = Object.getOwnPropertyDescriptor(mockInstancePrototype, name);

        if (descriptor && !descriptor.writable) {
            continue;
        }

        mockInstance[name] = value;
    }

    singleton.setInstance(mockInstance);

    return mockInstance;
}

/**
 * Resets the testing environment by marking the test bed as uninitialized and
 * restoring default service singleton mocks.
 */
export function resetTestingEnvironment(): void {
    testBedInitialized = false;

    for (const [singleton, mockInstance] of DEFAULT_SERVICE_SINGLETON_MOCKS) {
        mockSingleton(singleton, mockInstance);
    }
}

/**
 * Retrieves the service instance corresponding to the provided injection token.
 * If the injection token is a string, an empty object is returned.
 * If the service instance is found in the test bed, it is returned.
 * If not found, a new service instance is created, or an empty object is returned if creation fails.
 *
 * @param injectionToken The injection token for the desired service.
 * @returns The service instance or an empty object.
 */
export function getServiceInstance(injectionToken: ServiceInjectionToken): Record<string, unknown> {
    if (typeof injectionToken === 'string') {
        return {};
    }

    return resolveServiceInstanceFromTestBed(injectionToken)
        ?? createNewServiceInstance(injectionToken)
        ?? {};
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
    mockSingleton(CoreNavigator, mock<CoreNavigatorService>({
        getRequiredRouteParam<T>(name: string) {
            if (!config.routeParams?.[name]) {
                throw new Error();
            }

            return config.routeParams?.[name] as T;
        },
        getRouteParam: <T>(name: string) => config.routeParams?.[name] as T | undefined,
    }));

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
    if (!config.standalone) {
        config.declarations = config.declarations ?? [];
        config.declarations.push(component);
    }

    return renderAngularComponent(
        createWrapperComponent(template, component),
        {
            declarations: [],
            providers: [],
            imports: [],
            ...config,
        },
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
