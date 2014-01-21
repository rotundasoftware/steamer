
# ShipIt

Now that our clients are thick and our servers are thin, one of the server's primary jobs is just to load data and then bootstrap or relay it to the client. ShipIt is an very tiny module that allows this task to be performed with less code and more clarity by switching the imperative, manual approach for a declarative, automated one.

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

Now the array of contact data will be in the browser at `window.ssData.contacts`. Wasn't that easy!

## Details

As you can tell, we are running with the shipping metaphor in this repo. The object you will be interfacing with on the server side is a ShipIt "boat". When you run through your server side logic, you will create a "manifest" for this boat, which declares all the data that should be loaded and sent to the client. When you are finished, you will "stuff" the boat with its contents and send them down with the response. The ShipIt express middleware provides an added level of convenience by both creating a ShipIt boat on every request object and also "stuffing" the boat automatically when `res.render` is called. 

The ShipIt middleware creates a ShitIt "Boat" object on every request and attaches it to the express request object. 