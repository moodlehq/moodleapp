




(function () {

  var db_name = 'test_iteration_2';
  var store_name = 'st';
  var schema = {
    stores: [
      {
        name: store_name,
        keyPath: 'id',
        type: 'INTEGER',
        indexes: [
          {
            keyPath: 'value',
            type: 'INTEGER'
          },
          {
            keyPath: 'tags',
            type: 'TEXT',
            multiEntry: true
          }
        ]
      }]
  };
  var data = [
    {id: 0, value: 3, tags: ['b'], msg: 'msg:' + Math.random()},
    {id: 1, value: 2, tags: ['a', 'b'], msg: 'msg:' + Math.random()},
    {id: 2, value: 1, tags: ['b'], msg: 'msg:' + Math.random()},
    {id: 3, value: 3, tags: ['a', 'c'], msg: 'msg:' + Math.random()},
    {id: 4, value: 3, tags: ['c', 'b'], msg: 'msg:' + Math.random()},
    {id: 5, value: 2, tags: ['a', 'd'], msg: 'msg:' + Math.random()},
    {id: 6, value: 8, tags: ['a'], msg: 'msg:' + Math.random()},
    {id: 7, value: 2, tags: ['a', 'b'], msg: 'msg:' + Math.random()}
  ];
  var value_order = [2, 1, 5, 7, 0, 3, 4, 6];
  var db = new ydn.db.Storage(db_name, schema, options);
  db.clear();
  db.put(store_name, data).done(function (value) {
    //console.log(db + 'store: animals ready.');
  });

  var total = 0;
  var test_env = {
    setup: function () {

    },
    teardown: function () {
      total++;
      if (total == 4) {
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      }
    }
  };

  module("cursor,open", test_env);
  reporter.createTestSuite('cursor');

  asyncTest("readonly table scan for value iterator", 3 * data.length, function () {

    var iter = new ydn.db.ValueIterator(store_name);
    var idx = 0;
    var req = db.open(function(x) {
      deepEqual(x.getKey(), data[idx].id, 'table scan effective key at ' + idx);
      deepEqual(x.getPrimaryKey(), data[idx].id, 'table scan primary key at ' + idx);
      deepEqual(x.getValue(), data[idx], 'table scan value at ' + idx);
      idx++;
    }, iter);
    req.always(function() {
      start();
    });
  });

  asyncTest("readonly table scan on index key", 3 * data.length, function () {

    var iter = new ydn.db.IndexIterator(store_name, 'value');

    var idx = 0;
    var req = db.open(function(x) {
      var exp_obj = data[value_order[idx]];
      deepEqual(x.getKey(), exp_obj.value, 'table index scan effective key at ' + idx);
      deepEqual(x.getPrimaryKey(), exp_obj.id, 'table index scan primary key at ' + idx);
      equal(x.getValue(), exp_obj.id, 'table index scan value at ' + idx);
      idx++;
    }, iter);
    req.always(function() {
      start();
    });
  });

  asyncTest("readonly table scan on index", 3 * data.length, function () {

    var iter = new ydn.db.IndexValueIterator(store_name, 'value');

    var idx = 0;
    var req = db.open(function(x) {
      var exp_obj = data[value_order[idx]];
      deepEqual(x.getKey(), exp_obj.value, 'table index scan effective key at ' + idx);
      deepEqual(x.getPrimaryKey(), exp_obj.id, 'table index scan primary key at ' + idx);
      deepEqual(x.getValue(), exp_obj, 'table index scan value at ' + idx);
      idx++;
    }, iter);
    req.always(function() {
      start();
    });
  });

  asyncTest("synchronous push", 1, function () {

    var streamer = new ydn.db.Streamer(db, store_name);
    streamer.push(data[1].id);
    streamer.push(data[3].id);
    streamer.collect(function (keys, values) {
      deepEqual(keys, [data[1].id, data[3].id], 'key of id 1 and 3');
      // deepEqual(values, [data[1], data[3]], 'value of id 1 and 3');
      start();
    });
  });

})();



