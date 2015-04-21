
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.debug');
goog.require('ydn.db.core.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, debug_console, schema, db, objs;
var store_name = 't1';
var db_name = 'test_cursor_4';

var setUp = function () {
   // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.core.req.IDBCursor.DEBUG = true;
 // ydn.db.core.req.WebsqlCursor.DEBUG = true;
  //ydn.db.con.simple.Store.DEBUG = true;
  //ydn.db.core.DbOperator.DEBUG = true;
  //ydn.db.core.req.SimpleStore.DEBUG = true;
  //ydn.db.core.req.SimpleCursor.DEBUG = true;

  reachedFinalContinuation = false;

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);

};


var df_cnt = 0;
var load_default = function(cb) {
  var db_name = 'test-df-' + (df_cnt++);
  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.TEXT, true);
  var typeIndex = new ydn.db.schema.Index('type', ydn.db.schema.DataType.TEXT, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.INTEGER, [indexSchema, typeIndex]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  var db = new ydn.db.core.Storage(db_name, schema, options);

  objs = [
    {id: -3, value: 'ba', type: 'a', remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', type: 'a', remark: 'test ' + Math.random()},
    {id: 1, value: 'b', type: 'b', remark: 'test ' + Math.random()},
    {id: 3, value: 'b1', type: 'b', remark: 'test ' + Math.random()},
    {id: 10, value: 'c1', type: 'c', remark: 'test ' + Math.random()},
    {id: 11, value: 'a3', type: 'c', remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  if (cb) {
    cb(db);
  }

  return db;
};

var getData = function() {
  var objs = [
        {id:'qs0', value: 0, tag: ['a', 'b']},
        {id:'qs1', value: 1, tag: 'a'},
        {id:'at2', value: 2, tag: ['a', 'b']},
        {id:'bs1', value: 3, tag: 'b'},
        {id:'bs2', value: 4, tag: ['a', 'c', 'd']},
        {id:'bs3', value: 5, tag: ['c']},
        {id:'st3', value: 6}
      ];
  return JSON.parse(JSON.stringify(objs));
};


var df2_cnt = 0;
var load_default2 = function() {

  var db_name = 'index-test2-' + (df2_cnt++);
  var indexSchema = new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT, false, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.TEXT, [indexSchema]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  var db = new ydn.db.core.Storage(db_name, schema, options);

  var objs = getData();
  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  return db;
};



var test_list_store = function () {

  var done;
  var result;
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertEquals('length', objs.length, result.length);
        assertArrayEquals(objs, result);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name);

  load_default(function (db) {
    db.values(q).addBoth(function (value) {
      //console.log(db + ' fetch value: ' + JSON.stringify(value));
      result = value;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });

};


var test_getByIterator = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals(objs[1], result);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  var range = new ydn.db.KeyRange.only('a2');
  var q = new ydn.db.IndexValueIterator(store_name, 'value', range);

  db.get(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_listByIterator = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', objs, result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);

  db.values(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};



var test_listByIterator_key_range = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertObjectEquals('result', objs.slice(2, 5), result);
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  var kr = ydn.db.KeyRange.bound(1, 10);
  var q = new ydn.db.ValueIterator(store_name, kr);

  db.values(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_listByIterator_resume = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('first result', objs.slice(0, 3), result);

      done = false;
      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          assertObjectEquals('second result', objs.slice(3, 6), result);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db.getName(), db.getType());
          db.close();
        },
        100, // interval
        1000); // maxTimeout

      db.values(q, 3).addBoth(function (value) {
        //console.log(db + ' fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);

  db.values(q, 3).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};



var test_listBy_index_ValueIterator = function () {
  var db = load_default();
  var done;
  var result;
  var exp_result = objs.sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      console.log(result);
      assertObjectEquals('result', exp_result, result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.IndexValueIterator(store_name, 'value');

  db.values(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_listBy_index_ValueIterator_resume = function () {
  var db = load_default();
  var done;
  var result, result2;
  var exp_result = objs.sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      // console.log(result)
      assertObjectEquals('first result', exp_result.slice(0, 3), result);

      done = false;
      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          // console.log(result2)
          assertObjectEquals('second result', exp_result.slice(3, 6), result2);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db.getName(), db.getType());
          db.close();
        },
        100, // interval
        1000); // maxTimeout

      db.values(q, 3).addBoth(function (value) {
        //console.log(db + ' fetch value: ' + JSON.stringify(value));
        result2 = value;
        done = true;
      });
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.IndexValueIterator(store_name, 'value');

  db.values(q, 3).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};


var test_listByKeyIterator = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.id;
  });
  // keys.sort();
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', keys, result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.KeyIterator(store_name);

  db.values(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};




var test_listByKeyIterator_resume = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.id;
  });
  // keys.sort();
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('first result', keys.slice(0, 3), result);

      done = false;
      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          assertObjectEquals('second result', keys.slice(3, 6), result);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db.getName(), db.getType());
          db.close();
        },
        100, // interval
        1000); // maxTimeout

      db.values(q, 3).addBoth(function (value) {
        //console.log(db + ' fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.KeyIterator(store_name);

  db.values(q, 3).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};

var test_listByIterator_limit = function () {
  var db = load_default();
  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', objs.slice(0, 3), result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);

  db.values(q, 3).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};



var test_keysBy_ValueIterator = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.id;
  });
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', keys, result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);

  db.keys(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};

var test_keysBy_ValueIterator_resume = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.id;
  });
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('first result', keys.slice(0, 3), result);

      done = false;
      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          assertObjectEquals('second result', keys.slice(3, 6), result);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db.getName(), db.getType());
          db.close();
        },
        100, // interval
        1000); // maxTimeout

      db.keys(q, 3).addBoth(function (value) {
        // console.log(value);
        result = value;
        done = true;
      });
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.ValueIterator(store_name);
  // db.keys(q).addBoth(function (value) {console.log(value);});
  db.keys(q, 3).addBoth(function (value) {
    // console.log(value);
    result = value;
    done = true;
  });
};


var test_keysBy_index_ValueIterator = function() {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.value;
  });
  keys.sort();
  waitForCondition(
      // Condition
      function() {
        return done;
      },
      // Continuation
      function() {
        assertObjectEquals('result', keys, result);
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  var q = new ydn.db.IndexValueIterator(store_name, 'value');

  db.keys(q).addBoth(function(value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};

var test_keys_by_ValueIndexIterator = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.type;
  });
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', keys, result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.IndexValueIterator(store_name, 'type');

  db.keys(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};

var test_keys_by_KeyIndexIterator = function () {
  var db = load_default();
  var done;
  var result;
  var keys = objs.map(function(x) {
    return x.type;
  });
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', keys, result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.IndexIterator(store_name, 'type');

  db.keys(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};

var test_keys_by_KeyIndexIterator_unqiue = function () {
  var db = load_default();
  var done;
  var result;
  var keys = [];
  for (var i = 0; i < objs.length; i++) {
    var value = objs[i].value;
    if (keys.indexOf(value) == -1) {
      keys.push(value);
    }
  }
  keys.sort();
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', keys, result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.IndexIterator(store_name, 'value', null, false, true);

  db.keys(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



