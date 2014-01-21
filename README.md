
Streamline sending data to the client in your node.js applications.

# ShipIt

Now that our clients are thick and our servers are thin, one of the server's primary jobs is to bootstrap or relay data down to the client. ShipIt is an very tiny and flexible library that streamlines this process by leveraging the fact that it is more succinct and clear to declaratively list the data that should sent to the client than it is to imperatively load and send it.

## Example


```javascript

// install the shipIt middleware configured with a mongo collection container named 'contacts'
app.use( shipIt.middleware( [ {
	containerName : "contacts",
	type : shipIt.Containers.MongoCollection,
	options : { collection : mongoDb.collection( 'contacts' ) }
} ] ) );

app.get( '/', function( req, res ) {

	// Now req.ssData is supplied on every request by the shipIt middleware. Think of it as a "boat
	// of data" that is organized into named containers. You supply the manifest (i.e. list of 
	// contents) for each container, and then the data itself is automatically loaded for you.
	req.ssData.add( {
		contacts : {
			// add the names of the first 100 active contacts to the container's manifest
			fields : [ 'firstName', 'lastName' ]
			where : { 'active' : true }
			limit : 100
		}
	} );

	// the data in the ship's manifest is automatically loaded when render is called
	res.render( "index.jade" );
} );
```

In index.jade

```jade
doctype html5
html
	head
		title "Example"
		| !{ssData}
	body
		// ...
```

Now the array of contact data will automatically be available in the browser at `window.ssData.contacts`. Wasn't that easy!