(function () {

  var db_name = 'test_iterator_count';
  var db_r;

  var store_inline = "ts";    // in-line key store
  var store_outline = "ts2"; // out-of-line key store
  var store_inline_auto = "ts3"; // in-line key + auto
  var store_outline_auto = "ts4"; // out-of-line key + auto
  var store_inline_index = "ts6";    // in-line key store
  var schema_1 = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id',
        type: 'NUMERIC'},
      {
        name: store_outline,
        type: 'NUMERIC'},
      {
        name: store_inline_auto,
        keyPath: 'id',
        autoIncrement: true,
        type: 'INTEGER'},
      {
        name: store_outline_auto,
        autoIncrement: true},
      {
        name: store_inline_index,
        keyPath: 'id',
        type: 'NUMERIC',
        indexes: [
          {name: 'name', type: 'TEXT'},
          {name: 'value', type: 'NUMERIC'},
          {name: 'tags', type: 'TEXT', multiEntry: true}
        ]
      }

    ]
  };


  var df = $.Deferred();

  // persist store data.
  // we don't want to share this database connection and test database connection.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1, options);
    _db.clear(store_inline_index);
    _db.put(store_inline_index, [
      {id: 1, value: 2, name: 'a' + Math.random()},
      {id: 2, value: 4, name: 'b' + Math.random()},
      {id: 3, value: 6, name: 'b' + Math.random()},
      {id: 4, value: 8, name: 'c' + Math.random()}
    ]);
    _db.clear(store_inline);
    _db.put(store_inline, [
      {id: 1, value: 'v' + Math.random()},
      {id: 2, value: 'v' + Math.random()},
      {id: 3, value: 'v' + Math.random()},
      {id: 4, value: 'v' + Math.random()}
    ]).always(function() {
      _db.close();
      df.resolve();  // this ensure all transaction are completed
    });
  })();

  var test_count = 0;

  var test_env = {
    setup: function () {
      db_r = new ydn.db.Storage(db_name, schema_1, options);

    },
    teardown: function () {
      db_r.close();
      test_count++;
      if (test_count == 2) {
        //console.log(db_r.getName() + ' deleted.')
        var type = db_r.getType();
        db_r.close();
        ydn.db.deleteDatabase(db_r.getName(), type);
      }
    }
  };

  module("cursor,Count", test_env);
  reporter.createTestSuite('cursor');


  asyncTest("primary key iterator", 5, function () {

    df.always(function () {
      //db_r.count(store_inline).always(function (x) {
      //console.log(x);
      //});
      var iter = ydn.db.KeyIterator.where(store_inline, '>', 1, '<=', 3);
      db_r.count(iter).always(function (x) {
        equal(x, 2, 'number of records in a bounded range');
      });
      iter = new ydn.db.KeyIterator(store_inline, ydn.db.KeyRange.lowerBound(2));
      db_r.count(iter).always(function (x) {
        equal(x, 3, 'number of records in lowerBound');
      });
      iter = new ydn.db.KeyIterator(store_inline, ydn.db.KeyRange.lowerBound(2, true));
      db_r.count(iter).always(function (x) {
        equal(x, 2, 'number of records in open lowerBound');
      });
      iter = new ydn.db.KeyIterator(store_inline, ydn.db.KeyRange.upperBound(2));
      db_r.count(iter).always(function (x) {
        equal(x, 2, 'number of records in upperBound');
      });
      iter = new ydn.db.KeyIterator(store_inline, ydn.db.KeyRange.upperBound(2, true));
      db_r.count(iter).always(function (x) {
        equal(x, 1, 'number of records in open upperBound');
        start();
      });
    });

  });

  asyncTest("index key iterator", 2, function () {
    df.always(function () {

      var value_iter = ydn.db.IndexIterator.where(store_inline_index, 'value', '>', 1, '<=', 3);
      var name_iter = ydn.db.IndexIterator.where(store_inline_index, 'name', '^', 'b');

      db_r.count(value_iter).always(function (x) {
        //console.log('count value')
        equal(x, 1, 'number of values in the range');
      });
      db_r.count(name_iter).always(function (x) {
        equal(x, 2, 'number of name in the range');
        start();
      });
    });

  });

})();


