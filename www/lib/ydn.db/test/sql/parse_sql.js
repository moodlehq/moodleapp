/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 15/12/12
 */


goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.sql.Storage');


var test_select = function() {
  var sql = new ydn.db.Sql('SELECT * from st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertEquals('selList', null, sql.getSelList());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());

  sql = new ydn.db.Sql('SELECT f1 from st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('selList', ['f1'], sql.getSelList());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());

  sql = new ydn.db.Sql('SELECT f1, f2 from st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('selList', ['f1', 'f2'], sql.getSelList());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());

  sql = new ydn.db.Sql('SELECT (f3, f4) from st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('selList', ['f3', 'f4'], sql.getSelList());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
};

var test_order_by_none = function() {
  var sql = new ydn.db.Sql('SELECT * from st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertEquals('selList', null, sql.getSelList());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertUndefined('order', sql.getOrderBy());
};

var test_order_by = function() {
  var sql = new ydn.db.Sql('SELECT * from st1 ORDER BY f1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertEquals('selList', null, sql.getSelList());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order', 'f1', sql.getOrderBy());
};

var test_where_int = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x = 1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  var kr = wheres[0].getKeyRange();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  assertEquals('lower', 1, kr.lower);
  assertEquals('lowerOpen', false, kr.lowerOpen);
  assertEquals('upper', 1, kr.upper);
  assertEquals('upperOpen', false, kr.upperOpen);
};


var test_where_int_param = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x = ?');
  assertEquals('parse ok', '', sql.parse([1]));
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  var kr = wheres[0].getKeyRange();
  assertEquals('lower', 1, kr.lower);
  assertEquals('lowerOpen', false, kr.lowerOpen);
  assertEquals('upper', 1, kr.upper);
  assertEquals('upperOpen', false, kr.upperOpen);
};

var test_where_float = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x = 0.5');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  var kr = wheres[0].getKeyRange();
  assertEquals('lower', 0.5, kr.lower);
  assertEquals('lowerOpen', false, kr.lowerOpen);
  assertEquals('upper', 0.5, kr.upper);
  assertEquals('upperOpen', false, kr.upperOpen);
};

var test_where_double_quoted_string = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st2 WHERE y = "1"');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st2'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  var kr = wheres[0].getKeyRange();
  assertEquals('lower', '1', kr.lower);
  assertEquals('lowerOpen', false, kr.lowerOpen);
  assertEquals('upper', '1', kr.upper);
  assertEquals('upperOpen', false, kr.upperOpen);
};

var test_where_single_quoted_string = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st2 WHERE y = \'1\'');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st2'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  var kr = wheres[0].getKeyRange();
  assertEquals('lower', '1', kr.lower);
  assertEquals('lowerOpen', false, kr.lowerOpen);
  assertEquals('upper', '1', kr.upper);
  assertEquals('upperOpen', false, kr.upperOpen);
};


var test_where_gt = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x > 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  var kr = wheres[0].getKeyRange();
  assertEquals('lower', 2, kr.lower);
  assertEquals('lowerOpen', true, kr.lowerOpen);
  assertUndefined('upper', kr.upper);
};

var test_where_gte = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x >= 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  //console.log(wheres[0])
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  var kr = wheres[0].getKeyRange();
  assertEquals('lower', 2, kr.lower);
  assertEquals('lowerOpen', false, kr.lowerOpen);
  assertUndefined('upper', kr.upper);
};

var test_where_lt = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x < 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  var kr = wheres[0].getKeyRange();
  assertUndefined('lower', kr.lower);
  assertEquals('upper', 2, kr.upper);
  assertEquals('upperOpen', true, kr.upperOpen);
};

var test_where_lte = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x <= 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  var kr = wheres[0].getKeyRange();
  assertUndefined('lower', kr.lower);
  assertEquals('upper', 2, kr.upper);
  assertEquals('upperOpen', false, kr.upperOpen);
};


var test_where_bound = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x >= 2 AND x < 4');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  var kr = wheres[0].getKeyRange();
  assertEquals('lower', 2, kr.lower);
  assertEquals('lowerOpen', false, kr.lowerOpen);
  assertEquals('upper', 4, kr.upper);
  assertEquals('upperOpen', true, kr.upperOpen);
};

var test_where_bound_param = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x >= ? AND x < ?');
  assertEquals('parse ok', '', sql.parse([4, 5]));
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  var kr = wheres[0].getKeyRange();
  assertEquals('lower', 4, kr.lower);
  assertEquals('lowerOpen', false, kr.lowerOpen);
  assertEquals('upper', 5, kr.upper);
  assertEquals('upperOpen', true, kr.upperOpen);
};


var test_limit = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 LIMIT 5');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('limit', 5, sql.getLimit());
  assertNaN('offset', sql.getOffset());
};

var test_offset = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 OFFSET 5');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertNaN('limit', sql.getLimit());
  assertEquals('offset', 5, sql.getOffset());
};

var test_limit_offset = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 LIMIT 5 OFFSET 4');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('limit', 5, sql.getLimit());
  assertEquals('offset', 4, sql.getOffset());
};

var test_offset_limit = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 OFFSET 1 LIMIT 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('limit', 2, sql.getLimit());
  assertEquals('offset', 1, sql.getOffset());
};

var test_order = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY f1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'f1', sql.getOrderBy());
  assertFalse('dir', sql.isReversed());
};

var test_order_dir = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY f1 DESC');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'f1', sql.getOrderBy());
  assertTrue('dir', sql.isReversed());
};

var test_order_single_quote = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY \'field 1\'');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'field 1', sql.getOrderBy());
};

var test_order_double_quote = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY "field 1"');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'field 1', sql.getOrderBy());
};

var test_order_limit = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY f1 LIMIT 1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'f1', sql.getOrderBy());
  assertEquals('limit', 1, sql.getLimit());
  assertNaN('offset', sql.getOffset());
};

var test_order_limit_offset = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY f1 LIMIT 1 OFFSET 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'f1', sql.getOrderBy());
  assertEquals('limit', 1, sql.getLimit());
  assertEquals('offset', 2, sql.getOffset());
  assertFalse('dir', sql.isReversed());
};

var test_order_limit_offset_dir = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY f1 DESC LIMIT 1 OFFSET 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'f1', sql.getOrderBy());
  assertEquals('limit', 1, sql.getLimit());
  assertEquals('offset', 2, sql.getOffset());
  assertTrue('dir', sql.isReversed());
};

var test_order_offset = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY f1 OFFSET 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'f1', sql.getOrderBy());
  assertNaN('limit', sql.getLimit());
  assertEquals('offset', 2, sql.getOffset());
};

var test_aggregate = function() {
  var sql = new ydn.db.Sql('SELECT COUNT(*) FROM st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('aggregate', 'COUNT', sql.getAggregate());
  assertNull('fields', sql.getSelList());

  sql = new ydn.db.Sql('SELECT MAX(*) FROM st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('aggregate', 'MAX', sql.getAggregate());

  sql = new ydn.db.Sql('SELECT MIN(*) FROM st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('aggregate', 'MIN', sql.getAggregate());

  sql = new ydn.db.Sql('SELECT AVG(*) FROM st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('aggregate', 'AVG', sql.getAggregate());

  sql = new ydn.db.Sql('SELECT SUM(*) FROM st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('aggregate', 'SUM', sql.getAggregate());
};



var test_aggregate_field = function() {
  var sql = new ydn.db.Sql('SELECT COUNT(f2) FROM st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('aggregate', 'COUNT', sql.getAggregate());
  assertArrayEquals('fields', ['f2'], sql.getSelList());
};