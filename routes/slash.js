var express = require('express');
var router = express.Router();
const moment = require('moment-timezone');
const _ = require('lodash');
const axios = require('axios');

const strings = {
  INVALID_TIMESTAMP_ERROR: 'Invalid timestamp',
  NO_TIMESTAMP_FOUND_ERROR: 'No timestamps found',
  INVALID_TIMEZONE_ERROR: 'Timezone not found in moment database',
  SERVER_ERROR: 'A server error occurred'
};

const timestampIsValid = function(timestamp) {
  if (isNaN(timestamp)) {
    return false;
  }
  return moment.unix(timestamp).isValid();
};

const formatTimestamp = function(timestamp, timezone, format) {
  if (timezone == null) {
    timezone = 'America/Chicago';
  }
  if (format == null) {
    format = 'YYYY-MM-DDTHH:mm:ssZZ';
  }
  return moment.unix(timestamp).tz(timezone).format(format);
};

const formatOutput = function(timestamp, tz, includeTimestamp, format1, format2) {
  var ts1, ts2;
  if (tz == null) {
    tz = 'America/Chicago';
  }
  if (includeTimestamp == null) {
    includeTimestamp = false;
  }
  if (format1 == null) {
    format1 = 'YYYY-MM-DDTHH:mm:ssZZ';
  }
  if (format2 == null) {
    format2 = 'ddd, MMM Do YYYY, h:mm:ssa';
  }
  ts1 = formatTimestamp(timestamp, tz, format1);
  ts2 = formatTimestamp(timestamp, tz, format2);
  if (includeTimestamp) {
    return `${timestamp} / ${tz}:  ${ts1}  -  ${ts2}`;
  }
  return `${tz}:  ${ts1}  -  ${ts2}`;
};

const sendResponse = async function(req, res, msg) {
  return res.json({
    response_type: 'in_channel',
    ...msg
  });
};

const tsController = async function(req, res) {
  const text = req.body.text;
  let match;
  const tsRegex = /\b([+-]?\d+)\b/g;
  let timestamps = (function() {
    const _results = [];
    while (match = tsRegex.exec(text)) {
      _results.push(match[1]);
    }
    return _results;
  })();
  const tzRegex = /\b([A-Za-z_\/]+)\b/g;
  let timezones = (function() {
    const _results = [];
    while (match = tzRegex.exec(text)) {
      _results.push(match[1]);
    }
    return _results;
  })();
  timestamps =  _(timestamps)
    .map(ts => parseInt(ts, 10))
    .compact()
    .value();
  if (!timestamps.length) {
    return sendResponse(req, res, {text: '```' + strings.NO_TIMESTAMP_FOUND_ERROR + '```'});
  }
  if (!timezones.length) {
    timezones = [
      'America/Chicago',
      'Etc/UTC',
      'America/New_York',
      'America/Denver',
      'America/Los_Angeles',
      'US/Central',
      'Asia/Karachi'
    ];
  }
  const timezoneList = moment.tz.names();
  let timezoneMatches = _.flatten(_.map(timezones, function(timezone) {
    return _.filter(timezoneList, function(tz) {
      return tz.toLowerCase().indexOf(timezone.toLowerCase()) >= 0;
    });
  }));
  let output = _.map(timestamps, timestamp => {
    let tsOutput = [
      `${timestamp}:`
    ];
    if (!timestampIsValid(timestamp)) {
      tsOutput.push(strings.INVALID_TIMESTAMP_ERROR);
    } else if (timezoneMatches.length === 0) {
      tsOutput.push(strings.INVALID_TIMEZONE_ERROR);
    } else {
      tsOutput = tsOutput.concat(_.map(timezoneMatches, function(tz) {
        return formatOutput(timestamp, tz);
      }));
    }
    return tsOutput;
  });
  output = _.map(output, tsBlock => tsBlock.join('\n'));
  output = output.join('\n\n');
  return sendResponse(req, res, {text: '```' + output + '```'});
};

const weatherController = async function(req, res) {
  return sendResponse(req, res, {text: req.body.text});
}

/* GET home page. */
router.post('/', async function(req, res) {
  try {
    console.log(req.body);
    const command = req.body.command;
    switch(command) {
      case '/ts':
        return tsController(req, res);
      case '/weather':
        return weatherController(req, res);
      default:
        return sendResponse(req, res, {text: 'Your slash command was not recognized by Tayo!'});
    }
  } catch (e) {
    console.log(e.message, e.stack);
    return sendResponse(req, res, {text: strings.SERVER_ERROR});
  }
});

module.exports = router;