(function () {

  var db_name = 'test_ver_1_iterator_get_1';
  var store_inline_index = 'st-i';
  var schema_1 = {
    stores: [
      {
        name: store_inline_index,
        keyPath: 'id',
        type: 'NUMERIC',
        indexes: [
          {name: 'name', type: 'TEXT'},
          {name: 'value', type: 'NUMERIC'},
          {name: 'tags', type: 'TEXT', multiEntry: true}
        ]
      }

    ]
  };
  var test_count = 0;
  var db_r = new ydn.db.Storage(db_name, schema_1, options);

  var objs = [
    {id: 1, value: 2, name: 'a' + Math.random()},
    {id: 2, value: 4, name: 'b' + Math.random()},
    {id: 3, value: 6, name: 'b' + Math.random()},
    {id: 4, value: 8, name: 'c' + Math.random()}
  ];


  module("cursor,Get", {
    setup: function () {
      db_r.clear(store_inline_index);
      db_r.put(store_inline_index, objs);
    },
    teardown: function () {
      test_count++;
      if (test_count >= 4) {
        var type = db_r.getType();
        db_r.close();
        ydn.db.deleteDatabase(db_r.getName(), type);
      }
    }
  });
  reporter.createTestSuite('cursor');

  asyncTest("effective key by an iterator", function () {
    expect(1);
    var iter = ydn.db.KeyIterator.where(store_inline_index, '>', 1, '<=', 3);
    db_r.get(iter).then(function (x) {
      equal(x, objs[1].id, 'get item 2 key');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });
  });

  asyncTest("reference value by an iterator", function () {
    expect(1);
    var iter = ydn.db.ValueIterator.where(store_inline_index, '>', 1, '<=', 3);
    db_r.get(iter).then(function (x) {
      deepEqual(x, objs[1], 'get item 2 value');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });
  });


  asyncTest("effective key by an index iterator", 1, function () {

    var iter = ydn.db.IndexIterator.where(store_inline_index, 'name', '^', 'c');
    db_r.get(iter).then(function (x) {
      equal(x, objs[3].id, 'get item 3 key');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });
  });

  asyncTest("reference value by an iterator start", 1, function () {

    var iter = ydn.db.IndexValueIterator.where(store_inline_index, 'name', '^', 'c');
    db_r.get(iter).then(function (x) {
      deepEqual(x, objs[3], 'get item 3 value');
      start();
    }, function (e) {
      ok(false, e.message);
      start();
    });
  });

})();


