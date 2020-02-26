#!/usr/bin/env node

const main = async () => {
    process.env['AWS_ACCESS_KEY_ID'] = 'AKIAVLZY3QD2QBW65BX3';
    process.env['AWS_SECRET_ACCESS_KEY'] = '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';

    process.env['INPUT_GITHUB_TOKEN'] = 'ea61487d246d9f8ab808b0eba04099715b370306';
    process.env['INPUT_DVC_REPRO_FILE'] = 'eval.dvc';
    process.env['INPUT_SKIP_CI'] = '[ci skip]';
    
    process.env['GITHUB_EVENT_NAME'] = 'push';
    process.env['GITHUB_WORKFLOW'] = 'default';
    process.env['GITHUB_REPOSITORY'] = 'DavidGOrtega/dvc-mnist-intro'; // git remote get-url origin
    process.env['GITHUB_HEAD_REF'] = 'branch55'; // git rev-parse --abbrev-ref HEAD
    process.env['GITHUB_SHA'] = 'd6ec39f16be2bb26260a2bd33b44950e84f9f500'; // git rev-parse HEAD
    
    
    //const { dvc_action } = require('./index');
    //process.exit();
}
main();


