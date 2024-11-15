
# Building the CSK App
 


[Download the code](https://github.com/aws-samples/infrastructure-deployment-framework), unzip it and `cd` into the `cloud-starter-kit-app` directory. 

You will need to now navigate to the root of the filesystem you just unzipped via a command-line interface. Use `Terminal` if you are on a Mac, or `Powershell` (right-click Powershell and choose `Run as Administrator`) if you are on Windows.

From your command line, `cd` into the directory root and run the following command:

```
npm install
```

This will install all the dependencies for the app.

### Launching the app

There are two ways can run the app - developer mode and build mode.

**Developer mode** compiles the app for the OS you are running it on, and launches it automatically in the context of your current session. This is ideal for iterative testing, debugging and development of new features but note that it has more access to your local environment than your final standalone app will have.

**Build mode** compiles the app and wraps it with an installer for the OS you are building it on. This version of the app is properly sandboxed and behaves as it will when installed by your app's users. It does not launch automatically - you will need to find the binary executable in the `out` directory. Under `out/make` you will find installer packages.

>NOTE before you distribute the app to end users you should sign it. If you don't sign it, end users will need to take extra steps to bypass their OS's "unsigned app" warnings.

#### If you are on a Mac

There are two `bash` scripts you can use to launch the app. First, set them to be executable:

```
chmod +x build_make.sh build_start.sh 
```

and then start the Electron app in developer mode by running this command:

```
./build_start.sh
```

or build a standalone packaged Electron app by running:

```
./build_make.sh
```

#### If you are on Windows

There are two unsigned `Powershell` scripts you can use to launch the app. As above, you will need to be running Powershell as an Administrator to allow the execution of unsigned scripts.

To allow the execution of unsigned scripts issue this command in your Powershell session:

```
Set-ExecutionPolicy -ExecutionPolicy Bypass
```

Then, navigate to the root of the project and type either:

```
.\build_start.ps1
```

to run the app in Developer mode, or build a standalone packaged Electron app by running

```
.\build_make.ps1
```

### If you can't run scripts
You can still build the version of the app you have downloaded, you just won't be able to build any changes you make. To do that:

```
npm run start
```

or build a standalone packaged Electron app with:

```
npm run make
```

