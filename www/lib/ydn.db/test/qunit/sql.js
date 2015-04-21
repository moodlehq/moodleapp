


(function () {

  var db_name = 'test_sql_1';
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
            type: 'TEXT'
          },
          {
            keyPath: 'x',
            type: 'NUMERIC'
          }
        ]
      }]
  };

  var data = [
    {id: 0, x: 3.5, value: 'ab', msg: 'msg:' + Math.random()},
    {id: 1, x: 0,   value: 'ba', msg: 'msg:' + Math.random()},
    {id: 2, x: 1,   value: 'c', msg: 'msg:' + Math.random()},
    {id: 3, x: 3.1, value: 'ca', msg: 'msg:' + Math.random()},
    {id: 4, x: -1,  value: 'a', msg: 'msg:' + Math.random()}
  ];


  var db = new ydn.db.Storage(db_name, schema, options);
  db.clear();
  db.put(store_name, data).always(function (value) {
    // console.log(db + 'store ready ' + JSON.stringify(value));
  });

  var total = 0;
  var test_env = {
    setup: function () {

    },
    teardown: function () {
      total++;
      if (total == 4) {
        var type = db.getType();
        ydn.db.deleteDatabase(db_name, type);
        db.close();
      }
    }
  };

  module("sql,SELECT", test_env);
  reporter.createTestSuite('sql', 'SELECT');

  asyncTest("*", function () {
    expect(1);

    var sql = 'SELECT * FROM "st"';
    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, data, sql);
      start();
    });
  });

  asyncTest("primary field", function () {
    expect(1);

    var sql = 'SELECT "id" FROM "st"';
    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, [0, 1, 2, 3, 4], sql);
      start();
    });
  });

  asyncTest("a field", function () {
    expect(1);

    var sql = 'SELECT x FROM "st"';
    var exp_result = data.map(function(x) {return x.x});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("fields", function () {
    expect(1);

    var sql = 'SELECT x, "value" FROM "st"';
    var exp_result = data.map(function(x) {
        return {x: x.x, value: x.value};
      }
    );

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

})();


(function () {

  var db_name = 'test_sql_2';
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
            type: 'TEXT'
          },
          {
            keyPath: 'x',
            type: 'NUMERIC'
          }
        ]
      }]
  };

  var data = [
    {id: 0, x: 3.5, value: 'ab', msg: 'msg:' + Math.random()},
    {id: 1, x: 0,   value: 'ba', msg: 'msg:' + Math.random()},
    {id: 2, x: 1,   value: 'c', msg: 'msg:' + Math.random()},
    {id: 3, x: 3.1, value: 'ca', msg: 'msg:' + Math.random()},
    {id: 4, x: -1,  value: 'a', msg: 'msg:' + Math.random()}
  ];


  var db = new ydn.db.Storage(db_name, schema, options);
  db.clear();
  db.put(store_name, data).always(function (value) {
    // console.log(db + 'store ready ' + JSON.stringify(value));
  });

  var total = 0;
  var test_env = {
    setup: function () {

    },
    teardown: function () {
      total++;
      if (total == 4) {
        var type = db.getType();
        ydn.db.deleteDatabase(db_name, type);
        db.close();
      }
    }
  };

  module("sql,Paging", test_env);
  reporter.createTestSuite('sql', 'Paging');

  var ids = data.map(function(x) {
      return x.id;
    }
  );

  asyncTest("LIMIT", function () {
    expect(1);

    var sql = 'SELECT id FROM st LIMIT 3';
    var exp_result = ids.slice(0, 3);
    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("LIMIT OFFSET", function () {
    expect(1);

    var sql = 'SELECT id FROM st LIMIT 3 OFFSET 2';
    var exp_result = ids.slice(2, 5);
    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("LIMIT with WHERE", function () {
    expect(1);

    var sql = 'SELECT * FROM st WHERE x > 0 ORDER BY x LIMIT 2';

    var exp_result = data.filter(function (x) {
      return x.x > 0;
    });
    exp_result.sort(function (a, b) {
      return a.x > b.x ? 1 : -1;
    });
    exp_result = exp_result.slice(0, 2);


    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("LIMIT OFFSET with WHERE", function () {
    expect(1);

    var sql = 'SELECT * FROM st WHERE x > 0 ORDER BY x LIMIT 2 OFFSET 1';

    var exp_result = data.filter(function (x) {
      return x.x > 0;
    });
    exp_result.sort(function (a, b) {
      return a.x > b.x ? 1 : -1;
    });
    exp_result = exp_result.slice(1, 3);


    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

})();


(function () {

  var db_name = 'test_sql_3';
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
            type: 'TEXT'
          },
          {
            keyPath: 'x',
            type: 'NUMERIC'
          }
        ]
      }]
  };

  var data = [
    {id: 0, x: 3.5, value: 'ab', msg: 'msg:' + Math.random()},
    {id: 1, x: 0,   value: 'ba', msg: 'msg:' + Math.random()},
    {id: 2, x: 1,   value: 'c', msg: 'msg:' + Math.random()},
    {id: 3, x: 3.1, value: 'ca', msg: 'msg:' + Math.random()},
    {id: 4, x: -1,  value: 'a', msg: 'msg:' + Math.random()}
  ];


  var db = new ydn.db.Storage(db_name, schema, options);
  db.clear();
  db.put(store_name, data).always(function (value) {
    // console.log(db + 'store ready ' + JSON.stringify(value));
  });

  var total = 0;
  var test_env = {
    setup: function () {

    },
    teardown: function () {
      total++;
      if (total == 4) {
        var type = db.getType();
        ydn.db.deleteDatabase(db_name, type);
        db.close();
      }
    }
  };

  module("sql,ORDER", test_env);
  reporter.createTestSuite('sql', 'ORDER');


  asyncTest("primary key", function () {
    expect(1);

    var sql = 'SELECT id FROM "st" ORDER BY "id"';
    var exp_result = data.map(function(x) {
        return x.id;
      }
    );

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("reverse primary key", function () {
    expect(1);

    var sql = 'SELECT id FROM "st" ORDER BY "id" DESC';
    var exp_result = data.map(function(x) {
        return x.id;
      }
    );
    exp_result.reverse();

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("a field", function () {
    expect(1);

    var sql = 'SELECT id FROM "st" ORDER BY "x"';
    var exp_result = data.map(function(x) {
        return x.id;
      }
    );
    exp_result.sort(function(a, b) {
      return data[a].x > data[b].x ? 1 : -1;
    });

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


  asyncTest("reverse a field", function () {
    expect(1);

    var sql = 'SELECT id FROM "st" ORDER BY "value" DESC';
    var exp_result = data.map(function(x) {
        return x.id;
      }
    );
    exp_result.sort(function(a, b) {
      return data[a].value > data[b].value ? -1 : 1;
    });

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });


})();

(function () {

  var db_name = 'test_sql_4';
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
            type: 'TEXT'
          },
          {
            keyPath: 'x',
            type: 'NUMERIC'
          }
        ]
      }]
  };

  var data = [
    {id: 0, x: 3.5, value: 'ab', msg: 'msg:' + Math.random()},
    {id: 1, x: 0,   value: 'ba', msg: 'msg:' + Math.random()},
    {id: 2, x: 1,   value: 'c', msg: 'msg:' + Math.random()},
    {id: 3, x: 3.1, value: 'ca', msg: 'msg:' + Math.random()},
    {id: 4, x: -1,  value: 'a', msg: 'msg:' + Math.random()}
  ];


  var db = new ydn.db.Storage(db_name, schema, options);
  db.clear();
  db.put(store_name, data).always(function (value) {
    // console.log(db + 'store ready ' + JSON.stringify(value));
  });

  var total = 0;
  var test_env = {
    setup: function () {

    },
    teardown: function () {
      total++;
      if (total == 6) {
        var type = db.getType();
        ydn.db.deleteDatabase(db_name, type);
        db.close();
      }
    }
  };

  module("sql,WHERE", test_env);
  reporter.createTestSuite('sql', 'WHERE');

  asyncTest("number: =", 1, function () {

    var sql = 'SELECT * FROM "st" WHERE x = 1';
    var exp_result = data.filter(function (x) { return x.x == 1});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("string: =", 1, function () {

    var sql = "SELECT * FROM st WHERE value = 'ba'";
    var exp_result = data.filter(function (x) { return x.value == 'ba'});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("number: >", 1, function () {

    var sql = 'SELECT * FROM "st" WHERE x > 1 ORDER BY "x"';
    var exp_result = data
      .filter(function (x) { return x.x > 1})
      .sort(function (a, b) {return a.x > b.x ? 1 : -1});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("number: >=", 1, function () {

    var sql = 'SELECT * FROM "st" WHERE x >= 1 ORDER BY "x"';
    var exp_result = data
      .filter(function (x) { return x.x >= 1})
      .sort(function (a, b) {return a.x > b.x ? 1 : -1});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("number: > AND <", 1, function () {

    var sql = 'SELECT * FROM "st" WHERE x > 1 AND x < 3.1 ORDER BY "x"';
    var exp_result = data
      .filter(function (x) { return x.x > 1 && x.x < 3.1})
      .sort(function (a, b) {return a.x > b.x ? 1 : -1});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

  asyncTest("number: > AND <=", 1, function () {

    var sql = 'SELECT * FROM "st" WHERE x > 1 AND x <= 3.1 ORDER BY "x"';
    var exp_result = data
      .filter(function (x) { return x.x > 1 && x.x <= 3.1})
      .sort(function (a, b) {return a.x > b.x ? 1 : -1});

    var req = db.executeSql(sql);
    req.always(function(x) {
      deepEqual(x, exp_result, sql);
      start();
    });
  });

})();


(function () {

  var db_name = 'test_sql_5';
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
            type: 'TEXT'
          },
          {
            keyPath: 'x',
            type: 'NUMERIC'
          }
        ]
      }]
  };

  var data = [
    {id: 0, x: 3.5, value: 'ab', msg: 'msg:' + Math.random()},
    {id: 1, x: 0,   value: 'ba', msg: 'msg:' + Math.random()},
    {id: 2, x: 1,   value: 'c', msg: 'msg:' + Math.random()},
    {id: 3, x: 3.1, value: 'ca', msg: 'msg:' + Math.random()},
    {id: 4, x: -1,  value: 'a', msg: 'msg:' + Math.random()}
  ];


  var db = new ydn.db.Storage(db_name, schema, options);
  db.clear();
  db.put(store_name, data).always(function (value) {
    // console.log(db + 'store ready ' + JSON.stringify(value));
  });

  var total = 0;
  var test_env = {
    setup: function () {

    },
    teardown: function () {
      total++;
      if (total == 5) {
        var type = db.getType();
        ydn.db.deleteDatabase(db_name, type);
        db.close();
      }
    }
  };


  module("sql,Aggregate", test_env);
  reporter.createTestSuite('sql', 'Aggregate');

  asyncTest("COUNT(*)", 1, function () {

    var sql = 'SELECT COUNT (*) FROM st';

    var n = data.length;
    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, n, sql);
      start();
    });
  });

  asyncTest("COUNT (x) where", 1, function () {

    var sql = 'SELECT COUNT (x) FROM st WHERE x > 3';

    var n = data.filter(function (x) {return x.x > 3;}).length;
    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, n, sql);
      start();
    });
  });

  asyncTest("COUNT (x) AND where", 1, function () {

    var sql = 'SELECT COUNT (x) FROM st WHERE x >= 0 AND x < 3';

    var n = data.filter(function (x) {return x.x >= 0 && x.x < 3;}).length;
    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, n, sql);
      start();
    });
  });

  asyncTest("MAX (x)", 1, function () {

    var sql = 'SELECT MAX (x) FROM st';

    var n = 3.5;
    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, n, sql);
      start();
    });
  });

  asyncTest("MIN (x)", 1, function () {

    var sql = 'SELECT MIN (x) FROM st';

    var n = -1;
    var req = db.executeSql(sql);
    req.always(function(x) {
      equal(x, n, sql);
      start();
    });
  });


})();





