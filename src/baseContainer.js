
var _ = require( 'underscore' );
var Class = require( "./class" );

module.exports = BaseContainer = Class.extend( {
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