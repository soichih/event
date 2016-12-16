'use strict';

//contrib
const express = require('express');
const router = express.Router();
const jwt = require('express-jwt');
const jsonwebtoken = require('jsonwebtoken');
const winston = require('winston');

//mine
const config = require('../config');
const server = require('../server');
const logger = new winston.Logger(config.logger.winston);
const db = require('../models');

/**
 * @apiGroup Notification
 * @api {get} /notification 
 * @apiDescription Query notification requests that belongs to user (for admin return all)
 *
 * @apiParam {Object} [find]    Optional Mongo query to perform (you need to JSON.stringify)
 * @apiParam {Object} [sort]    Mongo sort object - defaults to _id. Enter in string format like "-name%20desc"
 * @apiParam {String} [select]  Fields to load - defaults to 'logical_id'. Multiple fields can be entered with %20 as delimiter
 * @apiParam {Number} [limit]   Maximum number of records to return - defaults to 100
 * @apiParam {Number} [skip]    Record offset for pagination (default to 0)
 * @apiParam {String} [user_id] (Only for sca:admin) Override user_id to search (default to sub in jwt). Set it to null if you want to query all users.
 * 
 * @apiHeader {String} authorization A valid JWT token "Bearer: xxxxx"
 *
 * @apiSuccess {Object}  List of notificationss (maybe limited / skipped) and total number
 */
router.get('/', jwt({secret: config.express.pubkey}), function(req, res, next) {
    var find = {};
    if(req.query.find || req.query.where) find = JSON.parse(req.query.find || req.query.where);

    //handling user_id.
    if(!req.user.scopes.sca || !~req.user.scopes.sca.indexOf("admin") || find.user_id === undefined) {
        //non admin, or admin didn't set user_id
        find.user_id = req.user.sub;
    } else if(find.user_id == null) {
        //admin can set it to null and remove user_id filtering all together
        delete find.user_id;
    }

    db.Notification.find(find)
    .select(req.query.select)
    .limit(req.query.limit || 100)
    .skip(req.query.skip || 0)
    .sort(req.query.sort || '_id')
    .exec(function(err, notifications) {
        if(err) return next(err);
        db.Notification.count(find).exec(function(err, count) {
            if(err) return next(err);
            res.json({notifications: notifications, count: count});
        });
    });
});

router.post('/', jwt({secret: config.express.pubkey}), function(req, res, next) {
    var notification = new db.Notification(req.body);
    if(!req.user.scopes.sca || !~req.user.scopes.sca.indexOf("admin")) {
        //logger.debug("overriding user_id ");
        notification.user_id = req.user.sub; //for non-admin, it gets set to user_id
    }
    //TODO validate event /handler?

    notification.save(function(err, _notification) {
        if(err) return next(err);
        //logger.debug(_notification);
        res.json(_notification);
    }); 
});

module.exports = router;
