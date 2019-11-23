var express = require('express');
var router = express.Router();
const axios = require('axios');

router.post('/push', async function(req, res, next) {
  const response = await axios({
    method: 'post',
    url: process.env.HOTFIX_WEBHOOK,
    data: {
      text: 'hello, world'
    }
  });
  console.log('Slack response: ', response);
  res.sendStatus(200);
});

module.exports = router;