(function () {

  var db_name = 'test_iterator_list-5';
  var test_count = 0;
  var df = $.Deferred();
  var store_inline_index = 'sti';

  var schema_1 = {
    stores: [
      {
        name: store_inline_index,
        keyPath: 'id',
        indexes: [
          {name: 'name'},
          {name: 'value'},
          {name: 'tags', multiEntry: true}
        ]
      }

    ]
  };

  var objs = [
    {test: 't' + Math.random(), value: 0, id: 0, name: 'a', tags: ['a', 'b']},
    {test: 't' + Math.random(), value: 2, id: 1, name: 'b', tags: ['x']},
    {test: 't' + Math.random(), value: 4, id: 2, name: 'ba', tags: ['z']},
    {test: 't' + Math.random(), value: 6, id: 3, name: 'bc', tags: ['a', 'd', 'c']},
    {test: 't' + Math.random(), value: 8, id: 4, name: 'bd', tags: ['e', 'c']},
    {test: 't' + Math.random(), value: 10, id: 5, name: 'c', tags: ['b']},
    {test: 't' + Math.random(), value: 12, id: 6, name: 'c', tags: ['a']}
  ];

  // persist store data.
  // we don't want to share this database connection and test database connection.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1, options);
    _db.clear(store_inline_index);
    _db.put(store_inline_index, objs).always(function() {
      _db.close();
      df.resolve();  // this ensure all transactions are completed
    });
  })();

  var db;
  var test_env = {
    setup: function () {
      db = new ydn.db.Storage(db_name, schema_1, options);

    },
    teardown: function () {
      var type = db.getType();
      db.close();
      test_count++;
      if (test_count >= 5) {
        ydn.db.deleteDatabase(db_name, type);
      }
    }
  };

  module("cursor,values", test_env);
  reporter.createTestSuite('cursor', 'values');

  asyncTest("reference value by primary key range", 9, function () {
    df.always(function () {

      var q = new ydn.db.ValueIterator(store_inline_index);
      db.values(q).always(function (x) {
        //console.log(q)
        deepEqual(x, objs, 'all');
      });

      var key_range = ydn.db.KeyRange.bound(1, 3);
      var q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.values(q).always(function (x) {
        //console.log(q)
        deepEqual(x, objs.slice(1, 4), 'closed bound');
      });

      key_range = ydn.db.KeyRange.bound(1, 3);
      q = new ydn.db.ValueIterator(store_inline_index, key_range, true);
      db.values(q).always(function (x) {
        var exp = objs.slice(1, 4).reverse();
        deepEqual(x, exp, 'closed bound reverse');
      });

      key_range = ydn.db.KeyRange.bound(1, 3);
      q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.values(q, 1).always(function (x) {
        deepEqual(x, objs.slice(1, 2), 'closed bound limit');
      });

      key_range = ydn.db.KeyRange.bound(1, 3);
      q = new ydn.db.ValueIterator(store_inline_index, key_range, true);
      db.values(q, 1).always(function (x) {
        deepEqual(x, objs.slice(3, 4), 'closed bound reverse limit');
      });

      key_range = ydn.db.KeyRange.lowerBound(2);
      q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.values(q).always(function (x) {
        //console.log(q)
        deepEqual(x, objs.slice(2), 'lowerBound');
      });

      key_range = ydn.db.KeyRange.lowerBound(2, true);
      q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.values(q).always(function (x) {
        //console.log(q)
        deepEqual(x, objs.slice(3), 'open lowerBound');
      });

      key_range = ydn.db.KeyRange.upperBound(2);
      q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.values(q).always(function (x) {
        //console.log(q)
        deepEqual(x, objs.slice(0, 3), 'upperBound');
      });

      key_range = ydn.db.KeyRange.upperBound(2, true);
      q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.values(q).always(function (x) {
        //console.log(q)
        deepEqual(x, objs.slice(0, 2), 'open upperBound');
        start();
      });
    })
  });

  asyncTest("reference value by index key range", 5, function () {

    var q = ydn.db.IndexValueIterator.where(store_inline_index, 'value', '>=', 2, '<=', 4);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, objs.slice(1, 3), 'closed bound');
    });

    q = ydn.db.IndexValueIterator.where(store_inline_index, 'value', '>=', 4);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, objs.slice(2), 'lowerBound');
    });

    q = ydn.db.IndexValueIterator.where(store_inline_index, 'value', '>', 4);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, objs.slice(3), 'open lowerBound');
    });

    q = ydn.db.IndexValueIterator.where(store_inline_index, 'value', '<=', 4);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, objs.slice(0, 3), 'upperBound');
    });

    q =  ydn.db.IndexValueIterator.where(store_inline_index, 'value', '<', 4);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, objs.slice(0, 2), 'open upperBound');
      start();
    });
  });

  asyncTest("Ref value by index key range", 6, function () {
    var keys = objs.map(function(x) {return x.id});

    var q = ydn.db.IndexIterator.where(store_inline_index, 'value', '>=', 2, '<=', 4);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice(1, 3), 'closed bound');
    });

    q = ydn.db.IndexIterator.where(store_inline_index, 'value', '>=', 4);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice(2), 'lowerBound');
    });

    q = ydn.db.IndexIterator.where(store_inline_index, 'value', '>', 4);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice(3), 'open lowerBound');
    });

    q = ydn.db.IndexIterator.where(store_inline_index, 'value', '<=', 4);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice(0, 3), 'upperBound');
    });


    q = new ydn.db.IndexIterator(store_inline_index, 'value', null, true);
    db.values(q, 3).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice().reverse().slice(0,3), 'reverse key range');
    });

    q =  ydn.db.IndexIterator.where(store_inline_index, 'value', '<', 4);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice(0, 2), 'open upperBound');
      start();
    });
  });


  asyncTest("reference value by string index key range", 4, function () {

    var q = ydn.db.IndexValueIterator.where(store_inline_index, 'name', '^', 'b');
    db.values(q).always(function (x) {
      //console.log(q)
      equal(x.length, 4, 'LIKE%');
    });

    q = ydn.db.IndexValueIterator.where(store_inline_index, 'name', '=', 'b');
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x.length, 1, 'equal');
    });

    q = ydn.db.IndexValueIterator.where(store_inline_index, 'name', '<', 'b');
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x.length, 1, '<');
    });

    q = ydn.db.IndexValueIterator.where(store_inline_index, 'name', '^', 'd');
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x.length, 0, 'LIKE% no result');
      start();
    });

  });

  asyncTest("multiEntry IndexIterator", 4, function () {

    var range = ydn.db.KeyRange.only('a');
    var q = new ydn.db.IndexIterator(store_inline_index, 'tags', range);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, [objs[0].id, objs[3].id, objs[6].id], 'ref value only a');

    });

    range = ydn.db.KeyRange.only('a');
    q = new ydn.db.IndexValueIterator(store_inline_index, 'tags', range);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, [objs[0], objs[3], objs[6]], 'only a');

    });

    q = new ydn.db.IndexIterator(store_inline_index, 'tags', range, false, true);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, [objs[0].id], 'only a unique');

    });

    q = new ydn.db.IndexValueIterator(store_inline_index, 'tags', range, false, true);
    db.values(q).always(function (x) {
      //console.log(q)
      deepEqual(x, [objs[0]], 'only a unique');
      start();
    });

  });



})();


