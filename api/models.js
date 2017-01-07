'use strict';

//contrib
const mongoose = require('mongoose');
const winston = require('winston');

//mine
const config = require('./config');
const logger = new winston.Logger(config.logger.winston);

//use native promise for mongoose
//without this, I will get Mongoose: mpromise (mongoose's default promise library) is deprecated
mongoose.Promise = global.Promise;

exports.init = function(cb) {
    mongoose.connect(config.mongodb, {
        server: { auto_reconnect: true }
    }, function(err) {
        if(err) return cb(err);
        logger.info("connected to mongo");
        logger.debug(config.mongodb);
        cb();
    });
}
exports.disconnect = function(cb) {
    mongoose.disconnect(cb);
}

var notificationSchema = mongoose.Schema({

    user_id: String, //user made the request (null if system created it)

    event: String, //event which will trigger this notification
    handler: String, //handle which should process this notification when triggered
    config: mongoose.Schema.Types.Mixed, //other notification details provided by user

    create_date: {type: Date, default: Date.now },
    update_date: {type: Date, default: Date.now }, //not sure if I will use this
    trigger_date: Date,
});
exports.Notification = mongoose.model('Notification', notificationSchema);

