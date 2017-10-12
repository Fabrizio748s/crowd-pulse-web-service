'use strict';

var Q = require('q');
var mongoose = require('mongoose');
var builder = require('./schemaBuilder');
var schemas = require('./schemaName');

var ConnectionSchema = builder(schemas.connection, {
    id: mongoose.Schema.ObjectId,
    displayName: String,
    deviceId: String,
    phoneNumber: String,
    contactId: String,
    contactName: String,
    contactPhoneNumber: String,
    starred: Number,
    contactedTimes: Number
});


// Model methods

ConnectionSchema.statics.newFromObject = function(object) {
    return new this(object);
};


module.exports = ConnectionSchema;
