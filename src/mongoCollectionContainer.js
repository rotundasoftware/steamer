/*
 * Steamer Mongo Collection Container
 * Copyright (c)2014 Rotunda Software, LLC.
 * Distributed under MIT license
 * http://github.com/rotundasoftware/steamer
*/

var _ = require( 'underscore' );
var async = require( "async" );

MongoCollectionContainer = function( options ) {
	this._collection = options.collection;
	this._normalizeId = _.isUndefined( options.normalizeId ) ? false : options.normalizeId;
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
	var records = [];

	async.each( this._selectors, function( thisSelector, callback ) {
		thisSelector = _.extend( {
			fields : [],
			where : {},
			sort : null,
			skip : 0,
			limit : 0
		}, thisSelector );

		var mongoQuery;
		var orClauses = [];
		var where = thisSelector.where;

		if( ! _.isArray( where ) ) where = [ where ];
		_.each( where, function( thisWhere ) {
			var thisMongoQuery = _.reduce( Object.keys( thisWhere ), function( thisMongoQueryMemo, thisFieldName ) {
				var thisFieldNameNormalized = thisFieldName === 'id' ? '_id' : thisFieldName;

				if( _.isArray( thisWhere[ thisFieldName ] ) ) {
					thisMongoQueryMemo[ thisFieldNameNormalized ] = { $in : thisWhere[ thisFieldName ] };
				} else {
					thisMongoQueryMemo[ thisFieldNameNormalized ] = thisWhere[ thisFieldName ];
				}

				return thisMongoQueryMemo;
			}, {} );

			orClauses.push( thisMongoQuery );
		} );

		if( orClauses.length > 1 ) {
			mongoQuery = { $or : orClauses };
		} else {
			mongoQuery = orClauses[ 0 ];
		}

		var projection = {};

		if( thisSelector.fields !== "*" ) {
			thisSelector.fields = _.union( thisSelector.fields, [ _this._normalizeId ? 'id' : '_id' ] );
			
			_.each( thisSelector.fields, function( thisField ) {
				if( ( _this._normalizeId && thisField === 'id' ) || ( ! _this._normalizeId && thisField === '_id' ) ) return;

				projection[ thisField ] = 1;
			} );
		}

		var cursor = _this._collection.find( mongoQuery );
		if( ! _.isEmpty( projection ) ) cursor.project( projection );
		if( thisSelector.skip ) cursor.skip( thisSelector.skip );
		if( thisSelector.limit ) cursor.limit( thisSelector.limit );
		
		cursor.toArray( function( err, recordsFromThisSelector ) {
			if( err ) return callback( err );

			_.each( recordsFromThisSelector, function( thisRecord ) {
				var recordId = thisRecord._id;

				if( _this._normalizeId && '_id' in thisRecord ) {
					thisRecord.id = thisRecord._id;
					delete thisRecord._id;
				}

				records.push( thisRecord );
			} );

			callback();
		} );
	}, function( err ) {
		if( err ) return callback( err );

		callback( null, records );
	} );
};

module.exports = MongoCollectionContainer;