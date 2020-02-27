import typescript from 'rollup-plugin-typescript2'
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

import pkg from './package.json'

export default {
    input: 'src/index.ts',
    output: {
        sourcemap: true,
        format: 'iife',
        name: 'Gived',
        file: pkg.main
    },
    external: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
    ],

    plugins: [
        resolve({
            browser: true,
        }),
        commonjs(),
        typescript({
            typescript: require('typescript'),
        }),
    ],
}