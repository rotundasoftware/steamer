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

Boat.prototype.add = function( itemsByContainer ) {
	var _this = this;

	_.each( itemsByContainer, function( thisItem, thisContainerName ) {
		if( _.has( _this._containers, thisContainerName ) )
			_this._containers[ thisContainerName ].add( thisItem );
		else
			_this._bulkCargo[ thisContainerName ] = thisItem;
	} );
};

Boat.prototype.reset = function() {
	_.each( this._containers, function( thisContainer ) {
		thisContainer.reset();
	} );

	this._bulkCargo = {};
};

Boat.prototype.stuff = function( callback ) {
	var _this = this;

	// pack each container, get the results of the packing, 
	var contentsByContainer = {};
	var containerNames = _.keys( this._containers );

	async.each( containerNames, function( thisContainerName, callback ) {
		_this._containers[ thisContainerName ].stuff( function( err, data ) {
			if( err ) return callback( err );

			contentsByContainer[ thisContainerName ] = data;
			callback();
		} );
	}, function( err ) {
		if( err ) return callback( err );

		callback( null, _.extend( contentsByContainer, _this._bulkCargo ) );
	} );
};

module.exports.Boat = Boat;
module.exports.MongoCollectionContainer = MongoCollectionContainer;
module.exports.HashContainer = HashContainer;
module.exports.stuffMiddleware = stuffMiddleware;