

goog.require('goog.testing.jsunit');
goog.require('ydn.debug');
goog.require('ydn.db.core.Storage');



var reachedFinalContinuation, db;

var store_name = 'st';
var objs = [
  {id:'qs0', value: 0, x: 1, tag: ['a', 'b']},
  {id:'qs1', value: 1, x: 2, tag: ['a']},
  {id:'at2', value: 2, x: 3, tag: ['a', 'b']},
  {id:'bs1', value: 3, x: 6, tag: ['b']},
  {id:'bs2', value: 4, x: 14, tag: ['a', 'c', 'd']},
  {id:'bs3', value: 5, x: 111, tag: ['c']},
  {id:'st3', value: 6, x: 600}
];

var obj_schema = {
  stores: [
    {
      name: store_name,
      keyPath: 'id',
      type: 'TEXT',
      indexes: [{
        name: 'tag',
        type: 'TEXT',
        multiEntry: true
      }, {
        name: 'value',
        type: 'NUMERIC'
      }, {
        name: 'x',
        type: 'NUMERIC'
      }]
    }
  ]
};

var setUpPage = function() {

  var db_name = 'scan-test';
  db = new ydn.db.core.Storage(db_name, obj_schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });

}

var setUp = function() {
  objs = [
    {id:'qs0', value: 0, x: 1, tag: ['a', 'b']},
    {id:'qs1', value: 1, x: 2, tag: ['a']},
    {id:'at2', value: 2, x: 3, tag: ['a', 'b']},
    {id:'bs1', value: 3, x: 6, tag: ['b']},
    {id:'bs2', value: 4, x: 14, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, x: 111, tag: ['c']},
    {id:'st3', value: 6, x: 600}
  ];
  reachedFinalContinuation = false;
};


var tearDown = function() {

  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


tearDownPage = function() {
  ydn.db.deleteDatabase(db.getName(), db.getType());
  db.close();
};




var db_single_cnt = 0;
var scan_key_single_test = function (q, actual_keys, actual_index_keys) {

  var done;
  var streaming_keys = [];
  var streaming_values_keys = [];

  var db_name = 'scan_key_single_test' + (db_single_cnt++);

  var db = new ydn.db.core.Storage(db_name, obj_schema, options);

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('streaming keys', actual_keys, streaming_keys);
      //console.log([actual_index_keys, streaming_index_keys]);
      assertArrayEquals('streaming values', actual_index_keys, streaming_values_keys);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  var req = db.scan(function join_algo(keys, values) {
    //console.log(JSON.stringify([keys, values]));
    if (!goog.isDef(keys[0])) {
      return [];
    }

    streaming_keys.push(keys[0]);
    streaming_values_keys.push(values[0]);
    return [true]; // continue iteration
  }, [q]);

  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });

};

var test_scan_key_iterator = function () {

  var actual_keys = objs.map(function(x) {return x.id;});
  actual_keys.sort();
  var actual_index_keys = actual_keys;
  var q = new ydn.db.KeyIterator(store_name);
  scan_key_single_test(q, actual_keys, actual_index_keys);

};

var test_scan_value_iterator = function () {

  objs.sort(function(a, b) {
    return a.id > b.id ? 1 : -1;
  });
  var actual_keys = objs.map(function(x) {return x.id;});

  var q = new ydn.db.ValueIterator(store_name);
  scan_key_single_test(q, actual_keys, objs);

};

var test_scan_index_key_iterator = function () {

  objs.sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });
  var actual_keys = objs.map(function(x) {return x.value;});
  var actual_values = objs.map(function(x) {
    return x.id;
  });
  var q = new ydn.db.IndexIterator(store_name, 'value');
  scan_key_single_test(q, actual_keys, actual_values);

};


var test_scan_index_key_iterator_reverse = function () {

  objs.sort(function(a, b) {
    return a.value > b.value ? -1 : 1;
  });
  var actual_keys = objs.map(function(x) {return x.value;});
  var actual_index_keys = objs.map(function(x) {return x.id;});
  var q = new ydn.db.IndexIterator(store_name, 'value', null, true);

  scan_key_single_test(q, actual_keys, actual_index_keys);

};


var test_scan_key_dual = function () {

  var actual_keys = objs.map(function(x) {return x.id;});
  var actual_index_key_0 = objs.map(function(x) {return x.value;});
  var actual_index_key_1 = objs.map(function(x) {return x.x;});

  var done;
  var streaming_keys = [];
  var streaming_index_key_0 = [];
  var streaming_index_key_1 = [];

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('streaming key', actual_keys, streaming_keys);
      assertArrayEquals('streaming index 0', actual_index_key_0, streaming_index_key_0);
      assertArrayEquals('streaming index 1', actual_index_key_1, streaming_index_key_1);

      reachedFinalContinuation = true;

    },
    100, // interval
    1000); // maxTimeout

  var q1 = new ydn.db.IndexIterator(store_name, 'value');
  var q2 = new ydn.db.IndexIterator(store_name, 'x');

  var req = db.scan(function join_algo (keys, primary_keys) {
    // console.log(['receiving ', JSON.stringify(keys), JSON.stringify(primary_keys)]);
    if (goog.isDefAndNotNull(keys[0])) {
      streaming_keys.push(primary_keys[0]);
      streaming_index_key_0.push(keys[0]);
      streaming_index_key_1.push(keys[1]);
    }

    return [
      goog.isDefAndNotNull(keys[0]) ? true : undefined,
      goog.isDefAndNotNull(keys[1]) ? true : undefined]; // continue iteration
  }, [q1, q2]);

  req.addBoth(function (result) {
    //console.log(result);
    done = true;
  });

};


var test_scan_cursor_resume = function() {

  var done;
  var values = [];
  var actual_values = [0, 1, 2, 3];
  var q = new ydn.db.IndexIterator(store_name, 'value');

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('first half values', actual_values, values);
      console.log('first half passed');

      done = false;
      values = [];
      actual_values = [4, 5, 6];

      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          assertArrayEquals('second half values', actual_values, values);

          reachedFinalContinuation = true;
        },
        100, // interval
        1000); // maxTimeout

      // pick up where letf off.
      var req = db.scan(function (keys, v) {
        if (goog.isDef(keys[0])) {
          values.push(keys[0]);
          return [true];
        } else {
          return [];
        }
      }, [q]);
      req.addCallback(function (result) {
        done = true;
      });
      req.addErrback(function (e) {
        console.log(e);
        done = true;
      });
    },
    100, // interval
    1000); // maxTimeout

  var req = db.scan(function (keys, v) {
    //console.log([keys, v]);
    if (goog.isDef(keys[0])) {
      values.push(keys[0]);
      // scan until value is 3.
      return [keys[0] < 3 ? true : undefined];
    } else {
      return [];
    }
  }, [q]);
  req.addCallback(function () {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);

