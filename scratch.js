var dumper = new Dumper( {
	response : res,
	services : {
		mr : new Dumper.MongoCollection( { tableName : "ministers" } ),
		sv : new Dumper.MongoCollection( { tableName : "services" } )
	}
} );

var dumper = new Dumper( {
	response : res,
	mongoTables : [ "ministers", "services" ]
} );

res.dumper.add( {
	ministers : {
		where : { $in : [ "hello", "there" ] },
		fields : "*"
	},
	whatever : cool
} );

dumper wraps render. puts dumper data at res.dumperLoad

{% if dumperLoad %}
    {{ dumperLoad | safe }}
{% endif %}
   		

dumper is included on client as well, and picks everything up, sticks it in

Dumper.data

of dumperLoad just puts everything in 

minsitersColleciton = new Backbone.Collection( dumper.mr )

===============

this library makes it easy to pass on data to the client. its like a freight train
don't need to process it.. don't need to 

main functinos for each car class...
	merge one manifest with another
	prepare : load (superset of) data needed to deliver json described by manifest
	pack : car with json described by manifest.. function( manifest, dataFromPrepare )


convert selector to 

MongoCollectionCar = Base.extend( {
	prepare : function( manifest, callback ) {
		manifest = _.extend( {
			fields : [],
			where : {},
			skip : 0,
			limit : 0
		}, manifest );

		var collectionName = manifest.tableName;

		var allConditions = [];
		if( manifest.where ) allConditions.push( manifest.where );

		var projection = {};

		var mongoQuery = allConditions.length > 1 ? { $and : allConditions } : _.first( allConditions );
		if( manifest.fields && manifest.fields !== "*" ) {
			_.each( manifest.fields, function( thisField ) {
				projection[ thisField ] = true;
			} );
		}

		var collection = _this._database.collection( collectionName );
		var cursor = collection.find( mongoQuery, projection );
		cursor.toArray( function( err, records ) {
			if( err ) return next( err );
			
			callback( records );
		} );
	} );
} );


selector is like this:

{
	where : { $in : [ "hello", "there" ] },
	fields : "*",
	skip : 0,
	limit : 0
}