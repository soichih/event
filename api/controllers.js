'use strict';

//contrib
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

//mine
var config = require('./config');

/**
 * @apiGroup Event
 * @api {get} /health Get API status
 * @apiDescription Get current API status
 * @apiName GetHealth
 *
 * @apiSuccess {String} status 'ok' or 'failed'
 */
router.get('/health', function(req, res) {
    res.json({status: 'ok'});
});

/**
 * @apiGroup Event
 * @api {ws} /echo  Echo
 * @apiDescription  ('messasge') Echo back message sent 
 * @apiName WSEcho
 */
router.ws('/echo', function(ws, req) {
    ws.on('message', function(msg) {
        ws.send(msg);
    });
});

module.exports = router;
