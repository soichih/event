'use strict';

//contrib
const express = require('express');
const router = express.Router();
const expressjwt = require('express-jwt');
const jsonwebtoken = require('jsonwebtoken');
const winston = require('winston');

//mine
const config = require('./config');
const server = require('./server');
const logger = new winston.Logger(config.logger.winston);

/**
 * @apiGroup Event
 * @api {get} /health Get API status
 * @apiDescription Get current API status
 * @apiName GetHealth
 *
 * @apiSuccess {String} status 'ok' or 'failed'
 */
router.get('/health', function(req, res) {
    res.json({status: 'ok', amqp_connection: server.amqp?true:false});
});

/**
 * @apiGroup Event
 * @apiName Subscribe
 * @api {ws} /:exchange Subscribe to configured exchange
 * @apiParam {String} jwt Authorization token
 * @apiDescription      Subscribe to specified exchange with routing keys authorized in your access token
 *                      For example, following token allows you to subscribe to all event that matches 
 *                      routing key "task.12456abcde.*"
 *                      {
 *                          "exchange": "wf",
 *                          "keys": [ "task.123456abcde.*" ],
 *                      }
 */
//setup ws router for each exchange configured
for(var exchange in config.event.exchanges) {
    var pubkey = config.event.exchanges[exchange];

    router.ws('/'+exchange, (ws, req) => {
        //console.dir(ws);
        jsonwebtoken.verify(req.query.jwt, pubkey, (err, token) => {
            if(err) {
                logger.error(err);
                //ws.disconnect();
                return;
            }
            logger.debug("wsconnection received and token verified");
            logger.debug(token);
            
            //send welcome package
            //ws.send(JSON.stringify({action: 'welcome', user: user}));

            //create a new queue
            if(!server.amqp) {
                logger.error("amqp not connected.. sorry but need to disconnect client");
                //ws.disconnect();
                return;
            }

            var _q = null;
            server.amqp.queue('', {exclusive: true}, (q) => {
                _q = q;
                token.keys.forEach(function(key) {
                    q.bind(token.exchange, key); //async ok?
                });
                q.subscribe(function(msg, headers, dinfo, msgobj) {
                    ws.send(JSON.stringify(msg), function(err) {
                        if(err) logger.error(err);
                    });
                });
            });
            
            /*
            ws.on('message', function(msg) {
                //ignore message from client for now..
            });
            */
            ws.on('close', function(msg) {
                logger.info("client disconnected");
                _q.destroy();
            });
        });
    });
}

module.exports = router;
