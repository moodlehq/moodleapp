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

import { CoreEvents } from '@static/events';

const eventName = 'my-event';

describe('CoreEvents', () => {

    it('can be used to trigger and receive events', () => {
        const callback = jest.fn();
        const secondCallback = jest.fn();
        const data = { foo: 'bar' };

        const listener = CoreEvents.on(eventName, callback);
        CoreEvents.on('another-event', secondCallback);

        CoreEvents.trigger(eventName, data);

        expect(callback).toHaveBeenCalledWith(data);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(secondCallback).not.toHaveBeenCalled();

        listener.off();
        CoreEvents.trigger(eventName, data);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('only calls the right listeners based on site ID', () => {
        const callback = jest.fn();
        const secondCallback = jest.fn();
        const thirdCallback = jest.fn();
        const siteId = 'site-id';
        const data = { foo: 'bar' };
        const dataWithSiteId = {
            ...data,
            siteId,
        };

        CoreEvents.on(eventName, callback);
        CoreEvents.on(eventName, secondCallback, siteId);
        CoreEvents.on(eventName, thirdCallback, 'another-site-id');

        CoreEvents.trigger(eventName, data, siteId);

        expect(callback).toHaveBeenCalledWith(dataWithSiteId);
        expect(secondCallback).toHaveBeenCalledWith(dataWithSiteId);
        expect(thirdCallback).not.toHaveBeenCalled();
    });

    it('can call a listener only once', async () => {
        const callback = jest.fn();

        CoreEvents.once(eventName, callback);
        CoreEvents.trigger(eventName);

        expect(callback).toHaveBeenCalledTimes(1);

        CoreEvents.trigger(eventName);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('can trigger a unique event', async () => {
        const callback = jest.fn();
        const secondCallback = jest.fn();

        CoreEvents.on(eventName, callback);

        CoreEvents.triggerUnique(eventName, {});
        expect(callback).toHaveBeenCalledTimes(1);

        CoreEvents.on(eventName, secondCallback);
        expect(secondCallback).toHaveBeenCalledTimes(1);

        CoreEvents.triggerUnique(eventName, {});
        expect(callback).toHaveBeenCalledTimes(1);
        expect(secondCallback).toHaveBeenCalledTimes(1);
    });

    it('allows listening to multiple events with a single call', async () => {
        const callback = jest.fn();
        const secondEventName = 'second-event';

        const listener = CoreEvents.onMultiple([eventName, secondEventName], callback);

        CoreEvents.trigger(eventName);
        expect(callback).toHaveBeenCalledTimes(1);

        CoreEvents.trigger(secondEventName);
        expect(callback).toHaveBeenCalledTimes(2);

        listener.off();

        CoreEvents.trigger(eventName);
        CoreEvents.trigger(secondEventName);
        expect(callback).toHaveBeenCalledTimes(2);
    });

});
