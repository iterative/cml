const { builder, handler } = require('../../cml/repo/prepare');

exports.command = 'ci';
exports.description = 'Prepare Git repository for CML operations';
exports.handler = handler;
exports.builder = builder;
