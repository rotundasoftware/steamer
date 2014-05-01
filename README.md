
# Steamer

In thick client web applications, one of the server's primary jobs is to load data and then simply relay it to the client. This task can be accomplished with less code and more clarity using a declarative (as opposed to an imperative) approach. Steamer is an tiny module that facilitates loading and relaying data declaratively.

## Simplest example ever
```javascript
steamer = require( 'steamer' );

var ssData = new steamer.Boat( {  // Boats are divided into "containers" that hold data.
	// We will be sourcing data from a mongo collection called 'contacts'.
	contacts : new steamer.MongoCollectionContainer( {
		collection : db.collection( 'contacts' )  // supply a reference to the collection
	} ),
	// ... other containers go here
} );

ssData.add( {
	contacts : {
		// Add an item to the contact container's "manifest" (i.e. list of contents).
		fields : [ 'firstName', 'lastName' ],
		where : { 'active' : true },  // standard mongo query
		limit : 100
	}
} );

// The `boat.stuff()` method asynchronously loads the data described by each container's manifest.
ssData.stuff( function( err, payload ) {
	if( err ) throw err;

	// `payload.contacts` is now an array of objects representing first 100 active contacts
	console.log( payload.contacts );
} );
```

## Example usage with Express

```javascript
// app.js
// Once our ducks are lined up loading and sending data in express.js apps is a one-liner.

// Install some middleware to create a boat on every request object
// with containers for our application's common data sources.
app.use( function( req, res, next ) {
	req.ssData = new steamer.Boat( {  // same as above
		contacts : new steamer.MongoCollectionContainer( {
			collection : db.collection( 'contacts' )
		} )
	} );

	next();
} );

// The Steamer express middleware can be used to automatically stuff a boat at req[ xyz ]
// and attach its payload to `res.locals[ xyz ]` when `res.render` is called.
app.use( steamer.stuffMiddleware( 'ssData' ) );

app.get( '/', function( req, res ) {
	// As our logic for a given route executes, we just add items to our boat's manifest...
	req.ssData.add( {
		contacts : {
			fields : [ 'firstName', 'lastName' ]
		}
	} );

	// ...and the appropriate data will automatically be loaded for us and
	// attached to `res.locals.ssData` when `res.render` is called.
	res.render( 'index.jade' );
} );
```
Then with a simple JSON dump, which we can do in our layout template,
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

Because containers are in charge of managing their own manifests and loading their own data (i.e. stuffing themselves), container classes can be designed to suit any data source or purpose. For example, you could easily define a redis container class that loads data by key name:
```javascript
ssData.add( {
	session : [ 'userId', 'permissions' ]
} );

ssData.stuff( function( err, payload ) {
	// `payload.session` might now be a hash of the form
	// { userId : 123, permissions : [ "read", "write" ] }
} )
```
And since containers generate their own payload, they can structure it with consideration for how it will be consumed. For example, Steamer's built in mongo collection container will merge fields from multiple calls to `boat.add()`, and ensure the `_id` field is always supplied with each record:
```javascript
ssData.add( { contacts : [ 'firstName' ] } );
ssData.add( { contacts : [ 'lastName' ] } );
ssData.stuff( function( err, payload ) {
	// `payload.contacts` will be an array of records, each of the form
	// { _id : 123, firstName : "xyz", lastName : "pdq" }
} );
```

## Reference

### The Boat object

#### `new Boat( containers )`

Creates a new boat. `containers` is a hash of named containers.

#### `boat.add( itemsByContainer )`

Adds items to the boat's manifest. `itemsByContainer` is a hash of items to add, keyed by container name. The boat calls the `add` method on each container with the supplied item for that container. Keys that do not correspond to a container are treated as ["bulk cargo"](http://en.wikipedia.org/wiki/Bulk_cargo) and stuffed without transformation.

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

Clears the boat's manifest by calling `container.reset()` on each container.

#### `boat.stuff( callback )`

Calls `stuff` on each of the boat's containers (in parallel), and `callback( err, payload )` when done, where `payload` is a hash of data keyed by container name (plus any "bulk cargo" entries).

### Defining containers

Steamer only comes with a mongo collection container. It is up to you to define containers for other data sources. Containers must implement three methods, `add`, `reset`, and `stuff`, which are called by the corresponding `boat` methods. Let's see how to implement a redis container like the one we used above.

```javascript
RedisContainer = function( options ) {
	this._keys = [];
	this._client = options.client;  // Save a reference to our redis client.

	return this;
};

RedisContainer.prototype.add = function( item ) {
	// Add an item, which can be a key or array of keys, to our manifest.
	this._keys = this._manifest.concat( item );
};

RedisContainer.prototype.reset = function() {
	this._keys = [];
};

RedisContainer.prototype.stuff = function( callback ) {
	async.map( this._keys, client.get, function( err, values ) {  // Get values from redis.
		if( err ) return callback( err );

		var payload = _.object( keys, values );  // Make a hash from our keys + values.
		callback( null, payload );  // Return it as the stuffed contents of this container.
	} );
};
```
Now we can initialize our boat with both a mongo container and a redis container.
```
app.use( function( req, res, next ) {
	req.ssData = new steamer.Boat( {
		contacts : new steamer.MongoCollectionContainer( {
			collection : mongoDb.collection( 'contacts' )
		} ),
		session : new RedisContainer( { client : redisClient } )
	} );

	next();
} );
```

Easy.

### The built-in mongo collection container

When instantiating the built in mongo collection container, pass it an `options` object with a reference to the collection, as shown above. When adding to the container's manifest, supply a "selector" object:

```javascript
req.ssData.add( {
	contacts : {
		fields : '*',
		where : { group: { $in: [ 'business', 'personal' ] } },
		sort : { lastName : 1, firstName : 1 },
		skip : 200,
		limit : 100
	}
} );
```

* `fields` may be single field name, an array of field names, or an asterisk, indicating that all fields of the selected records should be included in the payload. The special `_id` field is always included.
* `where` can be any valid [mongo query](http://docs.mongodb.org/manual/tutorial/query-documents/).
* `sort` has the same semantics and format as in mongo's [`cursor.sort()`](http://docs.mongodb.org/manual/reference/method/cursor.sort/).
* `skip` and `limit` have the same semantics as mongo's [`cursor.skip()`](http://docs.mongodb.org/manual/reference/method/cursor.skip/) and [`cursor.limit()`](http://docs.mongodb.org/manual/reference/method/cursor.skip/)

You can also provide an array of selector objects (equivalent to calling `boat.add()` once for each selector):

```javascript
req.ssData.add( {
	contacts : [ {
		fields : [ 'firstName', 'lastName' ],  // load first and last name for all contacts
	}, {
		fields : '*',
		where : { _id : req.session.contactId }  // and all fields just for the logged in contact
	} ],
	// ...
} );
```

## License

MIT