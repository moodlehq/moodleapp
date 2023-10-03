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
import { CoreTextUtilsProvider } from '@services/utils/text';

import { TranslatePipeStub } from './stubs/pipes/translate';
import { CoreExternalContentDirectiveStub } from './stubs/directives/core-external-content';
import { CoreNetwork } from '@services/network';
import { CorePlatform } from '@services/platform';
import { CoreDB } from '@services/db';
import { CoreNavigator, CoreNavigatorService } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { TranslateService, TranslateStore } from '@ngx-translate/core';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DefaultUrlSerializer, UrlSerializer } from '@angular/router';
import { CoreUtils, CoreUtilsProvider } from '@services/utils/utils';
import { Equal } from '@/core/utils/types';

abstract class WrapperComponent<U> {

    child!: U;

}

type ServiceInjectionToken = AbstractType<unknown> | Type<unknown> | string;

let testBedInitialized = false;
const textUtils = new CoreTextUtilsProvider();
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
    [CoreDomUtils, mock({
        showModalLoading: () => Promise.resolve(mock<CoreIonLoadingElement>({ dismiss: jest.fn() })),
    })],
    [CoreUtils, mock(new CoreUtilsProvider(), {
        nextTick: () => Promise.resolve(),
    })],
];

async function renderAngularComponent<T>(component: Type<T>, config: RenderConfig): Promise<TestingComponentFixture<T>> {
    config.declarations.push(component);

    TestBed.configureTestingModule({
        declarations: [
            ...getDefaultDeclarations(),
            ...config.declarations,
        ],
        providers: [
            ...getDefaultProviders(config),
            ...config.providers,
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        imports: [
            BrowserModule,
            BrowserAnimationsModule,
            ...config.imports,
        ],
    });

    testBedInitialized = true;

    await TestBed.compileComponents();

    const fixture = TestBed.createComponent(component);

    fixture.autoDetectChanges(true);

    await fixture.whenRenderingDone();
    await fixture.whenStable();

    return fixture;
}

function createWrapperComponent<U>(template: string, componentClass: Type<U>): Type<WrapperComponent<U>> {
    @Component({ template })
    class HostComponent extends WrapperComponent<U> {

        @ViewChild(componentClass) child!: U;

    }

    return HostComponent;
}

function getDefaultDeclarations(): unknown[] {
    return [
        TranslatePipeStub,
        CoreExternalContentDirectiveStub,
    ];
}

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

function resolveServiceInstanceFromTestBed(injectionToken: Exclude<ServiceInjectionToken, string>): Record<string, unknown> | null {
    if (!testBedInitialized) {
        return null;
    }

    return TestBed.inject(injectionToken) as Record<string, unknown> | null;
}

function createNewServiceInstance(injectionToken: Exclude<ServiceInjectionToken, string>): Record<string, unknown> | null {
    try {
        const constructor = injectionToken as { new (): Record<string, unknown> };

        return new constructor();
    } catch (e) {
        return null;
    }
}

export interface RenderConfig {
    declarations: unknown[];
    providers: unknown[];
    imports: unknown[];
    translations?: Record<string, string>;
}

export interface RenderPageConfig extends RenderConfig {
    routeParams: Record<string, unknown>;
}

export type TestingComponentFixture<T = unknown> = Omit<ComponentFixture<T>, 'nativeElement'> & { nativeElement: Element };

export type WrapperComponentFixture<T = unknown> = TestingComponentFixture<WrapperComponent<T>>;

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

export function resetTestingEnvironment(): void {
    testBedInitialized = false;

    for (const [singleton, mockInstance] of DEFAULT_SERVICE_SINGLETON_MOCKS) {
        mockSingleton(singleton, mockInstance);
    }
}

export function getServiceInstance(injectionToken: ServiceInjectionToken): Record<string, unknown> {
    if (typeof injectionToken === 'string') {
        return {};
    }

    return resolveServiceInstanceFromTestBed(injectionToken)
        ?? createNewServiceInstance(injectionToken)
        ?? {};
}

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

export async function renderTemplate<T>(
    component: Type<T>,
    template: string,
    config: Partial<RenderConfig> = {},
): Promise<WrapperComponentFixture<T>> {
    config.declarations = config.declarations ?? [];
    config.declarations.push(component);

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

export async function renderWrapperComponent<T>(
    component: Type<T>,
    tag: string,
    inputs: Record<string, unknown> = {},
    config: Partial<RenderConfig> = {},
): Promise<WrapperComponentFixture<T>> {
    const inputAttributes = Object
        .entries(inputs)
        .map(([name, value]) => `[${name}]="${textUtils.escapeHTML(JSON.stringify(value)).replace(/\//g, '\\/')}"`)
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

export function expectSameTypes<A, B>(equal: Equal<A, B>): () => void {
    return () => expect(equal).toBe(true);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function expectAnyType<T>(): () => void {
    return () => expect(true).toBe(true);
}
