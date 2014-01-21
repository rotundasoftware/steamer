
var _ = require( "underscore" );
var async = require( "async" );
var Class = require( "./class" );

module.exports.middleware = function( containers, options ) {
	options = _.defaults( {}, options, {
		boatName : "ssData",
		dumpLocation : "ssData"
	} );

	var boatName = options.boatName;
	var dumpLocation = options.dumpLocation;

	return function( req, res, next ) {
		var containerInstaces = {};
		_.each( containers, function( thisContainer ) {
			containerInstaces[ thisContainer.containerName ] = new thisContainer.type( thisContainer.options );
		} );

		var boat = req[ boatName ] = new Boat( {
			containers : containerInstaces
		} );

		var oldRender = res.render;

		// override the render function on the response object to send down bootstrap data, and then
		// call the original render function.

		res.render = function( view, options, fn ) {
			// see express implementation of render()... there is a pointer to request object in response object. We
			// need a reference to the req object so that we can call req.next in the event of an error.
			var res = this;
			var req = this.req;
			var renderArgs = arguments;

			boat.stuff( function( err, payload ) {
				if( err ) return req.next( err );

				var dumpLocationPointer;
				var html = "";

				dumpLocationPointer = "window." + dumpLocation;
				html += "if( typeof " + dumpLocationPointer + " === \"undefined\" ) " + dumpLocationPointer + " = {}; ";

				html += dumpLocationPointer + " = " + JSON.stringify( payload ) + ";";
				html = "<script type='text/javascript'>" + html + "</script>";

				res.locals[ boatName ] = html;

				oldRender.apply( res, renderArgs );
			} );
		};

		next();
	};
};

module.exports.Boat = Boat = Class.extend( {
	initialize : function( options ) {
		var _this = this;

		this._containers = options.containers;
		this._response = options.response;
		this._consignee = options.consignee;

		this._bulkCargo = {};

		// if we have been supplied a response, override the render method to first load any
		// data to bootstrap and populate the response object with that data.

		if( this._response ) {
			
		}
	},

	add : function( itemsByContainer ) {
		var _this = this;

		_.each( itemsByContainer, function( thisItem, thisContainerName ) {
			if( _.has( _this._containers, thisContainerName ) )
				_this._containers[ thisContainerName ].add( thisItem );
			else
				_this._bulkCargo[ thisContainerName ] = thisItem;
		} );
	},

	reset : function() {
		_.each( this._containers, function( thisContainer ) {
			thisContainer.reset();
		} );
	},

	stuff : function( callback ) {
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
	}
} );

module.exports.Containers = {};

module.exports.Containers.Base = BaseContainer = Class.extend( {
	initialize : function() {
		this._manifest = [];
	},

	add : function( item ) {
		this._manifest.push( item );
	},

	reset : function() {
		this._manifest = [];
	}
} );

module.exports.Containers.MongoCollection = BaseContainer.extend( {
	initialize : function( options ) {
		this._collection = options.collection;

		this._super( arguments );
	},

	stuff : function( callback ) {
		var _this = this;
		var recordsById = {};

		async.each( this._manifest, function( thisSelector, callback ) {
			thisSelector = _.extend( {
				fields : [],
				where : {},
				filters : [],
				skip : 0,
				limit : 0
			}, thisSelector );

			var allConditions = [];
			if( thisSelector.where ) allConditions.push( thisSelector.where );

			var projection = {};

			var mongoQuery = allConditions.length > 1 ? { $and : allConditions } : _.first( allConditions );
			if( thisSelector.fields && thisSelector.fields !== "*" ) {
				thisSelector.fields = _.union( thisSelector.fields, "_id" ); // _id field is mandatory
				
				_.each( thisSelector.fields, function( thisField ) {
					projection[ thisField ] = true;
				} );
			}

			var cursor = _this._collection.find( mongoQuery, projection );
			cursor.toArray( function( err, records ) {
				if( err ) return next( err );

				// apply filter functions supplied in thisSelector.filters. allows for pseudo joins
				_.each( thisSelector.filters, function( thisFilter ) {
					records = _.filter( records, thisFilter );
				} );

				// apply skip and limit, now that filters have been applied
				if( thisSelector.limit || thisSelector.skip )
					records = records.splice( thisSelector.skip, thisSelector.limit );

				_.each( records, function( thisRecord ) {
					var recordId = thisRecord._id;

					recordsById[ recordId ] = recordsById[ recordId ] || {};
					_.extend( recordsById[ recordId ], thisRecord );
				} );

				callback();
			} );
		}, function( err ) {
			if( err ) return callback( err );

			// now all records are in recordsById, but we want the final payload to be an array
			var containerContents = _.values( recordsById );
			callback( null, containerContents );
		} );
	}
} );