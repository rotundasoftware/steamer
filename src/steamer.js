
var _ = require( 'underscore' );
var async = require( 'async' );

var MongoCollectionContainer = require( './mongoCollectionContainer' );

module.exports.stuffMiddleware = function( boatName ) {
	return function( req, res, next ) {
		var oldRender = res.render;

		// override the render function on the response object to send down bootstrap data, and then
		// call the original render function.

		res.render = function( view, options, fn ) {
			// see express implementation of render()... there is a pointer to request object in response object. We
			// need a reference to the req object so that we can call req.next in the event of an error.
			var res = this;
			var req = this.req;
			var renderArgs = arguments;

			req[ boatName ].stuff( function( err, payload ) {
				if( err ) return req.next( err );

				res.locals[ boatName ] = payload;
				oldRender.apply( res, renderArgs );
			} );
		};

		next();
	};
};

module.exports.Boat = function( options ) {
	this._containers = options.containers;
	this._response = options.response;
	this._consignee = options.consignee;

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