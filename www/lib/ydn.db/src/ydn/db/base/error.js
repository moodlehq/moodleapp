/**
 *
 * @fileoverview Error classes for the database module.
 *
 */

goog.provide('ydn.db.ConstraintError');
goog.provide('ydn.db.InternalError');
goog.provide('ydn.db.InvalidKeyException');
goog.provide('ydn.db.InvalidStateError');
goog.provide('ydn.db.NotFoundError');
goog.provide('ydn.db.ScopeError');
goog.provide('ydn.db.SecurityError');
goog.provide('ydn.db.TimeoutError');
goog.provide('ydn.db.VersionError');



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.ConstraintError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.ConstraintError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'ConstraintError';
};
goog.inherits(ydn.db.ConstraintError, Error);


/**
 *
 * @type {string}
 */
ydn.db.ConstraintError.prototype.name = 'ConstraintError';


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.ConstraintError.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };
}



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InvalidKeyException = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InvalidKeyException);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'ydn.db.InvalidKeyException';
};
goog.inherits(ydn.db.InvalidKeyException, Error);


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.InvalidKeyException.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };
}



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.VersionError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.VersionError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'ydn.db.VersionError';
};
goog.inherits(ydn.db.VersionError, Error);


/**
 * @type {string} name of error.
 */
ydn.db.VersionError.prototype.name = 'ydn.db.VersionError';


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.VersionError.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };
}



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InternalError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InternalError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.InternalError, Error);


/**
 * @type {string} name of error.
 */
ydn.db.InternalError.prototype.name = 'ydn.db.InternalError';



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.ScopeError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.ScopeError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'ydn.db.ScopeError';
};
goog.inherits(ydn.db.ScopeError, Error);



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InvalidStateError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InvalidStateError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'InvalidStateError';
};
goog.inherits(ydn.db.InvalidStateError, Error);



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InvalidAccessError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InvalidAccessError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'InvalidAccessError';
};
goog.inherits(ydn.db.InvalidAccessError, Error);



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.NotFoundError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.NotFoundError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'NotFoundError';
};
goog.inherits(ydn.db.NotFoundError, Error);


/**
* @type {string} name of error.
*/
ydn.db.NotFoundError.prototype.name = 'NotFoundError';


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.NotFoundError.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };
}



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.DataCloneError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.DataCloneError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'DataCloneError';
};
goog.inherits(ydn.db.DataCloneError, Error);


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.DataCloneError.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };
}



/**
 *
 * @param {SQLError} e original error.
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {Error}
 */
ydn.db.SQLError = function(e, opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.SQLError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.message += ' :' + e.message + ' [' + e.code + ']';
  this.name = 'SQLError';
};
goog.inherits(ydn.db.SQLError, Error);



if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.SQLError.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };
}



/**
 *
 * @param {Error} e original message.
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {Error}
 */
ydn.db.SecurityError = function(e, opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.SecurityError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.message += ' :' + e.message;
  this.name = 'SecurityError';
};
goog.inherits(ydn.db.SecurityError, Error);


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.SecurityError.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };
}



/**
 *
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {Error}
 */
ydn.db.SqlParseError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.SqlParseError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'ydn.db.SqlParseError';
};
goog.inherits(ydn.db.SqlParseError, Error);



/**
 *
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {Error}
 */
ydn.db.TimeoutError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.TimeoutError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'ydn.db.TimeoutError';
};
goog.inherits(ydn.db.TimeoutError, Error);



/**
 * @param {*} result request result.
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {Error}
 */
ydn.db.TxError = function(result, opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.TxError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.name = 'TxError';
  this.result = result;
};
goog.inherits(ydn.db.TxError, Error);


/**
 * @type {*}
 */
ydn.db.TxError.prototype.result;


/**
 * @return {*} request result.
 */
ydn.db.TxError.prototype.getResult = function() {
  return this.result;
};



/**
 *
 * @param {*} result request result.
 * @param {*=} opt_msg optional message.
 * @constructor
 * @extends {ydn.db.TxError}
 */
ydn.db.TxAbortedError = function(result, opt_msg) {
  goog.base(this, result, opt_msg);
  this.name = 'TxAbortedError';
};
goog.inherits(ydn.db.TxAbortedError, ydn.db.TxError);



