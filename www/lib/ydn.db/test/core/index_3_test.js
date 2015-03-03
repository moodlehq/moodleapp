
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db');
goog.require('ydn.debug');

goog.require('ydn.db.core.Storage');


var reachedFinalContinuation, schema, objs;
var store_name = 't1';
var db_name = 'test_index_2';

var setUp = function () {

  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.core.req.SimpleStore.DEBUG  = true;
  // ydn.db.con.simple.Store.DEBUG = true;
  // ydn.db.con.WebSql.DEBUG = true;
  // ydn.db.crud.req.WebSql.DEBUG = true;
  //ydn.db.core.req.WebSql.DEBUG = true;
  //ydn.db.core.req.WebsqlCursor.DEBUG = true;
  //ydn.db.Cursor.DEBUG = true;

  reachedFinalContinuation = false;
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};



var load_default_cnt = 0;
var load_default = function(cb) {
  var db_name = 'test-default' + (load_default_cnt++);
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
    {id: 10, value: 'c', type: 'c', remark: 'test ' + Math.random()},
    {id: 11, value: 'a3', type: 'c', remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
    cb(db);
  });
  return objs;
};





var test_multiEntry_simple = function () {

  // ydn.db.crud.req.WebSql.DEBUG = true;

  var db_name = 'test_multiEntry_simple_1';
  var store_name = 's1';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'TEXT',
      indexes: [{
        name: 'tag',
        type: 'TEXT',
        multiEntry: true
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);


  var objs = [
    {id:'qs0', value: 0, tag: ['a', 'b']},
    {id:'qs1', value: 1, tag: ['a']}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  // var tags = ['d', 'b', 'c', 'a', 'e'];
  // var exp_counts = [1, 3, 2, 4, 0];
  var tags = ['b'];
  var exp_counts = [1];

  var counts = [];
  var total = tags.length;
  var done = 0;

  waitForCondition(
      // Condition
      function () {
        return done == total;
      },
      // Continuation
      function () {

        for (var i = 0; i < total; i++) {
          assertEquals('for tag: ' + tags[i] + ' count', exp_counts[i], counts[i]);
        }
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout


  var count_for = function (tag_name, idx) {
    var keyRange = ydn.db.KeyRange.only(tag_name);

    db.values(store_name, 'tag', keyRange).addBoth(function (value) {
      //console.log(tag_name + ' ==> ' + JSON.stringify(value));
      counts[idx] = value.length;
      done++;
    });
  };

  for (var i = 0; i < total; i++) {
    count_for(tags[i], i);
  }

};


var test_multiEntry = function () {

  // ydn.db.crud.req.WebSql.DEBUG = true;

  var db_name = 'test_multiEntry_1';
  var store_name = 's1';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'TEXT',
      indexes: [{
        name: 'tag',
        type: 'TEXT',
        multiEntry: true
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);


  var objs = [
    {id:'qs0', value: 0, tag: ['a', 'b']},
    {id:'qs1', value: 1, tag: ['a']},
    {id:'at2', value: 2, tag: ['a', 'b']},
    {id:'bs1', value: 3, tag: ['b']},
    {id:'bs2', value: 4, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, tag: ['c']},
    {id:'st3', value: 6, tag: ['x']}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  // var tags = ['d', 'b', 'c', 'a', 'e'];
  // var exp_counts = [1, 3, 2, 4, 0];
  var tags = ['d'];
  var exp_counts = [1];

  var counts = [];
  var total = tags.length;
  var done = 0;

  waitForCondition(
      // Condition
      function () {
        return done == total;
      },
      // Continuation
      function () {

        for (var i = 0; i < total; i++) {
          assertEquals('for tag: ' + tags[i] + ' count', exp_counts[i], counts[i]);
        }
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout


  var count_for = function (tag_name, idx) {
    var keyRange = ydn.db.KeyRange.only(tag_name);

    db.values(store_name, 'tag', keyRange).addBoth(function (value) {
      //console.log(tag_name + ' ==> ' + JSON.stringify(value));
      counts[idx] = value.length;
      done++;
    });
  };

  for (var i = 0; i < total; i++) {
    count_for(tags[i], i);
  }

};


var test_multiEntry_text = function () {

  // ydn.db.crud.req.WebSql.DEBUG = true;

  var db_name = 'test_multiEntry_text_2';
  var store_name = 's1';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      indexes: [{
        name: 'tag',
        multiEntry: true,
        type: 'TEXT'
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);

  var objs = [
    {id:'qs0', value: 0, tag: ['a', 'b']},
    {id:'qs1', value: 1, tag: ['a']},
    {id:'at2', value: 2, tag: ['a', 'b']},
    {id:'bs1', value: 3, tag: ['b']},
    {id:'bs2', value: 4, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, tag: ['c']},
    {id:'st3', value: 6, tag: ['x']}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  var signle_test = true;
  var tags = ['d', 'b', 'c', 'a', 'e'];
  var exp_counts = [1, 3, 2, 4, 0];
  if (signle_test) {
    tags = ['d'];
    exp_counts = [1];

  } else {
  }

  var counts = [];
  var total = tags.length;
  var done = 0;

  waitForCondition(
    // Condition
    function () {
      return done == total;
    },
    // Continuation
    function () {

      for (var i = 0; i < total; i++) {
        assertEquals('for tag: ' + tags[i] + ' count', exp_counts[i], counts[i]);
      }
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  var count_for = function (tag_name, idx) {
    var keyRange = ydn.db.KeyRange.only(tag_name);

    db.values(store_name, 'tag', keyRange).addBoth(function (value) {
      console.log(tag_name + '[' + tags[idx] + '] ==> ' + JSON.stringify(value));
      counts[idx] = value.length;
      done++;
    });
  };

  for (var i = 0; i < total; i++) {
    count_for(tags[i], i);
  }

};





var test_multiEntry_unique = function () {

  var db_name = 'test_multiEntry_unique';
  var store_name = 's1';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [{
        name: 'tag',
        multiEntry: true,
        type: 'TEXT'
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);

  var objs = [
    {id: 1, value: Math.random(), tag: ['a', 'b']},
    {id: 2, value: Math.random(), tag: ['b']},
    {id: 3, value: Math.random(), tag: ['c']}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {

      assertArrayEquals('unique tag', ['a', 'b', 'c'], result);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  var iter = new ydn.db.IndexIterator(store_name, 'tag', null, false, true);
  db.keys(iter).addBoth(function (x) {
    result = x;
    done = true;
  });

};


var compound_index_data = [
  {
    id: 1,
    label1: 'a', label2: 'a'
  }, {
    id: 2,
    label1: 'a', label2: 'b'
  }, {
    id: 3,
    label1: 'b', label2: 'a'
  }, {
    id: 4,
    label1: 'b', label2: 'b'
  }
];

var compound_index_schema = {
  stores: [{
    name: 'st1',
    keyPath: 'id',
    type: 'INTEGER',
    indexes: [
      {
        name: 'lb12',
        keyPath: ['label1', 'label2']
      }
    ]
  }]
};



var comp_cnt = 0;
var load_compound_index_db = function (cb) {
  var compound_index_db_name = 'test-cmp' + (comp_cnt++);
  var db = new ydn.db.crud.Storage(compound_index_db_name, compound_index_schema, options);
  db.clear('st1');
  db.put('st1', compound_index_data);
  cb(db);
};

var compound_index_test = function (db, key_range, len, exp_result) {


  var done, result;

  db.values('st1', 'lb12', key_range, 100, 0).addBoth(function (x) {
    result = x;
    console.log(x);
    done = true;
  });


  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      // assertEquals('length', len, result.length);
      assertArrayEquals(exp_result, result);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

};


var test_compound_text_open_open = function() {
  var key_range = ydn.db.KeyRange.bound(['a', 'a'], ['b', 'b'], true, true);
  var len = 2;
  var exp_result = compound_index_data.slice(1, 3);
  load_compound_index_db(function (db) {
   compound_index_test(db, key_range, len, exp_result);
  });
};

var test_compound_text_open_close = function () {
  var key_range = ydn.db.KeyRange.bound(['a', 'a'], ['b', 'b'], true);
  var len = 3;
  var exp_result = compound_index_data.slice(1, 4);
  load_compound_index_db(function (db) {
    compound_index_test(db, key_range, len, exp_result);
  });
};

var test_compound_text_close_close = function () {
  var key_range = ydn.db.KeyRange.bound(['a', 'a'], ['b', 'b']);
  var len = 4;
  load_compound_index_db(function (db) {
    var exp_result = compound_index_data.slice();
    // db.values('st1').addBoth(function (x) {console.log(x)});
    compound_index_test(db, key_range, len, exp_result);
  })
};

var test_compound_text_starts = function () {
  var key_range = ydn.db.KeyRange.starts(['a']);
  var len = 2;
  var exp_result = compound_index_data.slice(0, 2);
  load_compound_index_db(function (db) {
    compound_index_test(db, key_range, len, exp_result);
  });
};




var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



