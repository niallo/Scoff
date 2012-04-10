// test_account_database.js - Example of a module
// that depends on external resources which we mock out.
var somedb = require('somedb');

module.exports = TestAccountDatabase;

function TestAccountDatabase() {
  this._options = {};
}

TestAccountDatabase.open = function(options) {
  var testAccountDatabase = new TestAccountDatabase(options);

  return testAccountDatabase;
};

TestAccountDatabase.prototype._init = function(options) {
  this._options = options || {};
};

TestAccountDatabase.prototype.findUser = function(username_or_email, cb) {

  if (username_or_email.indexOf('@') === -1) {
    return somedb.query({username: username_or_email}, db);
  } else {
    return somedb.query({email: username_or_email}, db);
  }

};

TestAccountDatabase.prototype.removeUser = function(username_or_email, cb) {

  if (username_or_email.indexOf('@') === -1) {
    return somedb.remove({username: username_or_email}, db);
  } else {
    return somedb.remove({email: username_or_email}, db);
  }

};

TestAccountDatabase.prototype.addUser = function(username, password, email, cb) {

  return somedb.insert({username: username, password: password, email: email}, cb);

};
