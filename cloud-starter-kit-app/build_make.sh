#!/bin/bash
./node_modules/.bin/uglifyjs src/scripts/preload.js -o test/preload.min.js -c drop_console=true

echo "
/*
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
* FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
* COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
* IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
* CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
" > src/scripts/preload.min.js

cat test/preload.min.js >> src/scripts/preload.min.js

if ! rm test/renderer.concat.js; then
    echo "Error: Failed to remove test/renderer.concat.js" >&2
    exit 1
fi

if ! touch test/renderer.concat.js; then
    echo "Error: Failed to create test/renderer.concat.js" >&2
    exit 1
fi

scripts=("src/scripts/utilities.js" "src/scripts/task-queue.js" "src/scripts/stack-monitoring.js" "src/scripts/deployments.js" "src/scripts/get-amis-and-instance-types.js" "src/scripts/get-bedrock-models.js" "src/scripts/get-db-engines-and-instance-types.js" "src/scripts/sdk-commands.js" "src/scripts/renderer.js")
for i in "${scripts[@]}"
do
   echo "

/*
* ###########################################
* ## ${i}
* ###########################################
*/
" >> test/renderer.concat.js
   if ! cat $i >> test/renderer.concat.js; then
       echo "Error: Failed to append $i to test/renderer.concat.js" >&2
       exit 1
   fi
done

if ! ./node_modules/.bin/uglifyjs test/renderer.concat.js -o test/renderer.min.js -c drop_console=true -m; then
    echo "Error: Failed to minify test/renderer.concat.js" >&2
    exit 1
fi

echo -e "
/*
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
* FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
* COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
* IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
* CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

" > src/scripts/renderer.min.js

if ! cat test/renderer.min.js >> src/scripts/renderer.min.js; then
    echo "Error: Failed to append test/renderer.min.js to src/scripts/renderer.min.js" >&2
    exit 1
fi

if ! npm run make; then
    echo "Error: npm run make failed" >&2
    exit 1
fi