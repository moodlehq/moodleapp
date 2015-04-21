// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview Performance test.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

// ydn.debug.log('ydn.db', 'finest');

(function() {

  var schema = {
    stores: [
      {
        name: 'st1',
        autoIncrement: true,
        indexes: [{name: 'id'}]
      }, {
        name: 'st2',
        autoIncrement: true,
        indexes: [{name: 'id'}]
      }, {
        name: 'st3',
        autoIncrement: true,
        indexes: [{name: 'id'}]
      }
    ]
  };
  var options = {size: 200 * 1024 * 1024};
  if (/websql/.test(location.hash)) {
    options.mechanisms = ['websql'];
  } else if (/indexeddb/.test(location.hash)) {
    options.mechanisms = ['indexeddb'];
  } else if (/localstorage/.test(location.hash)) {
    options.mechanisms = ['localstorage'];
  } else if (/memory/.test(location.hash)) {
    options.mechanisms = ['memory'];
  }
  var db = new ydn.db.Storage('pref-test-multi-1', schema, options);

  /**
   * Return a random store name.
   * @return {string} a store name.
   */
  var getRandStore = function() {
    var idx = (schema.stores.length * Math.random()) | 0;
    return schema.stores[idx].name;
  };

  var testPutTightSmall = function(db, data, onComplete, n) {
    var cnt = 0;
    var small_data = {foo: 'bar'};
    for (var i = 0; i < n; i++) {
      var req = db.put(getRandStore(), small_data);
      req.always(function() {
        cnt++;
        if (cnt == n) {
          onComplete(); // timer end
        }
      });
    }
  };

  var testPutSmall = function(db, data, onComplete, n) {
    var small_data = {foo: 'bar'};
    var test = function(i) {
      var req = db.put(getRandStore(), small_data);
      i++;
      req.always(function(x) {
        if (i == n) {
          onComplete(); // timer end
        } else {
          test(i);
        }
      });
    };
    test(0);
  };


  var initClear = function(cb) {
    db.clear().always(function() {
      cb();
    });
  };


  var initPutArraySmall = function(cb, n) {
    // small data put test
    var data = [];
    for (var i = 0; i < n; i++) {
      data[i] = {foo: 'bar'};
    }
    db.clear().always(function() {
      cb(data);
    });
  };


  var testPutArraySmall = function(db, data, onComplete, n) {
    var req = db.put('st', data);
    req.always(function() {
      // make sure it complete write
      db.get('st', 1).always(function() {
        onComplete();
      });
    });
  };


  var longProcess = function(db, data, onComplete, nOp, nData) {
    var st = getRandStore();
    var doTest = function(i) {
      i++;
      if (Math.random() > 0.8) {
        st = getRandStore();
      }
      var r = Math.random();
      var req;
      if (r < 0.3) {
        req = db.put(st, {foo: 'bar', id: Math.random()});
      } else if (r < 0.7) {
        var k = ydn.db.KeyRange.lowerBound(Math.random());
        req = db.values(st, 'id', k, 1);
      } else {
        var id = (nData * 3 * Math.random()) | 0;
        req = db.remove(st, id);
      }
      req.always(function(x) {
        if (i == nOp) {
          onComplete(req.valueOf());
        } else {
          doTest(i);
        }
      }, req);
    };
    doTest(0);
  };

  var initGetSmall = function(onComplete, n) {
    db.clear().always(function() {
      var data = [];
      for (var i = 0; i < n; i++) {
        data[i] = {foo: 'bar', id: Math.random()};
      }
      db.put('st1', data);
      db.put('st2', data);
      var req = db.put('st3', data);
      req.always(function() {
        onComplete();
      });
    });
  };


  var testGetTightSmall = function(db, start, onComplete, nOp, n) {
    // small data put test
    var cnt = 0;
    for (var i = 0; i < nOp; i++) {
      var r = ydn.db.KeyRange.lowerBound(Math.random());
      var req = db.values(getRandStore(), 'id', r, 1);
      req.always(function(x) {
        cnt++;
        if (cnt == nOp) {
          onComplete(); // timer end
        }
      }, req);
    }
  };


  var testGetSmall = function(db, start, onComplete, nOp, n) {
    // small data put test
    var test = function(i) {
      var r = ydn.db.KeyRange.lowerBound(Math.random());
      var req = db.values(getRandStore(), 'id', r, 1);
      i++;
      req.always(function(x) {
        if (i == nOp) {
          onComplete(); // timer end
        } else {
          test(i);
        }
      }, req);
    };
    test(0);
  };


  var testValuesKeyRangeSmall = function(db, start, onComplete, nOp, nData) {
    var safeRange = nData - nOp;
    var range = ydn.db.KeyRange.lowerBound(safeRange * Math.random());
    db.values('st', range, nOp).always(function(x) {
      onComplete();
      if (x.length != nOp) {
        throw new Error('result must have ' + nOp + ' objects, but found ' +
            x.length, x);
      }
    });
  };


  var testKeysKeyRangeSmall = function(db, start, onComplete, nOp, nData) {
    var safeRange = nData - nOp;
    var range = ydn.db.KeyRange.lowerBound(safeRange * Math.random());
    db.keys('st', range, nOp).always(function(x) {
      onComplete();
      if (x.length != nOp) {
        throw new Error('keys result must have ' + nOp + ' objects, but found ' +
            x.length, x);
      }
    });
  };


  var pref = Pref.newPref(db, 'multiple stores operation', 10);

  pref.addTest('Put', testPutSmall, initClear, 100);
  pref.addTest('Put tight loop', testPutTightSmall, initClear, 100);
  pref.addTest('Get, 100 records', testGetSmall, initGetSmall, 100);
  pref.addTest('Get tight loop, 100 records', testGetTightSmall, initGetSmall, 100);
  pref.addTest('Get, 10000 records', testGetSmall, initGetSmall, 100, 10000);
  pref.addTest('Get tight loop, 10000 records', testGetTightSmall, initGetSmall, 100, 10000);
  pref.addTest('Multi long process', longProcess, initClear, 100);

  Pref.run();

})();
