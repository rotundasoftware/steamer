/*
 * Steamer v0.2.0
 * Copyright (c)2014 Rotunda Software, LLC.
 * Distributed under MIT license
 * http://github.com/rotundasoftware/steamer
*/

var _ = require( 'underscore' );
var async = require( 'async' );
var MongoCollectionContainer = require( './mongoCollectionContainer' );
var HashContainer = require( './hashContainer' );
var stuffMiddleware = require( './stuffMiddleware' );

var Boat = function( containers ) {
	this._containers = containers || {};
	this._bulkCargo = {};

	return this;
};

Boat.prototype.add = function( itemsByContainerArray ) {
	var _this = this;

	if( ! _.isArray( itemsByContainerArray ) ) itemsByContainerArray = [ itemsByContainerArray ];

	_.each( itemsByContainerArray, function( itemsByContainer ) {
		_.each( itemsByContainer, function( thisItem, thisContainerName ) {
			if( _.has( _this._containers, thisContainerName ) )
				_this._containers[ thisContainerName ].add( thisItem );
			else
				_this._bulkCargo[ thisContainerName ] = thisItem;
		} );
	} );
};

Boat.prototype.addContainers = function( newContainers ) {
	this._containers = _.extend( this._containers, newContainers );
};

Boat.prototype.reset = function() {
	_.each( this._containers, function( thisContainer ) {
		thisContainer.reset();
	} );

	this._bulkCargo = {};
};

Boat.prototype.stuff = function( callback ) {
	var _this = this;

	return new Promise( function( resolve, reject ) {
		// pack each container, get the results of the packing, 
		var contentsByContainer = {};
		var containerNames = _.keys( _this._containers );

		async.each( containerNames, function( thisContainerName, nextEach ) {
			_this._containers[ thisContainerName ].stuff( function( err, data ) {
				if( err ) return nextEach( err );

				contentsByContainer[ thisContainerName ] = data;
				nextEach();
			} );
		}, function( err ) {
			if( err ) {
				if( callback ) return callback( err );
				else return reject( err );
			}

			var contents = _.extend( contentsByContainer, _this._bulkCargo );

			if( callback ) callback( null, contents );
			resolve( contents );
		} );
	} );
};

module.exports.Boat = Boat;
module.exports.MongoCollectionContainer = MongoCollectionContainer;
module.exports.HashContainer = HashContainer;
module.exports.stuffMiddleware = stuffMiddleware;