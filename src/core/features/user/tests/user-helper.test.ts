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

import { overrideTranslations } from '@/testing/utils';
import { CoreUserHelper } from '../services/user-helper';

describe('getUserInitials', () => {
  beforeEach(() => {
    overrideTranslations({
      'core.user.fullnamedisplay': '{{$a.firstname}} {{$a.lastname}}',
    });
  });

  it('should return initials based on firstname and lastname', () => {
    const parts = {
      firstname: 'John',
      lastname: 'Doe',
      fullname: '',
    };

    let result = CoreUserHelper.getUserInitials(parts);

    expect(result).toEqual('JD');

    overrideTranslations({
      'core.user.fullnamedisplay': '{{$a.lastname}} {{$a.firstname}}',
    });

    result = CoreUserHelper.getUserInitials(parts);

    expect(result).toEqual('DJ');

    overrideTranslations({
      'core.user.fullnamedisplay': '{{$a.lastname}}',
    });

    result = CoreUserHelper.getUserInitials(parts);

    expect(result).toEqual('D');

    overrideTranslations({
      'core.user.fullnamedisplay': '{{$a.firstname}}',
    });

    result = CoreUserHelper.getUserInitials(parts);

    expect(result).toEqual('J');

    overrideTranslations({
      'core.user.fullnamedisplay': '{{$a.noname}}',
    });

    result = CoreUserHelper.getUserInitials(parts);

    expect(result).toEqual('UNK');
  });

  it('should return initials directly if initials field is provided', () => {
    const parts = {
      firstname: 'John',
      lastname: 'Doe',
      fullname: 'John Doe',
      initials: 'AB',
    };

    const result = CoreUserHelper.getUserInitials(parts);

    expect(result).toEqual('AB');
  });

  it('should return initials based on fullname if firstname and lastname are missing', () => {
    let parts: { firstname?: string; lastname?: string; fullname?: string } = {
      firstname: '',
      lastname: '',
      fullname: 'John Doe',
    };

    let result = CoreUserHelper.getUserInitials(parts);

    expect(result).toEqual('JD');

    parts = {
        firstname: '',
        lastname: '',
        fullname: 'John Fitzgerald Doe',
    };

    result = CoreUserHelper.getUserInitials(parts);

    expect(result).toEqual('JD');

    overrideTranslations({
      'core.user.fullnamedisplay': '{{$a.lastname}} {{$a.firstname}}',
    });

    result = CoreUserHelper.getUserInitials(parts);

    expect(result).toEqual('DJ');
  });

  it('should return UNK string if empty parts', () => {
    const parts = {
      firstname: '',
      lastname: '',
      fullname: '',
    };

    let result = CoreUserHelper.getUserInitials(parts);

    expect(result).toEqual('UNK');

    result = CoreUserHelper.getUserInitials({});

    expect(result).toEqual('UNK');
  });
});
