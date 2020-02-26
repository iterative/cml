#IMPORTANT NOTE
See the CHANGELOG for explanation of v3 vs v4.

##Install
```
npm install json-to-table
```

##Info
json-to-table converts an array of Javascript objects into a table format.

The column headers are all the possible "leaves" of the javascript objects.


##Usage
```Javascript
const jsonToTable = require('json-to-table');

const myRecords = [
{
    name:'Bob',
    address:{zip:12345, state:'Euphoria'}
},
{
    name:'Jon',
    address:{street:'1234 Main St.', state:'Arizona'}
}];
const tabled = jsonToTable(myRecords);

//tabled will be an array of arrays like this
//[
//['name', 'address.zip', 'address.state', 'address.street'],
//['Bob',  12345,         'Euphoria',      ''],
//['Jon',  '',            '1234 Main St.', 'Arizona']
//]
```

##Options
Some available options to pass in as the second argument are as follows.  
Look at the tests to see all of these options in action.  
```
{
  defaultValue: put whatever you want here //defaults to an empty string
  includeCollectionLength: if there is a subarray within the object, it will create a header and include that length //defaults to false
  excludeSubArrays: if there is a subarray within the object, it will remove it completely from the resulting table. //defaults to false
  checkKeyBeforePath: this will check for a key that has a '.' in it before assuming the '.' means to look deeper in the object //defaults to false
  listSubArrays: if there is a subarray that does not contain objects, it will list the full array instead of breaking it up into individual columns. //defaults to false
}
```
##Notes
If a particular object did not have a key that another one did, the default will be an empty string. 
You can change the default value by passing an option in as the second parameter of the function call. 
If you explicitly pass ```undefined``` in as the second value, your defaults will be undefined.

```Javascript
const jsonToTable = require('json-to-table');

const myRecords = [
{
    name:'Bob',
    address:{zip:12345, state:'Euphoria'}
},
{
    name:'Jon',
    address:{street:'1234 Main St.', state:'Arizona'}
}];
const tabled = jsonToTable(myRecords, 'MY_DEFAULT_STR!!');

//tabled will be an array of arrays like this
//[
//['name', 'address.zip',     'address.state', 'address.street'],
//['Bob',  12345,             'Euphoria',      'MY_DEFAULT_STR!!'],
//['Jon',  'MY_DEFAULT_STR!!','Arizona',       '1234 Main St.']
//]
```

Also note that in this example, the address.zip was a number, and stayed a number. 


## License (ISC)
Copyright (c) 2015, Scott Hillman <hillmanov@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted,
provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
