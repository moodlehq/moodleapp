
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



var test_primary_key_range = function () {

  var db_name = 'test_primary_key_range';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: -3, value: 'a0', x: 1, type: ['a', 'b'], remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', x: 3, type: ['a'], remark: 'test ' + Math.random()},
    {id: 1, value: 'ba', x: 2, type: ['b'], remark: 'test ' + Math.random()},
    {id: 3, value: 'bc', x: 2, type: ['b', 'c'], remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: ['c'], remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', type: ['c', 'a', 'b'], remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', x: 2, remark: 'test ' + Math.random()}
  ];
  db.put(store_name, objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });

  var get_done;
  var result;
  var keys = objs.slice(2, 5).map(function(x) {return x.id});

  waitForCondition(
    // Condition
    function () {
      return get_done;
    },
    // Continuation
    function () {
      assertArrayEquals(keys, result);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    5000); // maxTimeout

  var range = ydn.db.KeyRange.bound(1, 10);
  db.keys(store_name, range).addCallback(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    get_done = true;
  });

};

var test_by_index_key_range = function () {
  var db_name = 'test_by_index_key_range';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [{
        keyPath: 'value',
        type: 'TEXT'
      }]
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: -3, value: 'a0', x: 1, type: ['a', 'b'], remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', x: 3, type: ['a'], remark: 'test ' + Math.random()},
    {id: 1, value: 'ba', x: 2, type: ['b'], remark: 'test ' + Math.random()},
    {id: 3, value: 'bc', x: 2, type: ['b', 'c'], remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: ['c'], remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', type: ['c', 'a', 'b'], remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', x: 2, remark: 'test ' + Math.random()}
  ];
  db.put(store_name, objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });

  var get_done;
  var result;

  var keys = objs.slice(2, 5).map(function(x) {return x.id});

  waitForCondition(
    // Condition
    function () {
      return get_done;
    },
    // Continuation
    function () {
      assertArrayEquals('correct results', keys, result);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    5000); // maxTimeout

  var range = ydn.db.KeyRange.bound('ba', 'c');
  db.keys(store_name, 'value', range).addCallback(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    get_done = true;
  });

};



var test_keyrange_starts = function () {

  var db_name = 'test_keyrange_starts';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [{
        name: 'value',
        keyPath: 'value',
        type: 'TEXT'
      }]
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: -3, value: 'a0', x: 1, type: ['a', 'b'], remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', x: 3, type: ['a'], remark: 'test ' + Math.random()},
    {id: 1, value: 'ba', x: 2, type: ['b'], remark: 'test ' + Math.random()},
    {id: 3, value: 'bc', x: 2, type: ['b', 'c'], remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: ['c'], remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', type: ['c', 'a', 'b'], remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', x: 2, remark: 'test ' + Math.random()}
  ];
  db.put(store_name, objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });


  var keys = [];
  for (var i = 0; i < objs.length; i++) {
    if (goog.string.startsWith(objs[i].value, 'b')) {
      keys.push(objs[i].id);
    }
  }
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


  var range = ydn.db.KeyRange.starts('b');
  db.keys(store_name, 'value', range).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};


