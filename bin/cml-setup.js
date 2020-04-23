#!/usr/bin/env node

const { setup, error_handler } = require('../src/cml');

setup().catch(e => error_handler(e));
