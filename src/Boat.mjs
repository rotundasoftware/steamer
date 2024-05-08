import assertType from '@rotundasoftware/assert-type';

export default class {
    #containers = {};
    #singleValues = {};

    constructor( containers = {} ) {
        assertType( { containers }, 'object' );

        this.#containers = containers;
    }

    add( items ) {
        assertType( { items }, 'object' );

        Object.keys( items ).forEach( itemName => {
            const container = this.#containers[ itemName ];
            const itemValue = items[ itemName ];

            if( container ) {
                container.add( itemValue );
            } else {
                this.#singleValues[ containerOrVariableName ] = itemValue;
            }
        } )
    }

    async stuff() {
        try {
            const containerNames = Object.keys( this.#containers );
            const stuffPromises = containerNames.map( containerName => this.#containers[ containerName ].stuff() );
            const stuffResults = await Promise.all( stuffPromises );
            const contentsByContainer = containerNames.reduce( ( acc, containerName, index ) => {
                acc[ containerName ] = stuffResults[ index ];
                return acc;
            }, {} );
            const contents = { ...contentsByContainer, ...this.#singleValues };
            return contents;
        } catch ( err ) {
            throw new Error( 'Unexpected error while stuffing boat', { cause : err } );
        }
    }
}