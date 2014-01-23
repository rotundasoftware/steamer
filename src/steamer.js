/*
 * Steamer v0.2.0
 * Copyright (c)2014 Rotunda Software, LLC.
 * Distributed under MIT license
 * http://github.com/rotundasoftware/steamer
*/

var _ = require( 'underscore' );
var async = require( 'async' );
var MongoCollectionContainer = require( './mongoCollectionContainer' );

module.exports.Boat = function( options ) {
	this._containers = options.containers || {};
	this._bulkCargo = {};

	this.add = function( itemsByContainer ) {
		var _this = this;

		_.each( itemsByContainer, function( thisItem, thisContainerName ) {
			if( _.has( _this._containers, thisContainerName ) )
				_this._containers[ thisContainerName ].add( thisItem );
			else
				_this._bulkCargo[ thisContainerName ] = thisItem;
		} );
	};

	this.reset = function() {
		_.each( this._containers, function( thisContainer ) {
			thisContainer.reset();
		} );

		this._bulkCargo = {};
	};

	this.stuff = function( callback ) {
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

	return this;
};

module.exports.MongoCollectionContainer = MongoCollectionContainer;

module.exports.stuffMiddleware = function( boatName ) {
	return function( req, res, next ) {
		var oldRender = res.render;

		// Wrap the original render function at `res.render` so we can add some logic to stuff 
		// the boat at req[ boatName ], and attach its payload to res.locals[ boatName ].
		res.render = function( view, options, fn ) {
			var renderArgs = Array.prototype.slice.apply( arguments );

			req[ boatName ].stuff( function( err, payload ) {
				if( err ) return req.next( err );

				res.locals[ boatName ] = payload;
				oldRender.apply( res, renderArgs );
			} );
		};

		next();
	};
};