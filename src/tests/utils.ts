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

import { CUSTOM_ELEMENTS_SCHEMA, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CoreSingletonClass } from '@app/classes/singletons-factory';

export interface ComponentTestMocks {
    //
};

export interface PageTestMocks extends ComponentTestMocks {
    router: Router;
}

export function createMock<T>(methods: string[] = [], properties: Record<string, unknown> = {}): T {
    const mockObject = properties;

    for (const method of methods) {
        mockObject[method] = jest.fn();
    }

    return mockObject as T;
}

export function mockSingleton(
    singletonClass: CoreSingletonClass<unknown>,
    methods: string[] = [],
    properties: Record<string, unknown> = {},
): void {
    singletonClass.setInstance(createMock(methods, properties));
}

export async function prepareComponentTest<T>(component: Type<T>, providers: unknown[] = []): Promise<ComponentTestMocks> {
    TestBed.configureTestingModule({
        declarations: [component],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers,
    });

    await TestBed.compileComponents();

    return {};
}

export async function preparePageTest<T>(component: Type<T>, providers: unknown[] = []): Promise<PageTestMocks> {
    const mocks = {
        router: createMock<Router>(['navigate']),
    };

    const componentTestMocks = await prepareComponentTest(component, [
        ...providers,
        { provide: Router, useValue: mocks.router },
    ]);

    return {
        ...componentTestMocks,
        ...mocks,
    };
}

export function createComponent<T>(component: Type<T>): ComponentFixture<T> {
    return TestBed.createComponent(component);
}
