var scoff = require('../index.js');

describe('Scoff', function() {
    it ('should initialize correctly', function() {
      var t = scoff.wrap(__dirname + '/lib/test_account_database',
        {requires:
            {'somedb':
            {
            }
        }
      });
      t.mock.expects("open").once();
      t.open();
      t.mock.verify();
    });

});
