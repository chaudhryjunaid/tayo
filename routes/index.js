var express = require('express');
var router = express.Router();

/* GET home page. */
router.post('/ts', function(req, res, next) {
  res.send('hello, world');
});

module.exports = router;
