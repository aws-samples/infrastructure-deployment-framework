# Create a virtual environment
python -m venv create_layer

# Activate the virtual environment
.\create_layer\Scripts\Activate.ps1

# Install requirements
pip install -r make_layer_requirements.txt

# Create the directory structure
New-Item -ItemType Directory -Path "python\lib\python3.12\site-packages" -Force

# Copy the shortuuid package
Copy-Item -Path "create_layer\Lib\site-packages\shortuuid" -Destination "python\lib\python3.12\site-packages" -Recurse

# Create a zip file of the python directory
Compress-Archive -Path "python" -DestinationPath "python.zip" -Force

# Remove the create_layer directory
Remove-Item -Path "create_layer" -Recurse -Force

# Remove the python directory
Remove-Item -Path "python" -Recurse -Force