(function () {

  var test_count = 0;
  var db_name = 'test_tck2_key-cur';
  var df = $.Deferred();
  var store_inline_index = 'st';

  var schema_1 = {
    stores: [
      {
        name: store_inline_index,
        keyPath: 'id',
        indexes: [
          {name: 'name'},
          {name: 'value'},
          {name: 'tags', multiEntry: true}
        ]
      }

    ]
  };

  var objs = [
    {test: 't' + Math.random(), value: 0, id: 0, name: 'a', tags: ['a', 'b']},
    {test: 't' + Math.random(), value: 2, id: 1, name: 'b', tags: []},
    {test: 't' + Math.random(), value: 4, id: 2, name: 'ba', tags: ['z']},
    {test: 't' + Math.random(), value: 6, id: 3, name: 'bc', tags: ['a', 'd', 'c']},
    {test: 't' + Math.random(), value: 8, id: 4, name: 'bd', tags: ['e', 'c']},
    {test: 't' + Math.random(), value: 10, id: 5, name: 'c', tags: []},
    {test: 't' + Math.random(), value: 12, id: 6, name: 'c', tags: ['a']}
  ];

  // persist store data.
  // we don't want to share this database connection and test database connection.
  (function() {
    var _db = new ydn.db.Storage(db_name, schema_1, options);
    _db.clear(store_inline_index);
    _db.put(store_inline_index, objs).always(function() {
      _db.close();
      df.resolve();  // this ensure all transactions are completed
    });
  })();

  var db;
  var test_env = {
    setup: function () {
      db = new ydn.db.Storage(db_name, schema_1, options);

    },
    teardown: function () {
      db.close();
      test_count++;
      if (test_count >= 3) {
        var type = db.getType();
        ydn.db.deleteDatabase(db_name, type);
      }
    }
  };

  module("cursor,keys", test_env);
  reporter.createTestSuite('cursor', 'keys');


  asyncTest("Effective key by by primary key range", 8, function () {
    df.always(function () {

      var keys = objs.map(function(x) {return x.id});

      var key_range = ydn.db.KeyRange.bound(1, 3);
      var q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.keys(q).always(function (x) {
        //console.log(q)
        deepEqual(x, keys.slice(1, 4), 'closed bound');
      });

      key_range = ydn.db.KeyRange.bound(1, 3);
      q = new ydn.db.ValueIterator(store_inline_index, key_range, true);
      db.keys(q).always(function (x) {
        var exp = keys.slice(1, 4).reverse();
        deepEqual(x, exp, 'closed bound reverse');
      });

      key_range = ydn.db.KeyRange.bound(1, 3);
      q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.keys(q, 1).always(function (x) {
        deepEqual(x, keys.slice(1, 2), 'closed bound limit');
      });

      key_range = ydn.db.KeyRange.bound(1, 3);
      q = new ydn.db.ValueIterator(store_inline_index, key_range, true);
      db.keys(q, 1).always(function (x) {
        deepEqual(x, keys.slice(3, 4), 'closed bound reverse limit');
      });

      key_range = ydn.db.KeyRange.lowerBound(2);
      q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.keys(q).always(function (x) {
        //console.log(q)
        deepEqual(x, keys.slice(2), 'lowerBound');
      });

      key_range = ydn.db.KeyRange.lowerBound(2, true);
      q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.keys(q).always(function (x) {
        //console.log(q)
        deepEqual(x, keys.slice(3), 'open lowerBound');
      });

      key_range = ydn.db.KeyRange.upperBound(2);
      q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.keys(q).always(function (x) {
        //console.log(q)
        deepEqual(x, keys.slice(0, 3), 'upperBound');
      });

      key_range = ydn.db.KeyRange.upperBound(2, true);
      q = new ydn.db.ValueIterator(store_inline_index, key_range);
      db.keys(q).always(function (x) {
        //console.log(q)
        deepEqual(x, keys.slice(0, 2), 'open upperBound');
        start();
      });
    })
  });

  asyncTest("Effective key by index key range", function () {

    var keys = objs.map(function (x) {
      return x.value;
    });
    expect(5);
    var q = ydn.db.IndexIterator.where(store_inline_index, 'value', '>=', 2, '<=', 4);
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice(1, 3), 'closed bound');
    });

    q = ydn.db.IndexIterator.where(store_inline_index, 'value', '>=', 4);
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice(2), 'lowerBound');
    });

    q = ydn.db.IndexIterator.where(store_inline_index, 'value', '>', 4);
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice(3), 'open lowerBound');
    });

    q = ydn.db.IndexIterator.where(store_inline_index, 'value', '<=', 4);
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice(0, 3), 'upperBound');
    });

    q = ydn.db.IndexIterator.where(store_inline_index, 'value', '<', 4);
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, keys.slice(0, 2), 'open upperBound');
      start();
    });

  });


  asyncTest("Effective key by multiEntry index key range", 6, function () {

    var range = ydn.db.KeyRange.only('a');
    var q = new ydn.db.IndexIterator(store_inline_index, 'tags', range);
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, ['a', 'a', 'a'], 'only a');
    });

    range = ydn.db.KeyRange.only('a');
    q = new ydn.db.IndexValueIterator(store_inline_index, 'tags', range);
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, ['a', 'a', 'a'], 'only a');
    });

    q = new ydn.db.IndexIterator(store_inline_index, 'tags', range, false, true);
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, ['a'], 'only a unique');
    });

    q = new ydn.db.IndexValueIterator(store_inline_index, 'tags', range, false, true);
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, ['a'], 'only a unique');
    });

    var result = [];
    for (var i = 0; i < objs.length; i++) {
      result = result.concat(objs[i].tags);
    }
    result.sort();

    var q = new ydn.db.IndexIterator(store_inline_index, 'tags');
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, result, 'all');
    });

    var q = new ydn.db.IndexIterator(store_inline_index, 'tags', null, false, true);
    db.keys(q).always(function (x) {
      //console.log(q)
      deepEqual(x, ['a', 'b', 'c', 'd', 'e', 'z'], 'all unique');
      start();
    });

  });

})();




