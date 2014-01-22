
# ShipIt

Now that our clients are thick and our servers are thin, one of the server's primary jobs is just to load data and then bootstrap or relay it to the client. ShipIt is an very tiny module that allows this task to be performed with less code and more clarity by switching up the imperative, manual approach for a declarative, automated one.

## Example


```javascript

// create a ShipIt "boat" for every request with a "mongo collection container" named 'contacts'
app.use( function( req, res, next ) {
	req.ssData = new shipIt.Boat( {
		containers : {
			contacts : new shipIt.Containers.MongoCollection( { collection : mongoDb.collection( 'contacts' ) } ),
			... // other 'containers' would go here
		}
	} );

	next();
} );

// use the ShipIt express middleware to automatically "stuff" our boat when we are done (optional)
app.use( shipIt.stuffMiddleware( "ssData" ) );

app.get( '/', function( req, res ) {
	// As your server side logic executes, you may add to the manifest (i.e. list of 
	// contents) that will be loaded into each "container" in your boat.
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

As you can tell, the shipping metaphor runs deep in this repo. The object you will be interfacing with on the server side is a ShipIt "boat". When you run through your server side logic, you will create a "manifest" for this boat, which declares all the data that should be loaded and sent to the client. When you are finished, you will "stuff" the boat with its contents and send them down with the response. The ShipIt express middleware provides an added level of convenience by "stuffing" a boat automatically when `res.render` is called.

Containers are in charge of loading their own data (i.e. stuffing themselves). Thus it is very easy to define your own container classes that load whatever kind of data you want using whatever manifests make this most sense given that data. For example, you could easily define a redis container type that loads data by a key name manifest:
```javascript
req.ssData.add( {
	session : [ 'userId', 'permissions' ]
} );
```
Now `window.ssData.session` on the client will be filled with the appropriate entries:
```json
{ "userId" : 3245, "permissions" : [ "read", "write" ] }
```