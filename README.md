
# Steamer

In modern web applications, one of the server's primary jobs is to load data and then simply relay it to the client. This task can be accomplished with less code and more clarity using a declarative (as opposed to an imperative) approach. Steamer is an tiny module that facilitates loading and relaying data declaratively.

## Simplest example ever
```javascript
steamer = require( 'steamer' );
// ...

var ssData = new steamer.Boat( {  // Boats are divided into "containers" that hold data.
	containers : {  // Declare and instantiate the containers in this boat.
		// We will be loading data from a mongo collection called 'contacts'.
		contacts : new steamer.MongoCollectionContainer( {
			collection : db.collection( 'contacts' )  // supply a reference to the collection
		} ),
		// ... other containers go here
	}
} );

ssData.add( {
	contacts : {
		// add an item to contact container's "manifest" (i.e. list of contents)
		fields : [ 'firstName', 'lastName' ]
		where : { 'active' : true }  // standard mongo query
		limit : 100
	}
} );

// the `boat.stuff()` method loads the data described by each container's manifest
ssData.stuff( function( err, payload ) {
	if( err ) throw err;

	console.log( payload.contacts ); // Contains names of first 100 active contacts
} );
```

## Example usage with Express

```javascript
// app.js
// ...

// Install some middleware to create a boat on every request object
// with containers for our application's common data sources.
app.use( function( req, res, next ) {
	req.ssData = new steamer.Boat( {  // same as above
		containers : {
			contacts : new steamer.MongoCollectionContainer( {
				collection : db.collection( 'contacts' )
			} )
		}
	} );

	next();
} );

// The Steamer express middleware can be used to automatically stuff a boat at req[ xyz ]
// and attach its payload to `res.locals[ xyz ]` when `res.render` is called.
app.use( steamer.stuffMiddleware( 'ssData' ) );

/***** routes *****/

app.get( '/', function( req, res ) {
	// Now as our logic for a given route executes, we just add items to our boat's manifest...
	req.ssData.add( {
		contacts : {
			fields : [ 'firstName', 'lastName' ]
		}
	} );

	// ...and they will automatically be loaded for us and attached
	// to `res.locals.ssData` when `res.render` is called
	res.render( 'index.jade' );
} );
```
So with a simple data dump, which we can do in our layout template,
```jade
doctype html5
html
	head
		script.
			window.ssData = !{ JSON.stringify( ssData ) }
	body
		// ...
```

The array of contact data will be in the browser at `window.ssData.contacts`. Wasn't that easy!

## The power of containerization

Because containers are in charge of managing their own manifests and loading their own data (i.e. stuffing themselves), container classes can be designed to suit any data source. For example, you could easily define a redis container type that loads data by key name:
```javascript
ssData.add( {
	session : [ 'userId', 'permissions' ]
} );
ssData.stuff( function( err, payload ) {
	// `payload.session` might now be a hash of the form
	// { userId : 123, permissions : [ "read", "write" ] }
} )
```
And since containers generate their own payload, they can structure it with consideration for how it will be consumed. For example, Steamer's built in mongo collection container will merge fields from multiple manifest items, and ensure the `_id` field is supplied with each record:
```javascript
ssData.add( { contacts : [ 'firstName' ] } );
ssData.add( { contacts : [ 'lastName' ] } );
ssData.stuff( function( err, payload ) {
	// `payload.contacts` will be an array of records, each of the form
	// { _id : 123, firstName : "xyz", lastName : "pdq" }
} );
```

## Reference

#### `new Boat( containers )`

Creates a new boat. `containers` is a hash of named containers.

#### `boat.add( itemsByContainer )`

Adds items to the boat's manifest. `itemsByContainer` is a hash of items to add, keyed by container name. The boat calls the `add` method on each container with the supplied item for that container. (Therefore it is ultimately the container that determines how to add its item to its own manifest). Keys that do not correspond to any container are treated as "bulk cargo", meaning they are passed through to the client without transformation.

```javascript
req.ssData.add( {
	contacts : {  // mongo collection container
		fields : '*',
		sort : { lastName : 1 }
	}
	session : [ 'userId', 'permissions' ], // redis container
	pricingTable : require( "./data/pricingTable.json" ) // "bulk cargo"
} );
```

#### `boat.reset()`

Clears the boat's manifest by calling `container.clear()` on each container.

#### `boat.stuff( callback )`

Calls `stuff` on each of the boat's containers (in parallel), and `callback( err, payload )` when done, where `payload` is a hash of data keyed by container name (plus any "bulk cargo" entries).

### Container reference

Containers must implement three methods, `add`, `reset`, and `stuff`, which are all called by the corresponding `boat` methods. To define your own container type, simply define a class with these methods. Let's see how to implement a redis container like the one in the examples above.

```javascript
RedisContainer = function( options ) {
	this._keys = [];
	this._client = options.client;  // Save a reference to our redis client.

	this.add = function( item ) {
		// Add an item (a key or array of keys) to our manifest.
		this._keys = this._manifest.concat( item );
	};

	this.reset = function() {
		this._keys = [];
	};

	this.stuff : function( callback ) {
		async.map( this._keys, client.get, function( err, values ) {  // Get values from redis.
			if( err ) return callback( err );

			var payload = _.object( keys, values );  // Make a hash from our keys + values.
			callback( null, payload );  // Return it as the stuffed contents of this container.
		}
	};

	return this;
};
```
Now we can initialize our boat with both a mongo container and a redis container:
```
app.use( function( req, res, next ) {
	req.ssData = new steamer.Boat( {
		containers : {
			contacts : new steamer.MongoCollectionContainer( {
				collection : mongoDb.collection( 'contacts' )
			} ),
			session : new RedisContainer( { client : redisClient } );
		}
	} );

	next();
} );
```

Easy.