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

import { Component, CUSTOM_ELEMENTS_SCHEMA, Type, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoreSingletonProxy } from '@singletons';

abstract class WrapperComponent<U> {

    child!: U;

};

export interface RenderConfig {
    declarations: unknown[];
    providers: unknown[];
}

export type WrapperComponentFixture<T> = ComponentFixture<WrapperComponent<T>>;

export function mock<T>(instance?: Record<string, unknown>): T;
export function mock<T>(methods: string[], instance?: Record<string, unknown>): T;
export function mock<T>(
    methodsOrInstance: string[] | Record<string, unknown> = [],
    instance: Record<string, unknown> = {},
): T {
    instance = Array.isArray(methodsOrInstance) ? instance : methodsOrInstance;

    const methods = Array.isArray(methodsOrInstance) ? methodsOrInstance : [];

    for (const property of Object.getOwnPropertyNames(instance)) {
        const value = instance[property];

        if (typeof value !== 'function') {
            continue;
        }

        instance[property] = jest.fn((...args) => value.call(instance, ...args));
    }

    for (const method of methods) {
        instance[method] = jest.fn();
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
    methodsOrInstance: string[] | Record<string, unknown> = [],
    instance: Record<string, unknown> = {},
): T {
    instance = Array.isArray(methodsOrInstance) ? instance : methodsOrInstance;

    const methods = Array.isArray(methodsOrInstance) ? methodsOrInstance : [];
    const mockInstance = mock<T>(methods, instance);

    singleton.setInstance(mockInstance);

    return mockInstance;
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
    inputs: Record<string, { toString() }> = {},
    config: Partial<RenderConfig> = {},
): Promise<WrapperComponentFixture<T>> {
    const inputAttributes = Object
        .entries(inputs)
        .map(([name, value]) => `${name}="${value.toString().replace(/"/g, '&quot;')}"`)
        .join(' ');

    return renderTemplate(component, `<${tag} ${inputAttributes}></${tag}>`, config);
}

async function renderAngularComponent<T>(component: Type<T>, config: RenderConfig): Promise<ComponentFixture<T>> {
    config.declarations.push(component);

    TestBed.configureTestingModule({
        declarations: config.declarations,
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: config.providers,
    });

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
