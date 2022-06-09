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

import { CoreSubscriptions } from '@singletons/subscriptions';
import { BehaviorSubject, Subject } from 'rxjs';

describe('CoreSubscriptions singleton', () => {

    it('calls callbacks only once', async () => {
        // Test call success function.
        let subject = new Subject();
        let success = jest.fn();
        let error = jest.fn();
        CoreSubscriptions.once(subject, success, error);

        subject.next('foo');
        expect(success).toHaveBeenCalledTimes(1);
        expect(success).toHaveBeenCalledWith('foo');

        subject.next('bar');
        subject.error('foo');
        expect(success).toHaveBeenCalledTimes(1);
        expect(error).not.toHaveBeenCalled();

        // Test call error function.
        subject = new Subject(); // Create a new Subject because the previous one already has an error.
        success = jest.fn();
        CoreSubscriptions.once(subject, success, error);

        subject.error('foo');
        expect(error).toHaveBeenCalledWith('foo');

        subject.next('foo');
        subject.error('bar');
        expect(error).toHaveBeenCalledTimes(1);
        expect(success).not.toHaveBeenCalled();

        // Test with behaviour subject (success callback called immediately).
        const beaviourSubject = new BehaviorSubject('foo');
        error = jest.fn();
        CoreSubscriptions.once(beaviourSubject, success, error);

        expect(success).toHaveBeenCalledWith('foo');

        beaviourSubject.next('bar');
        beaviourSubject.error('foo');
        expect(success).toHaveBeenCalledTimes(1);
        expect(error).not.toHaveBeenCalled();
    });

});
