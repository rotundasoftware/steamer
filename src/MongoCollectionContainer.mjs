/*
 * Steamer Mongo Collection Container
 * Copyright (c)2014 Rotunda Software, LLC.
 * Distributed under MIT license
 * http://github.com/rotundasoftware/steamer
*/
import _ from 'underscore';

const MongoCollectionContainer = function( options ) {
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
	var stuffPromise = this._stuff();

	if( _.isFunction( callback ) ) {
		stuffPromise.then( function( records ) {
			callback( null, records );
		} ).catch( function( err ) {
			callback( err );
		} );

		return;
	}

	return stuffPromise;
};

MongoCollectionContainer.prototype._stuff = async function() {
	var _this = this;
	var recordsBySelector = await Promise.all( this._selectors.map( async function( thisSelector ) {
		var records = [];

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
				var thisFieldNameNormalized = _this._normalizeId && thisFieldName === 'id' ? '_id' : thisFieldName;

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

		var recordsFromThisSelector = await cursor.toArray();

		_.each( recordsFromThisSelector, function( thisRecord ) {
			if( _this._normalizeId && '_id' in thisRecord ) {
				thisRecord.id = thisRecord._id;
				delete thisRecord._id;
			}

			records.push( thisRecord );
		} );

		return records;
	} ) );

	return _.flatten( recordsBySelector, true );
};

export default MongoCollectionContainer;
