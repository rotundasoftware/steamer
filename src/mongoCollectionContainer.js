/*
 * Steamer Mongo Collection Container
 * Copyright (c)2014 Rotunda Software, LLC.
 * Distributed under MIT license
 * http://github.com/rotundasoftware/steamer
*/

var _ = require( 'underscore' );
var async = require( "async" );

var MongoCollectionContainer = function( options ) {
	this._collection = options.collection;
	this._selectors = [];

	return this;
};

MongoCollectionContainer.prototype.add = function( item ) {
	// Supports adding either a single selector object or an array of selector objects.
	this._selectors = this._selectors.concat( item );
};

MongoCollectionContainer.prototype.reset = function() {
	this._selectors = [];
};

MongoCollectionContainer.prototype.stuff = function( callback ) {
	var _this = this;
	var recordsById = {};

	async.each( this._selectors, function( thisSelector, callback ) {
		thisSelector = _.extend( {
			fields : [],
			where : {},
			sort : null,
			skip : 0,
			limit : 0
		}, thisSelector );

		var allConditions = [];
		if( thisSelector.where ) allConditions.push( thisSelector.where );

		var projection = {};

		var mongoQuery = allConditions.length > 1 ? { $and : allConditions } : _.first( allConditions );
		if( thisSelector.fields !== "*" ) {
			thisSelector.fields = _.union( thisSelector.fields, "_id" ); // _id field is mandatory
			
			_.each( thisSelector.fields, function( thisField ) {
				projection[ thisField ] = true;
			} );
		}

		var cursor = _this._collection.find( mongoQuery, projection );
		if( thisSelector.skip ) cursor.skip( thisSelector.skip );
		if( thisSelector.limit ) cursor.limit( thisSelector.limit );
		
		cursor.toArray( function( err, records ) {
			if( err ) return next( err );

			_.each( records, function( thisRecord ) {
				var recordId = thisRecord._id;

				recordsById[ recordId ] = recordsById[ recordId ] || {};
				_.extend( recordsById[ recordId ], thisRecord );
			} );

			callback();
		} );
	}, function( err ) {
		if( err ) return callback( err );

		// now all records are in recordsById, but we want the final payload to be an array, not a hash
		var containerContents = _.values( recordsById );
		callback( null, containerContents );
	} );
};

module.exports = MongoCollectionContainer;