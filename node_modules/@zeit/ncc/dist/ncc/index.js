const { readFileSync, writeFileSync } = require('fs'), { Script } = require('vm'), { wrap } = require('module');
const source = readFileSync(__dirname + '/index.js.cache.js', 'utf-8');
const cachedData = !process.pkg && require('process').platform !== 'win32' && readFileSync(__dirname + '/index.js.cache');
const script = new Script(wrap(source), cachedData ? { cachedData } : {});
(script.runInThisContext())(exports, require, module, __filename, __dirname);
if (cachedData) process.on('exit', () => { try { writeFileSync(__dirname + '/index.js.cache', script.createCachedData()); } catch(e) {} });
