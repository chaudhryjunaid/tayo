const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const logger = require('morgan');

require('dotenv').config();

process.on('uncaughtException', function (e) {
  console.log(e.message, e.stack);
});

process.on('unhandledRejection', function (e) {
  console.log(e.message, e.stack);
});

const indexRouter = require('./routes/index');
const slashRouter = require('./routes/slash');
const githubRouter = require('./routes/github');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(awsServerlessExpressMiddleware.eventContext());

app.use('/', indexRouter);
app.use('/slash', slashRouter);
app.use('/github', githubRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  console.log(err.message, err.stack);
  res.status(err.status || 500);
  res.json({
    message: err.message,
    text: 'An error occurred'
  });
});

module.exports = app;
