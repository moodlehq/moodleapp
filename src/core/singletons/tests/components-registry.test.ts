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
import { CoreComponentsRegistry } from '@singletons/components-registry';

const cssClassName = 'core-components-registry-test';
const createAndRegisterInstance = () => {
    const element = document.createElement('div');
    element.classList.add(cssClassName);
    const instance = new ComponentsRegistryTestClass();

    CoreComponentsRegistry.register(element, instance);

    return { element, instance };
};

describe('CoreComponentsRegistry singleton', () => {

    let element: HTMLElement;
    let testClassInstance: ComponentsRegistryTestClass;

    beforeEach(() => {
        const result = createAndRegisterInstance();
        element = result.element;
        testClassInstance = result.instance;
    });

    it('resolves stored instances', () => {
        expect(CoreComponentsRegistry.resolve(element)).toEqual(testClassInstance);
        expect(CoreComponentsRegistry.resolve(element, ComponentsRegistryTestClass)).toEqual(testClassInstance);
        expect(CoreComponentsRegistry.resolve(element, CoreComponentsRegistry)).toEqual(null);
        expect(CoreComponentsRegistry.resolve(document.createElement('div'))).toEqual(null);
    });

    it('requires stored instances', () => {
        expect(CoreComponentsRegistry.require(element)).toEqual(testClassInstance);
        expect(CoreComponentsRegistry.require(element, ComponentsRegistryTestClass)).toEqual(testClassInstance);
        expect(() => CoreComponentsRegistry.require(element, CoreComponentsRegistry)).toThrow();
        expect(() => CoreComponentsRegistry.require(document.createElement('div'))).toThrow();
    });

    it('waits for component ready', async () => {
        expect(testClassInstance.isReady).toBe(false);

        await CoreComponentsRegistry.waitComponentReady(element);

        expect(testClassInstance.isReady).toBe(true);
    });

    it('waits for components ready: just one', async () => {
        expect(testClassInstance.isReady).toBe(false);

        await CoreComponentsRegistry.waitComponentsReady(element, `.${cssClassName}`);

        expect(testClassInstance.isReady).toBe(true);
    });

    it('waits for components ready: multiple', async () => {
        const secondResult = createAndRegisterInstance();
        const thirdResult = createAndRegisterInstance();
        thirdResult.element.classList.remove(cssClassName); // Remove the class so the element and instance aren't treated.

        const parent = document.createElement('div');
        parent.appendChild(element);
        parent.appendChild(secondResult.element);
        parent.appendChild(thirdResult.element);

        expect(testClassInstance.isReady).toBe(false);
        expect(secondResult.instance.isReady).toBe(false);
        expect(thirdResult.instance.isReady).toBe(false);

        await CoreComponentsRegistry.waitComponentsReady(parent, `.${cssClassName}`);

        expect(testClassInstance.isReady).toBe(true);
        expect(secondResult.instance.isReady).toBe(true);
        expect(thirdResult.instance.isReady).toBe(false);
    });

});

class ComponentsRegistryTestClass {

    randomId = Math.random();
    isReady = false;

    async ready(): Promise<void> {
        await wait(50);

        this.isReady = true;
    }

}
