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

import { CoreSubscriptions } from '@static/subscriptions';
import { BehaviorSubject, Subject } from 'rxjs';

describe('CoreSubscriptions singleton', () => {

    let subject: Subject<unknown>;
    let success: jest.Mock;
    let error: jest.Mock;
    let complete: jest.Mock;

    beforeEach(() => {
        subject = new Subject();
        success = jest.fn();
        error = jest.fn();
        complete = jest.fn();
    });

    it('calls success callback only once', async () => {
        CoreSubscriptions.once(subject, success, error, complete);

        subject.next('foo');
        expect(success).toHaveBeenCalledTimes(1);
        expect(success).toHaveBeenCalledWith('foo');

        subject.next('bar');
        subject.error('foo');
        expect(success).toHaveBeenCalledTimes(1);
        expect(error).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
    });

    it('calls error callback only once', async () => {
        CoreSubscriptions.once(subject, success, error, complete);

        subject.error('foo');
        expect(error).toHaveBeenCalledWith('foo');

        subject.next('foo');
        subject.error('bar');
        expect(error).toHaveBeenCalledTimes(1);
        expect(success).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
    });

    it('calls complete callback only once', async () => {
        CoreSubscriptions.once(subject, success, error, complete);

        subject.complete();
        expect(complete).toHaveBeenCalled();

        subject.next('foo');
        subject.error('bar');
        subject.complete();
        expect(complete).toHaveBeenCalledTimes(1);
        expect(success).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
    });

    it('calls success callback only once with behaviour subject', async () => {
        // Test with behaviour subject (success callback called immediately).
        const beaviourSubject = new BehaviorSubject('foo');
        CoreSubscriptions.once(beaviourSubject, success, error, complete);

        expect(success).toHaveBeenCalledWith('foo');

        beaviourSubject.next('bar');
        beaviourSubject.error('foo');
        expect(success).toHaveBeenCalledTimes(1);
        expect(error).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
    });

    it('allows unsubscribing from outside the once function', async () => {
        const subject = new Subject();
        const success = jest.fn();
        const error = jest.fn();

        const unsubscribe = CoreSubscriptions.once(subject, success, error);
        unsubscribe();

        subject.next('foo');
        subject.error('bar');
        expect(success).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
    });

});