(function () {

  var schema = {
    stores: [
      {
        name: 'animals',
        keyPath: 'id',
        indexes: [
          {
            keyPath: 'color'
          },
          {
            keyPath: 'horn'
          },
          {
            keyPath: 'legs'
          },
          {
            keyPath: ['horn', 'name']
          }, {
            keyPath: ['legs', 'name']
          }]
      }]
  };
  var db = new ydn.db.Storage('test_algo_2', schema, options);

  var animals = [
    {id: 1, name: 'rat', color: 'brown', horn: 0, legs: 4},
    {id: 2, name: 'leopard', color: 'spots', horn: 2, legs: 4},
    {id: 3, name: 'galon', color: 'gold', horn: 10, legs: 2},
    {id: 4, name: 'cat', color: 'spots', horn: 0, legs: 4},
    {id: 5, name: 'snake', color: 'spots', horn: 0, legs: 0},
    {id: 6, name: 'ox', color: 'black', horn: 2, legs: 4},
    {id: 7, name: 'cow', color: 'spots', horn: 2, legs: 4},
    {id: 8, name: 'chicken', color: 'red', horn: 0, legs: 2}
  ];
  db.clear();
  db.put('animals', animals).done(function (value) {
    //console.log(db + 'store: animals ready.');
  });
  var num_color = animals.reduce(function (p, x) {
    return x.color == 'spots' ? p + 1 : p;
  }, 0);
  var num_four_legs_ani = animals.reduce(function (p, x) {
    return x.legs == 4 ? p + 1 : p;
  }, 0);
  var num_two_horn_ani = animals.reduce(function (p, x) {
    return x.horn == 2 ? p + 1 : p;
  }, 0);

  var total = 0;
  var test_env = {
    setup: function () {

    },
    teardown: function () {
      total++;
      if (total == 4) {
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      }
    }
  };

  module("cursor,join", test_env);
  reporter.createTestSuite('cursor', 'join');

  asyncTest("NestedLoop", 1, function () {

    var iter_color = ydn.db.IndexIterator.where('animals', 'color', '=', 'spots');
    var iter_horn = ydn.db.IndexIterator.where('animals', 'horn', '=', 2);
    var iter_legs = ydn.db.IndexIterator.where('animals', 'legs', '=', 4);

    var result = [];
    var solver = new ydn.db.algo.NestedLoop(result);
    var req = db.scan(solver, [iter_horn, iter_color, iter_legs]);
    req.always(function() {
      // ['leopard', 'cow']
      deepEqual(result, [2, 7], 'correct result');
      // equal(iter_horn.count(), horn_iter_count, 'horn table scan count');
      // equal(iter_color.count(), color_iter_count * horn_iter_count, 'color table scan count');
      // equal(iter_legs.count(), leg_iter_count * color_iter_count * horn_iter_count, 'legs table scan count');
      start();
    });

  });

  asyncTest("SortedMerge", 1, function () {

    var iter_color = ydn.db.IndexIterator.where('animals', 'color', '=', 'spots');
    var iter_horn = ydn.db.IndexIterator.where('animals', 'horn', '=', 2);
    var iter_legs = ydn.db.IndexIterator.where('animals', 'legs', '=', 4);

    var result = [];
    var solver = new ydn.db.algo.SortedMerge(result);
    var req = db.scan(solver, [iter_horn, iter_color, iter_legs]);
    req.always(function() {
      // ['leopard', 'cow']
      deepEqual(result, [2, 7], 'correct result');
      // ok(iter_horn.count() <= horn_iter_count, 'horn table scan count less than or equal to ' + num_two_horn_ani);
      // ok(iter_color.count() <= color_iter_count , 'color table scan count less than or equal to ' + num_color);
      // ok(iter_legs.count() <= leg_iter_count, 'legs table scan count less than or equal to ' + num_four_legs_ani);
      start();
    });

  });

  asyncTest("ZigzagMerge", 1, function () {

    var iter_horn_name = new ydn.db.IndexIterator('animals', 'horn, name', ydn.db.KeyRange.starts([2]));
    var iter_legs_name = new ydn.db.IndexIterator('animals', 'legs, name', ydn.db.KeyRange.starts([4]));

    var result = [];
    var solver = new ydn.db.algo.ZigzagMerge(result);
    var req = db.scan(solver, [iter_horn_name, iter_legs_name]);
    var exp_result = [7, 2, 6]; // ['cow', 'leopard', 'ox'];
    req.always(function() {
      deepEqual(result, exp_result, 'correct result');
      // ok(iter_horn_name.count() >= exp_result.length, 'horn table scan count larger or equal to ' + exp_result.length);
      // ok(iter_horn_name.count() <= horn_iter_count, 'horn table scan count less than or equal to ' + horn_iter_count);
      // ok(iter_legs_name.count() >= exp_result.length, 'legs table scan count larger or equal to ' + exp_result.length);
      // ok(iter_legs_name.count() <= leg_iter_count, 'legs table scan count less than or equal to ' + leg_iter_count);
      start();
    });

  });

  asyncTest("ZigzagMerge with streamer output", 1, function () {

    var iter_horn_name = new ydn.db.IndexIterator('animals', 'horn, name', ydn.db.KeyRange.starts([2]));
    var iter_legs_name = new ydn.db.IndexIterator('animals', 'legs, name', ydn.db.KeyRange.starts([4]));

    var streamer = new ydn.db.Streamer(db, 'animals', 'name');
    var solver = new ydn.db.algo.ZigzagMerge(streamer);
    var req = db.scan(solver, [iter_horn_name, iter_legs_name]);
    var exp_result = ['cow', 'leopard', 'ox'];
    req.then(function() {
      streamer.collect(function(keys, values) {
        deepEqual(values, exp_result, 'correct result');
        // ok(iter_horn_name.count() >= exp_result.length, 'horn table scan count larger or equal to ' + exp_result.length);
        // ok(iter_legs_name.count() >= exp_result.length, 'legs table scan count larger or equal to ' + exp_result.length);
        start();
      });

    }, function(e) {
      throw e;
    });

  });

})();








