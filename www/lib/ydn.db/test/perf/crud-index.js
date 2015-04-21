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
        name: 'big',
        autoIncrement: true,
        indexes: [
          {
            name: 'n',
            type: 'NUMERIC'
          }, {
            name: 'uid',
            type: 'NUMERIC'
          }, {
            name: 't',
            type: 'TEXT'
          }, {
            name: 'm',
            multiEntry: true
          }]
      }]
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
  var db2 = new ydn.db.Storage('pref-test-2', schema, options);



  var initClear2 = function(cb) {
    db2.clear().always(function() {
      cb();
    });
  };


  var genBigData = function(n) {
    var long = (new Array(1000)).join(
        (new Array(10)).join('abcdefghijklmnopuqstubc'));
    var data = [];
    for (var i = 0; i < n; i++) {
      var arr = [];
      for (var j = 0; j < 16; j++) {
        arr[j] = Math.random();
      }
      data[i] = {
        load: long,
        n: Math.random(),
        uid: (+new Date()) + Math.random(),
        m: arr,
        t: Math.random().toString(36).slice(2)
      };
    }
    // console.log(n + ' big data generated');
    return data;
  };


  var testPutBigTight = function(db, data, onComplete, n) {
    var cnt = 0;
    for (var i = 0; i < n; i++) {
    var req = db2.put('big', data[i]);
      req.then(function() {
        cnt++;
        if (cnt == n) {
          onComplete(); // timer end
        }
      }, function(e) {
        throw e;
      });
    }
  };


  var testPutBig = function(db, data, onComplete, n) {
    var test = function(i) {
      var req = db2.put('big', data[i]);
      i++;
      req.then(function(x) {
        if (i == n) {
          onComplete(); // timer end
        } else {
          test(i);
        }
      }, function(e) {
        throw e;
      });
    };
    test(0);
  };


  var testPutArray = function(db, data, onComplete, n) {
    var req = db2.put('big', data);
    req.then(function(keys) {
      onComplete(); // timer end
    }, function(e) {
      console.log(e);
      throw e;
    });
  };

  var initIndexData = function(cb, n) {
    var data = genBigData(n);

    db2.clear('big').always(function() {
      var req = db2.put('big', data);
      req.always(function() {
        db2.keys('big', null, 1).always(function(x) {
          cb(x[0]); // get the first key
        });
      });
    });

  };


  var valuesIndexKeyRangeBig = function(db, start, onComplete, nOp, nData) {
    var cnt = 0;
    for (var i = 0; i < nOp; i++) {
      var range = ydn.db.KeyRange.lowerBound(Math.random() * nData);
      db2.values('big', 'n', range, 1).always(function(x) {
        cnt++;
        if (cnt == nOp) {
          onComplete(); // timer end
        } else {
          // console.log(x); // ok
        }
      });
    }
  };


  var keysIndexKeyRangeBig = function(db, start, onComplete, nOp, nData) {
    var cnt = 0;
    for (var i = 0; i < nOp; i++) {
      var range = ydn.db.KeyRange.lowerBound(nData * Math.random());
      db2.keys('big', 'n', range, 1).always(function(x) {
        cnt++;
        if (cnt == nOp) {
          onComplete(); // timer end
        } else {
          // console.log(x); // ok
        }
      });
    }
  };

  var valuesIndexKeyRangeBigLimit5 = function(db, start, onComplete, n, nData) {
    var cnt = 0;
    for (var i = 0; i < n; i++) {
      var range = ydn.db.KeyRange.lowerBound(nData * Math.random());
      db2.values('big', 'n', range, 10).always(function(x) {
        cnt++;
        if (cnt == n) {
          onComplete(); // timer end
        } else {
          // console.log(x); // ok
        }
      });
    }
  };


  var keysIndexKeyRangeBigLimit5 = function(db, start, onComplete, n, nData) {
    var cnt = 0;
    for (var i = 0; i < n; i++) {
      var range = ydn.db.KeyRange.lowerBound(nData * Math.random());
      db2.keys('big', 'n', range, 10).always(function(x) {
        cnt++;
        if (cnt == n) {
          onComplete(); // timer end
        } else {
          // console.log(x); // ok
        }
      });
    }
  };

  var valuesIndexIterBig = function(db, start, onComplete, n) {
    for (var i = 0; i < n; i++) {
      var iter = ydn.db.IndexValueIterator.where('big', 'n', '>', Math.random());
      db2.values(iter, 1).always(function(x) {
        if (i == n - 1) {
          onComplete(); // timer end
        } else {

        }
      });
    }
  };


  var pref = Pref.newPref(db2, 'large object with indexes');

  var t = pref.addTest('Put', testPutBig, initClear2, 20);
  t.prepareData = function() {
    return genBigData(20);
  };
  t = pref.addTest('Put, tight loop', testPutBigTight, initClear2, 20);
  t.prepareData = function() {
    return genBigData(20);
  };
  t = pref.addTest('Put, array', testPutArray, initClear2, 20);
  t.prepareData = function() {
    return genBigData(20);
  };

  pref.addTest('Keys index key range, limit 1, 1000 records', keysIndexKeyRangeBig, initIndexData, 20, 1000);
  pref.addTest('Values index key range, limit 1, 1000 records', valuesIndexKeyRangeBig, null, 20, 1000);
  pref.addTest('Values index key range, limit 10, 1000 records', valuesIndexKeyRangeBigLimit5, null, 20, 1000);
  pref.addTest('Keys index key range, limit 10, 1000 records', keysIndexKeyRangeBigLimit5, null, 20, 1000);

  Pref.run();

})();
