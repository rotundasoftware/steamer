var _ = require( 'underscore' );
var async = require( "async" );
var Class = require( "./class" );
var BaseContainer = require( "./baseContainer" );

module.exports = BaseContainer.extend( {
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
				sort : null,
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
			if( thisSelector.sort ) cursor.sort( thisSelector.sort );
			
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