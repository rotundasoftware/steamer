/*
 * Steamer stuffMiddleware
 * Copyright (c)2014 Rotunda Software, LLC.
 * Distributed under MIT license
 * http://github.com/rotundasoftware/steamer
*/

module.exports = function( boatName ) {
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