#!/usr/bin/env node

const { setup_env_remote, error_handler } = require('../src/cml');

setup_env_remote().catch(e => error_handler(e));
