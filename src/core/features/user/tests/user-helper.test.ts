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

import { CoreUserHelper } from '../services/user-helper';

describe('getUserInitialsFromParts', () => {
  it('should return initials based on firstname and lastname', async () => {
    const parts = {
      firstname: 'John',
      lastname: 'Doe',
      fullname: '',
      userId: 123,
    };

    const result = await CoreUserHelper.getUserInitialsFromParts(parts);

    expect(result).toEqual('JD');
  });

  it('should return initials based on fullname if firstname and lastname are missing', async () => {
    let parts = {
      firstname: '',
      lastname: '',
      fullname: 'John Doe',
      userId: 123,
    };

    let result = await CoreUserHelper.getUserInitialsFromParts(parts);

    expect(result).toEqual('JD');

    parts = {
        firstname: '',
        lastname: '',
        fullname: 'John Fitzgerald Doe',
        userId: 123,
    };

    result = await CoreUserHelper.getUserInitialsFromParts(parts);

    expect(result).toEqual('JD');
  });

  it('should return UNK string if empty parts', async () => {
    const parts = {
      firstname: '',
      lastname: '',
      fullname: '',
    };

    let result = await CoreUserHelper.getUserInitialsFromParts(parts);

    expect(result).toEqual('UNK');

    result = await CoreUserHelper.getUserInitialsFromParts({});

    expect(result).toEqual('UNK');
  });
});
