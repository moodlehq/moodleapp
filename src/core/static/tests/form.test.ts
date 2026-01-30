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

import { ElementRef } from '@angular/core';
import { CoreEventFormAction, CoreEvents } from '@static/events';
import { CoreForms } from '@static/form';

const createInputElement = (type: string, name: string, value = ''): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.value = value;

    return input;
};

describe('CoreForms', () => {

    it('gets data from form', () => {
        // Create several types of inputs.
        const textInput = createInputElement('text', 'mytext');
        const firstRadio = createInputElement('radio', 'myradio', 'firstradio');
        const secondRadio = createInputElement('radio', 'myradio', 'secondradio');
        const checkbox = createInputElement('checkbox', 'mycheckbox');
        const hiddenInput = createInputElement('hidden', 'myhidden', 'hiddenvalue');
        const submitInput = createInputElement('submit', 'submit');

        const textarea = document.createElement('textarea');
        textarea.name = 'mytextarea';

        const select = document.createElement('select');
        select.name = 'myselect';
        const firstOption = document.createElement('option');
        firstOption.value = 'firstoption';
        const secondOption = document.createElement('option');
        secondOption.value = 'secondoption';
        select.appendChild(firstOption);
        select.appendChild(secondOption);

        // Create a form with the inputs.
        const form = document.createElement('form');
        form.appendChild(textInput);
        form.appendChild(firstRadio);
        form.appendChild(secondRadio);
        form.appendChild(checkbox);
        form.appendChild(hiddenInput);
        form.appendChild(submitInput);
        form.appendChild(textarea);
        form.appendChild(select);

        // Test data is retrieved.
        const values: Record<string, string | boolean> = {
            mytext: '',
            mycheckbox: false,
            myhidden: 'hiddenvalue',
            mytextarea: '',
            myselect: 'firstoption',
        };

        expect(CoreForms.getDataFromForm(form)).toEqual(values);

        // Change some values and test again.
        textInput.value = values.mytext = 'a value';
        select.value = values.myselect = 'secondoption';
        firstRadio.checked = true;
        values.myradio = 'firstradio';
        checkbox.checked = values.mycheckbox = true;
        textarea.value = values.mytextarea = 'textarea value';

        expect(CoreForms.getDataFromForm(form)).toEqual(values);
    });

    it('triggers form action events', () => {
        const form = document.createElement('form');
        const formElRef = new ElementRef(form);
        const siteId = 'site-id';
        const callback = jest.fn();
        const secondCallback = jest.fn();

        CoreEvents.on(CoreEvents.FORM_ACTION, callback, siteId);
        CoreEvents.on(CoreEvents.FORM_ACTION, secondCallback, 'another-site');

        CoreForms.triggerFormCancelledEvent(form, siteId);
        expect(callback).toHaveBeenCalledWith({
            action: CoreEventFormAction.CANCEL,
            form,
            siteId,
        });

        CoreForms.triggerFormCancelledEvent(formElRef, siteId);
        expect(callback).toHaveBeenCalledWith({
            action: CoreEventFormAction.CANCEL,
            form,
            siteId,
        });

        CoreForms.triggerFormSubmittedEvent(form, true, siteId);
        expect(callback).toHaveBeenCalledWith({
            action: CoreEventFormAction.SUBMIT,
            form,
            online: true,
            siteId,
        });

        CoreForms.triggerFormSubmittedEvent(form, false, siteId);
        expect(callback).toHaveBeenCalledWith({
            action: CoreEventFormAction.SUBMIT,
            form,
            online: false,
            siteId,
        });

        CoreForms.triggerFormSubmittedEvent(formElRef, true, siteId);
        expect(callback).toHaveBeenCalledWith({
            action: CoreEventFormAction.SUBMIT,
            form,
            online: true,
            siteId,
        });
        expect(secondCallback).not.toHaveBeenCalled();
    });

});
