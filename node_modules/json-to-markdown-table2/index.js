const jsonToTable = require('json-to-table');
 
module.exports = function(obj, options){
    if(typeof(obj) == 'undefined'){
        return '';
    }
    let tabled = jsonToTable(obj, options);
    let results = [];
    tabled.forEach((val, idx)=>{
        results.push('|'+val.join('|')+'|');
        if(idx === 0){
            let temp = '|';
            for(let i = 0;i < val.length; i++){
                temp += '----|';
            }
            results.push(temp);
        }
    });
    return results.join('\n');
}