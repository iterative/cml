const jsonToMarkdown2 = require('./index');

const myRecords = [
{
    name:'Bob',
    address:{zip:12345, state:'Euphoria'}
},
{
    name:'Jon',
    address:{street:'1234 Main St.', state:'Arizona'}
}];
const tabled = jsonToMarkdown2(myRecords);

console.log(tabled);
// |name|address.zip|address.state|address.street|
// |----|----|----|----|
// |Bob|12345|Euphoria||
// |Jon||Arizona|1234 Main St.|


const tabled2 = jsonToMarkdown2(myRecords, {defaultVal:'--'});

console.log(tabled2);
// |name|address.zip|address.state|address.street|
// |----|----|----|----|
// |Bob|12345|Euphoria|--|
// |Jon|--|Arizona|1234 Main St.|