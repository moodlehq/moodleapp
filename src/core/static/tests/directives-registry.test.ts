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

import { wait } from '@/testing/utils';
import { CoreDirectivesRegistry } from '@static/directives-registry';

const cssClassName = 'core-directives-registry-test';
const createAndRegisterInstance = (element?: HTMLElement) => {
    element = element ?? document.createElement('div');
    element.classList.add(cssClassName);
    const instance = new DirectivesRegistryTestClass();

    CoreDirectivesRegistry.register(element, instance);

    return { element, instance };
};

describe('CoreDirectivesRegistry', () => {

    let element: HTMLElement;
    let testClassInstance: DirectivesRegistryTestClass;
    let testClassSecondInstance: DirectivesRegistryTestClass;
    let testAltClassInstance: DirectivesRegistryAltTestClass;

    beforeEach(() => {
        let result = createAndRegisterInstance();
        element = result.element;
        testClassInstance = result.instance;

        result = createAndRegisterInstance(element);
        testClassSecondInstance = result.instance;

        testAltClassInstance = new DirectivesRegistryAltTestClass();
        CoreDirectivesRegistry.register(element, testAltClassInstance);
    });

    it('resolves a stored instance', () => {
        expect(CoreDirectivesRegistry.resolve(element)).toEqual(testClassInstance);
        expect(CoreDirectivesRegistry.resolve(element, DirectivesRegistryTestClass)).toEqual(testClassInstance);
        expect(CoreDirectivesRegistry.resolve(element, DirectivesRegistryAltTestClass)).toEqual(testAltClassInstance);
        expect(CoreDirectivesRegistry.resolve(element, CoreDirectivesRegistry)).toEqual(null);
        expect(CoreDirectivesRegistry.resolve(document.createElement('div'))).toEqual(null);
    });

    it('resolves all stored instances', () => {
        expect(CoreDirectivesRegistry.resolveAll(element)).toEqual(
            [testClassInstance, testClassSecondInstance, testAltClassInstance],
        );
        expect(CoreDirectivesRegistry.resolveAll(element, DirectivesRegistryTestClass)).toEqual(
            [testClassInstance, testClassSecondInstance],
        );
        expect(CoreDirectivesRegistry.resolveAll(element, DirectivesRegistryAltTestClass)).toEqual([testAltClassInstance]);
        expect(CoreDirectivesRegistry.resolveAll(element, CoreDirectivesRegistry)).toEqual([]);
        expect(CoreDirectivesRegistry.resolveAll(document.createElement('div'))).toEqual([]);
    });

    it('requires a stored instance', () => {
        expect(CoreDirectivesRegistry.require(element)).toEqual(testClassInstance);
        expect(CoreDirectivesRegistry.require(element, DirectivesRegistryTestClass)).toEqual(testClassInstance);
        expect(CoreDirectivesRegistry.require(element, DirectivesRegistryAltTestClass)).toEqual(testAltClassInstance);
        expect(() => CoreDirectivesRegistry.require(element, CoreDirectivesRegistry)).toThrow();
        expect(() => CoreDirectivesRegistry.require(document.createElement('div'))).toThrow();
    });

    it('waits for directive ready', async () => {
        expect(testClassInstance.isReady).toBe(false);

        await CoreDirectivesRegistry.waitDirectiveReady(element);

        expect(testClassInstance.isReady).toBe(true);
    });

    it('waits for directives ready: just one element and directive', async () => {
        const result = createAndRegisterInstance();
        expect(result.instance.isReady).toBe(false);

        await CoreDirectivesRegistry.waitDirectivesReady(result.element, `.${cssClassName}`);

        expect(result.instance.isReady).toBe(true);
        expect(testClassInstance.isReady).toBe(false);
    });

    it('waits for directives ready: all directives, single element', async () => {
        expect(testClassInstance.isReady).toBe(false);
        expect(testClassSecondInstance.isReady).toBe(false);
        expect(testAltClassInstance.isReady).toBe(false);

        await CoreDirectivesRegistry.waitDirectivesReady(element);

        expect(testClassInstance.isReady).toBe(true);
        expect(testClassSecondInstance.isReady).toBe(true);
        expect(testAltClassInstance.isReady).toBe(true);
    });

    it('waits for directives ready: filter by class, single element', async () => {
        expect(testClassInstance.isReady).toBe(false);
        expect(testClassSecondInstance.isReady).toBe(false);
        expect(testAltClassInstance.isReady).toBe(false);

        await CoreDirectivesRegistry.waitDirectivesReady(element, `.${cssClassName}`, DirectivesRegistryTestClass);

        expect(testClassInstance.isReady).toBe(true);
        expect(testClassSecondInstance.isReady).toBe(true);
        expect(testAltClassInstance.isReady).toBe(false);
    });

    it('waits for directives ready: multiple elements', async () => {
        const secondResult = createAndRegisterInstance();
        const thirdResult = createAndRegisterInstance();
        thirdResult.element.classList.remove(cssClassName); // Remove the class so the element and instance aren't treated.

        const parent = document.createElement('div');
        parent.appendChild(element);
        parent.appendChild(secondResult.element);
        parent.appendChild(thirdResult.element);

        expect(testClassInstance.isReady).toBe(false);
        expect(testClassSecondInstance.isReady).toBe(false);
        expect(testAltClassInstance.isReady).toBe(false);
        expect(secondResult.instance.isReady).toBe(false);
        expect(thirdResult.instance.isReady).toBe(false);

        await CoreDirectivesRegistry.waitDirectivesReady(parent, `.${cssClassName}`, DirectivesRegistryTestClass);

        expect(testClassInstance.isReady).toBe(true);
        expect(testClassSecondInstance.isReady).toBe(true);
        expect(testAltClassInstance.isReady).toBe(false);
        expect(secondResult.instance.isReady).toBe(true);
        expect(thirdResult.instance.isReady).toBe(false);
    });

});

class DirectivesRegistryTestClass {

    randomId = Math.random();
    isReady = false;

    async ready(): Promise<void> {
        await wait(50);

        this.isReady = true;
    }

}

class DirectivesRegistryAltTestClass {

    randomId = Math.random();
    isReady = false;

    async ready(): Promise<void> {
        await wait(50);

        this.isReady = true;
    }

}
