var express = require( 'express' );
var steamer = require( '../src/steamer' );
var app = express();
var mongoClient = require( 'mongodb' ).MongoClient;
var contactsJson = require( './contacts.json' );

var MONGO_URI = 'mongodb://localhost';

prepareMongo( function( err, mongoDb ) {
	app.set( 'views', __dirname + '/views');
	app.set( 'view engine', 'jade');

	// create a steamer "boat" for every request with a mongo collection Container named 'contacts'
	app.use( function( req, res, next ) {
		req.ssData = new steamer.Boat( {
			containers : {
				contacts : new steamer.MongoCollectionContainer( { collection : mongoDb.collection( 'contacts' ) } ),
			}
		} );

		next();
	} );

	// use the steamer express middleware to automatically stuff our boat on render
	app.use( steamer.stuffMiddleware( "ssData" ) );

	app.use( app.router );

	app.get( '/', function( req, res ) {
		req.ssData.add( {
			contacts : {
				fields : [ 'firstName', 'lastName' ],
				skip : 1,
				limit : 5
			}
		} );

		req.ssData.add( {
			contacts : [ {
				fields : [ 'phone' ],
				skip : 1,
				limit : 2
			}, {
				fields : [ 'firstName', 'cell' ],
				where : { firstName : /^\w{1,4}$/ } // bring down cell for people with first name between 1 and 4 chars
			} ]
		} );

		res.render( 'index' );
	} );
} );

app.listen( 3000 );

function prepareMongo( callback ) {
	mongoClient.connect( MONGO_URI, {}, function( err, dbServer ) {
		if( err ) throw err;

		var mongoDb = dbServer.db( 'steamerTest' );

		mongoDb.dropDatabase( function( err ) {
			if( err ) return callback( err );

			mongoDb.collection( 'contacts' ).insert( contactsJson, function( err, result ) {
				if( err ) return callback( err );

				callback( null, mongoDb );
			} );
		} );
	} );
}