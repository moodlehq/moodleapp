/**
 * Created with IntelliJ IDEA.
 * User: mbikt
 * Date: 10/2/12
 * Time: 5:54 PM
 * To change this template use File | Settings | File Templates.
 */



/**
 * http://www.sqlite.org/faq.html
 * How do I list all tables/indices contained in an SQLite database
 * @constructor
 */
function SqliteTableInfo() {}


/**
 * @type {string}
 */
SqliteTableInfo.prototype.type;


/**
 * @type {string}
 */
SqliteTableInfo.prototype.name;


/**
 * @type {string}
 */
SqliteTableInfo.prototype.tbl_name;


/**
 * @type {string}
 */
SqliteTableInfo.prototype.sql;


/**
 * @type {number}
 */
SqliteTableInfo.prototype.rootpage;
