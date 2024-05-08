import assertType from '@rotundasoftware/assert-type';

export default class {
    #hash = {};
    #keys = [];

    constructor( hash = {} ) {
        assertType( { containers }, 'object' );
        
        this.#hash = hash;
    }

    add( keys ) {
        this.#keys = this.#keys.concat( keys );
    }

    stuff() {
        const contents = this.#keys.reduce( ( acc, key ) => {
            if( key in this.#hash ) acc[ key ] = this.#hash[ key ];
            return acc;
        }, {} );

        return contents;
    }
}