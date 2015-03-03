
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.db');
goog.require('ydn.debug');


var reachedFinalContinuation;


var setUp = function () {
  // ydn.debug.log('ydn.db', 'finest');

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};



var test_array_key = function () {

  var db_name = 'test_array_key';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr_objs = [
    {id: ['a', 'qs0'], value: 0, type: 'a'},
    {id: ['a', 'qs1'], value: 1, type: 'a'},
    {id: ['b', 'at2'], value: 2, type: 'b'},
    {id: ['b', 'bs1'], value: 3, type: 'b'},
    {id: ['c', 'bs2'], value: 4, type: 'c'},
    {id: ['c', 'bs3'], value: 5, type: 'c'},
    {id: ['c', 'st3'], value: 6, type: 'c'}
  ];
  db.put(store_name, arr_objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });

  var keys = arr_objs.map(function(x) {return x.id});
  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', keys, result);
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    5000); // maxTimeout


  db.keys(store_name).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};



var test_array_key_key_range = function () {


  var db_name = 'test_array_key_key_range';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr_objs = [
    {id: ['a', 'qs0'], value: 0, type: 'a'},
    {id: ['a', 'qs1'], value: 1, type: 'a'},
    {id: ['b', 'at2'], value: 2, type: 'b'},
    {id: ['b', 'bs1'], value: 3, type: 'b'},
    {id: ['c', 'bs2'], value: 4, type: 'c'},
    {id: ['c', 'bs3'], value: 5, type: 'c'},
    {id: ['c', 'st3'], value: 6, type: 'c'}
  ];
  db.put(store_name, arr_objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });


  var keys = arr_objs.slice(2, 4).map(function(x) {return x.id});
  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', keys, result);
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    5000); // maxTimeout

  var range = ydn.db.KeyRange.starts(['b']);
  db.keys(store_name, range).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};


var test_multiEntry = function () {

  var objs = [
    {id: 0, tag: ['a', 'b']},
    {id: 1, tag: ['e']},
    {id: 2, tag: ['a', 'c']},
    {id: 3, tag: []},
    {id: 4, tag: ['c']},
    {id: 5}
  ];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        keyPath: 'tag',
        // type: 'TEXT',
        multiEntry: true
      }]
    }]
  };
  var db = new ydn.db.crud.Storage('test-me', schema, options);

  db.clear('st');
  db.put('st', objs).addCallback(function(value) {
    console.log(db + ' ready', value);
  });

  // var tags = ['d', 'b', 'c', 'a', 'e'];
  // var exp_counts = [1, 3, 2, 4, 0];
  var tags = ['a', 'b', 'c', 'd'];
  var exp_keys = [[0, 2], [0], [2, 4], []];
  var exp_values = exp_keys.map(function(x) {
    return x.map(function(y) {
      return objs[y];
    });
  });
  var r_keys = [];
  var r_values = [];
  var total = tags.length * 2;
  var done = 0;

  waitForCondition(
      // Condition
      function () {
        return done == total;
      },
      // Continuation
      function () {

        for (var i = 0; i < tags.length; i++) {
          assertArrayEquals('keys for: ' + tags[i], exp_keys[i], r_keys[i]);
          assertArrayEquals('values for: ' + tags[i], exp_values[i], r_values[i]);
        }
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  var count_for = function (tag_name, idx) {
    var keyRange = ydn.db.KeyRange.only(tag_name);

    db.keys('st', 'tag', keyRange).addBoth(function (value) {
      // console.log(tag_name + ' ==> ' + JSON.stringify(value));
      r_keys[idx] = value;
      done++;
    });

    db.values('st', 'tag', keyRange).addBoth(function (value) {
      // console.log(tag_name + ' ==> ' + JSON.stringify(value));
      r_values[idx] = value;
      done++;
    });
  };

  for (var i = 0; i < tags.length; i++) {
    count_for(tags[i], i);
  }

};


var test_delete_multiEntry = function () {

  var objs = [
    {id: 0, tag: ['a', 'b']},
    {id: 1, tag: ['e']},
    {id: 2, tag: ['a', 'c']},
    {id: 3, tag: []},
    {id: 4, tag: ['c']},
    {id: 5}
  ];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        keyPath: 'tag',
        multiEntry: true
      }]
    }]
  };
  var db = new ydn.db.crud.Storage('test-me', schema, options);

  db.clear('st');
  db.put('st', objs).addCallback(function(value) {
    console.log(db + ' ready', value);
  });
  db.remove('st', 4);

  // var tags = ['d', 'b', 'c', 'a', 'e'];
  // var exp_counts = [1, 3, 2, 4, 0];
  var tags = ['a', 'c'];
  var exp_keys = [[0, 2], [2]];
  var exp_values = exp_keys.map(function(x) {
    return x.map(function(y) {
      return objs[y];
    });
  });
  var r_keys = [];
  var r_values = [];
  var total = tags.length * 2;
  var done = 0;

  waitForCondition(
      // Condition
      function () {
        return done == total;
      },
      // Continuation
      function () {

        for (var i = 0; i < tags.length; i++) {
          assertArrayEquals('keys for: ' + tags[i], exp_keys[i], r_keys[i]);
          assertArrayEquals('values for: ' + tags[i], exp_values[i], r_values[i]);
        }
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  var count_for = function (tag_name, idx) {
    var keyRange = ydn.db.KeyRange.only(tag_name);

    db.keys('st', 'tag', keyRange).addBoth(function (value) {
      // console.log(tag_name + ' ==> ' + JSON.stringify(value));
      r_keys[idx] = value;
      done++;
    });

    db.values('st', 'tag', keyRange).addBoth(function (value) {
      // console.log(tag_name + ' ==> ' + JSON.stringify(value));
      r_values[idx] = value;
      done++;
    });
  };

  for (var i = 0; i < tags.length; i++) {
    count_for(tags[i], i);
  }

};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



