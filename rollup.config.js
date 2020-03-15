import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

import pkg from './package.json'

export default [{
    input: 'src/lib.ts',
    output: {
        sourcemap: true,
        format: 'cjs',
        name: 'lib',
        file: pkg.main
    },

    plugins: [
        resolve({
            browser: true,
        }),
        commonjs(),
        typescript({
            typescript: require('typescript'),
        }),
    ],
}, {
    input: 'src/index.ts',
    output: {
        sourcemap: true,
        format: 'iife',
        name: 'Gived',
        file: 'dist/gived.js'
    },

    plugins: [
        resolve({
            browser: true,
        }),
        commonjs(),
        typescript({
            typescript: require('typescript'),
        }),
    ],
}]