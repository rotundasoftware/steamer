/*
 * Steamer Mongo Collection Container
 * Copyright (c)2014 Rotunda Software, LLC.
 * Distributed under MIT license
 * http://github.com/rotundasoftware/steamer
*/

var _ = require( 'underscore' );

var HashContainer = function( options ) {
	this._hash = options.hash;
	this._keys = [];

	return this;
};

HashContainer.prototype.add = function( key ) {
	// Supports adding either a single key array of keys.
	this._keys = this._keys.concat( key );
};

HashContainer.prototype.reset = function() {
	this._keys = [];
};

HashContainer.prototype.stuff = function( callback ) {
	var _this = this;
	var containerContents = {};

	this._keys.forEach( function( thisKey ) {
		if( thisKey in _this._hash ) containerContents[ thisKey ] = _this._hash[ thisKey ];
	} );

	callback( null, containerContents );
};

module.exports = HashContainer;