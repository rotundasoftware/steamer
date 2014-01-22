
# Steamer

In modern web applications, one of the server's primary jobs is to load data and then simply relay it to the client. This task can be accomplished with less code and more clarity using a declarative (as opposed to an imperative) approach. Steamer is an tiny module that facilitates loading and relaying data declaratively.

## Example

```javascript
// app.js
// Create a Steamer "boat" for every request, divided into containers we will fill with data.
app.use( function( req, res, next ) {
	req.ssData = new steamer.Boat( {
		containers : {
			// We will be loading data from a mongo collection called 'contacts'.
			contacts : new steamer.Containers.MongoCollection( {
				collection : mongoDb.collection( 'contacts' )
			} ),
			... // other "containers" go here
		}
	} );

	next();
} );

// Use the Steamer express middleware to automatically "stuff" our boat when we are done
app.use( steamer.stuffMiddleware( 'ssData' ) );

app.get( '/', function( req, res ) {
	// As your logic for a given route executes, you may add to the manifest (i.e. list 
	// of contents) that will be loaded into each "container" in your boat.
	req.ssData.add( {
		contacts : {
			// add the names of the first 100 active contacts to the contact container's manifest
			fields : [ 'firstName', 'lastName' ]
			where : { 'active' : true } // standard mongo query
			limit : 100
		}
	} );

	res.render( 'index.jade' );
} );
```

In index.jade

```jade
doctype html5
html
	head
		title 'Example'
		script.
			window.ssData = !{ JSON.stringify( ssData ) }
	body
		// ...
```

Now the array of contact data will be in the browser at `window.ssData.contacts`. Wasn't that easy!

## Details

As you can tell, the shipping metaphor runs deep in this repo. The object you will be interfacing with on the server side is a "boat". When you run through your server side logic, you will create a "manifest" for this boat, which declares all the data that should be loaded and sent to the client. When you are finished, you will "stuff" the boat with its contents and send them down with the response. The Steamer express middleware provides an added level of convenience by "stuffing" a boat automatically when `res.render` is called.

Because containers are in charge of loading their own data (i.e. stuffing themselves), it is very easy to define your own container classes that use whatever declarative manifests make the most sense given your data source. For example, you could easily define a redis container type that loads data by key name:
```javascript
req.ssData.add( {
	session : [ 'userId', 'permissions' ]
} );
```
(You can an implementation of a redis container type below.) Boats can also contain "bulk cargo", which is data that is not in any named container. This data is simply passed through to the client directly.

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

## Reference

#### `new Boat( containers )`

Creates a new boat. `containers` is a hash of named containers.

#### `boat.add( itemsByContainer )`

Adds items to the boat's manifest. `itemsByContainer` is a hash of items to add, keyed by container name. The boat calls the `add` method on each container with the supplied item for that container. (Therefore it is ultimately the container that determines how to add its item to its own manifest). Keys that do not correspond to any container are treated as "bulk cargo", meaning they are passed through to the client without transformation.

#### `boat.reset()`

Clears the boat's manifest.

#### `boat.stuff( callback )`

Calls `stuff` on each of the boat's containers (in parallel), and `callback( err, payload )` when done, where `payload` is a hash of data keyed by container name (plus any "bulk cargo" entries). The optional express middleware automatically calls this method and attaches the payload to `res.locals`.

### Container reference

Containers have an initializer and three methods, `add`, `reset`, and `stuff`, which are analogous to the corresponding `boat` methods. It is easy to make your own container types. For instance, here is an implementation of the redis container we used above:

```javascript
var steamer = require( 'steamer' );

RedisContainer = steamer.Containers.Base.extend( {
	initialize : function( options ) {
		// Called when a container is instantiated.
		this._manifest = [];
		this._client = options.client;  // Save a reference to our redis client.
	},

	add : function( keys ) {
		// Add an item (a key or array of keys) to our manifest.
		this._manifest = this._manifest.concat( keys );
	},

	stuff : function( callback ) {
		var keys = this._manifest;
		async.map( keys, client.get, function( err, values ) {  // Get values from redis.
			if( err ) return callback( err );

			var payload = _.object( keys, values );  // Make a hash from our keys + values.
			callback( null, payload );  // Return it as the stuffed contents of this container.
		}
	},
} );
```
Now we can initialize our boat with both a mongo container and a redis container:
```
app.use( function( req, res, next ) {
	req.ssData = new steamer.Boat( {
		containers : {
			contacts : new steamer.Containers.MongoCollection( {
				collection : mongoDb.collection( 'contacts' )
			} ),
			session : new RedisContainer( { client : redisClient } );
		}
	} );

	next();
} );
```

Easy.