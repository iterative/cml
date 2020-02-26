## Install
```
npm install json-to-markdown-table2
```

## Info

`json-to-markdown-table2` convert a JSON object to markdown table format. this component depend on [`json-to-table`](https://github.com/Growmies/json-to-table), just convert the format to markdown syntax. 

## Usage
```Javascript
const jsonToMarkdown2 = require('json-to-markdown-table2');

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

```


## Options
Some available options to pass in as the second argument are as follows.  
Look at the tests to see all of these options in action.  
```
{
  defaultVal: put whatever you want here //defaults to an empty string
  includeCollectionLength: if there is a subarray within the object, it will create a header and include that length //defaults to false
  excludeSubArrays: if there is a subarray within the object, it will remove it completely from the resulting table. //defaults to false
  checkKeyBeforePath: this will check for a key that has a '.' in it before assuming the '.' means to look deeper in the object //defaults to false
  listSubArrays: if there is a subarray that does not contain objects, it will list the full array instead of breaking it up into individual columns. //defaults to false
}
```