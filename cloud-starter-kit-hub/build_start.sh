#!/bin/bash
./node_modules/.bin/uglifyjs src/scripts/preload.js -o src/scripts/preload.min.js

scripts=("src/scripts/main.js" "src/scripts/preload.js" "src/scripts/preload.min.js")
for i in "${scripts[@]}"
do
   ./node_modules/.bin/eslint $i
done

rm test/renderer.concat.js
touch test/renderer.concat.js

scripts=("src/scripts/utilities.js" "src/scripts/task-queue.js" "src/scripts/stack-monitoring.js" "src/scripts/deployments.js" "src/scripts/get-amis-and-instance-types.js" "src/scripts/get-db-engines-and-instance-types.js" "src/scripts/sdk-commands.js" "src/scripts/renderer.js")
for i in "${scripts[@]}"
do
   echo "

/*
* ###########################################
* ## ${i}
* ###########################################
*/
" >> test/renderer.concat.js
   cat $i >> test/renderer.concat.js
done

./node_modules/.bin/uglifyjs test/renderer.concat.js -o src/scripts/renderer.min.js

./node_modules/.bin/eslint test/renderer.concat.js

# ./node_modules/.bin/eslint src/scripts/renderer.min.js

npm run start