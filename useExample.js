
new ShipIt( {
	response : res,
	containers : {
		mr : new MongoCollectionContainer( { tableName : "ministers" } )
	}
} );