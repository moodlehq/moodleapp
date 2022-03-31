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

import { AbstractType, Component, CUSTOM_ELEMENTS_SCHEMA, Type, ViewChild } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { sep } from 'path';

import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CoreSingletonProxy, Network, Platform } from '@singletons';
import { CoreTextUtilsProvider } from '@services/utils/text';

import { TranslatePipeStub } from './stubs/pipes/translate';
import { CoreExternalContentDirectiveStub } from './stubs/directives/core-external-content';

abstract class WrapperComponent<U> {

    child!: U;

};

type ServiceInjectionToken = AbstractType<unknown> | Type<unknown> | string;

let testBedInitialized = false;
const textUtils = new CoreTextUtilsProvider();
const DEFAULT_SERVICE_SINGLETON_MOCKS: [CoreSingletonProxy, Record<string, unknown>][] = [
    [Platform, mock({ is: () => false, ready: () => Promise.resolve(), resume: new Subject<void>() })],
    [Network, { onChange: () => new Observable() }],
];

async function renderAngularComponent<T>(component: Type<T>, config: RenderConfig): Promise<ComponentFixture<T>> {
    config.declarations.push(component);

    TestBed.configureTestingModule({
        declarations: [
            ...getDefaultDeclarations(),
            ...config.declarations,
        ],
        providers: [
            ...getDefaultProviders(),
            ...config.providers,
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        imports: [BrowserModule],
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

function getDefaultProviders(): unknown[] {
    const serviceProviders = DEFAULT_SERVICE_SINGLETON_MOCKS.map(
        ([singleton, mockInstance]) => ({
            provide: singleton.injectionToken,
            useValue: mockInstance,
        }),
    );

    return [
        ...serviceProviders,
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
}

export type WrapperComponentFixture<T> = ComponentFixture<WrapperComponent<T>>;

/**
 * Mock a certain class, converting its methods to Mock functions and overriding the specified properties and methods.
 *
 * @param instance Instance to mock.
 * @param overrides Object with the properties or methods to override, or a list of methods to override with an empty function.
 * @return Mock instance.
 */
export function mock<T>(
    instance: T | Partial<T> = {},
    overrides: string[] | Record<string, unknown> = {},
): T {
    // If overrides is an object, apply them to the instance.
    if (!Array.isArray(overrides)) {
        Object.assign(instance, overrides);
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

export function mockSingleton<T>(singletonClass: CoreSingletonProxy<T>, instance: T): T;
export function mockSingleton<T>(singletonClass: CoreSingletonProxy<unknown>, instance?: Record<string, unknown>): T;
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

    Object.assign(mockInstance, properties);

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

export async function renderComponent<T>(component: Type<T>, config: Partial<RenderConfig> = {}): Promise<ComponentFixture<T>> {
    return renderAngularComponent(component, {
        declarations: [],
        providers: [],
        ...config,
    });
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
