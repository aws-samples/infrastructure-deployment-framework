#!/bin/bash
python -m venv create_layer
source create_layer/bin/activate
pip install -r make_layer_requirements.txt
mkdir -p python/lib/python3.12/site-packages
cp -r create_layer/lib/python3.12/site-packages/shortuuid python/lib/python3.12/site-packages/
zip -r python.zip python
rm -r create_layer
rm -r python/