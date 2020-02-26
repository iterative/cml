# v4
We decided as a company that the fixes introduced in v3 are not going to be 
used in our app, and as a way to ensure we don't use those changes, we are
reverting that portion of the code, and bumping up to v4.  If the bugfix found
in v3 is important to you, you'll have to use v3 explicitly, but please be aware
WE WILL NOT be backporting future bugfixes/feature to v3.  We are sorry if this
creates any issues for you.  If you have suggestions for a more robust solution,
please open up a Github Issue and let us know!

### v4.0.0
Undo the code change made in v3, but only tweak the tests to make sure we keep
that unexpected behaviour in the future.

We also started using es6 code here in v4, so be aware.

# v3
We bumped to v3 here because by fixing this bug, we potentially introduced 
a lot of broken metrics in the main app we are using this module for.

### v3.0.0
Fixed a bug where arrays weren't playing nice when the exludeSubArrays option
was true, AND when one of the *arrays* was null (ie. it was a leaf).  That was
causing an issue since one of the *arrays* was a leaf, then it was a valid
path to data.  So when creating the table, it would include a column at that
point, and so the cells where the array wasn't null were being included as whole
arrays. This seemed wrong especially since exludeSubArrays was set to true.

See these tests more easily visualize the issue  
- Should handle when a nested array has data for 1 object, but is null (which means is a leaf) in another object
- Should handle when a nested array has data for 1 object, but is a primitive (which means is a leaf) in another object


# v2
### v2.1.5
Fixed an edge case with checkKeyBeforePath where the actual name of the key 
was something like ".ba`d"