var test_string_key_starts = function () {

  var db_name = 'test_keyrange_starts';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'value',
      type: 'TEXT'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: -3, value: 'a0', x: 1, type: ['a', 'b'], remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', x: 3, type: ['a'], remark: 'test ' + Math.random()},
    {id: 1, value: 'ba', x: 2, type: ['b'], remark: 'test ' + Math.random()},
    {id: 3, value: 'bc', x: 2, type: ['b', 'c'], remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: ['c'], remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', type: ['c', 'a', 'b'], remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', x: 2, remark: 'test ' + Math.random()}
  ];
  db.put(store_name, objs).addCallback(function (value) {
    // console.log(db + ' ready.');
  });

  var keys = [];
  for (var i = 0; i < objs.length; i++) {
    if (goog.string.startsWith(objs[i].value, 'b')) {
      keys.push(objs[i].value);
    }
  }
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


  var range = ydn.db.KeyRange.starts('b');
  db.keys(store_name, range).addBoth(function (value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};



var test_list = function () {

  var db_name = 'test_list';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      indexes: [{
        keyPath: 'value'
      }]
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: 0, value: 2, type: 'a'},
    {id: 1, value: 3, type: 'a'},
    {id: 2, value: 2, type: 'b'},
    {id: 3, value: 2, type: 'b'},
    {id: 4, value: 1, type: 'c'},
    {id: 5, value: 1, type: 'c'},
    {id: 6, value: 3, type: 'c'}
  ];
  db.put(store_name, objs).addCallback(function(value) {
    // console.log(db + ' ready.');
  });

  var arr = objs.slice().sort(function(a, b) {
    return a.value > b.value ? 1 : a.value < b.value ? -1 :
        a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
  });
  var keys = arr.map(function(x) {return x.id;});
  var rev = arr.slice().reverse();
  var rev_keys = keys.slice().reverse();

  var done, value_1, value_2, key_1, key_2, u_value;

  waitForCondition(
      // Condition
      function() {
        return done;
      },
      // Continuation
      function() {
        assertArrayEquals('keys 1', keys.slice(1, 3), key_1);
        assertArrayEquals('value 1', arr.slice(1, 3), value_1);
        assertArrayEquals('unique value', [1, 2, 3], u_value);
        assertArrayEquals('key 2', rev_keys, key_2);
        assertArrayEquals('value 2', rev, value_2);
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
        reachedFinalContinuation = true;
      },
      100, // interval
      5000); // maxTimeout

  var mth = ydn.db.base.QueryMethod.LIST_PRIMARY_KEY;
  db.list(mth, 'st', 'value', null, 2, 1).addBoth(function(value) {
    key_1 = value;
  });
  db.list(mth, 'st', 'value', null, 10, 0, true).addBoth(function(value) {
    key_2 = value;
  });
  mth = ydn.db.base.QueryMethod.LIST_KEY;
  db.list(mth, 'st', 'value', null, 3, 0, false, true).addBoth(function(value) {
    u_value = value;
  });
  mth = ydn.db.base.QueryMethod.LIST_VALUE;
  db.list(mth, 'st', 'value', null, 2, 1).addBoth(function(value) {
    value_1 = value;
  });
  db.list(mth, 'st', 'value', null, 10, 0, true).addBoth(function(value) {
    value_2 = value;
    done = true;
  });
};


var test_list_resume = function () {

  var db_name = 'test_list_resume';
  var store_name = 'st';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      indexes: [{
        keyPath: 'value'
      }]
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: 0, value: 2, type: 'a'},
    {id: 1, value: 3, type: 'a'},
    {id: 2, value: 2, type: 'b'},
    {id: 3, value: 2, type: 'b'},
    {id: 4, value: 1, type: 'c'},
    {id: 5, value: 1, type: 'c'},
    {id: 6, value: 3, type: 'c'}
  ];
  db.put(store_name, objs).addCallback(function(value) {
    // console.log(db + ' ready.');
  });

  var arr = objs.slice().sort(function(a, b) {
    return a.value > b.value ? 1 : a.value < b.value ? -1 :
        a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
  });
  var keys = arr.map(function(x) {return x.id;});
  var rev = arr.slice().reverse();
  var rev_keys = keys.slice().reverse();

  var done, key_1, key_2, key_3, p_key_1, key_4;

  waitForCondition(
      // Condition
      function() {
        return done;
      },
      // Continuation
      function() {
        assertArrayEquals('p keys 1', [5, 6], p_key_1);
        assertArrayEquals('keys 1', keys.slice(2), key_1);
        assertArrayEquals('keys 2', keys.slice(4), key_2);
        assertArrayEquals('keys 3', keys.slice(5), key_3);
        assertArrayEquals('rev key', rev_keys.slice(4), key_4);
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
        reachedFinalContinuation = true;
      },
      100, // interval
      5000); // maxTimeout

  var mth = ydn.db.base.QueryMethod.LIST_PRIMARY_KEY;
  db.list(mth, 'st', undefined, null, 10, 0, false, false, [4])
      .addBoth(function(value) {
        p_key_1 = value;
      });
  db.list(mth, 'st', 'value', null, 10, 0, false, false, [1, 5])
      .addBoth(function(value) {
        key_1 = value;
      });
  db.list(mth, 'st', 'value', null, 10, 0, false, false, [2, 2])
      .addBoth(function(value) {
        key_2 = value;
      });
  db.list(mth, 'st', 'value', null, 10, 0, false, false, [2, undefined])
      .addBoth(function(value) {
        key_3 = value;
      });
  db.list(mth, 'st', 'value', null, 10, 0, true, false, [2, 2])
      .addBoth(function(value) {
        key_4 = value;
        done = true;
      });
};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



