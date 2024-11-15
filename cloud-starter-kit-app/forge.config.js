const path = require('path');
// const { exec } = require('child_process');

const iconPath = path.resolve(process.cwd(), 'assets/icons/appicon');
const iconPathMac = `${iconPath}.icns`;
const iconPathWin = `${iconPath}.ico`;

module.exports = {
    presets: ['@babel/preset-env'],
    packagerConfig: {
        appBundleId: 'com.amazon.AWS-Cloud-Starter-Kit',
        overwrite: true,
        icon: iconPath,
        ignore: [
            // ignore everything except the first line's files
            /^\/(?!(src|package.json|node_modules|assets|kits|cfn-templates|cdk-apps|pipeline-assets|downloaded))/,
            /dist\/scripts/,
            /forge.config.js/,
            /deployments.js/,
            /renderer.js/,
            /preload.js/,
            /stack-monitoring.js/,
            /sdk-commands.js/,
            /get-amis-and-instance-types.js/,
            /task-queue.js/,
            /utilities.js/,
            /\.js\.map$/,
            /\.env$/,
            /\.venv$/,
            //ignore any virtual env directories inside CDK kits
            /^\/kits\/cdk-apps\/[a-z\-]+\/\.v*env/,
        ],
        // osxSign: {
        //     identity: 'Developer ID Application: dev-id',
        //     'hardened-runtime': true,
        //     'signature-flags': 'library',
        // },
        // osxNotarize: {
        // appleId: 'ios-dev@dev-id',
        // appleIdPassword: '******',
        // },
    },
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                // background: 'assets/cloud-starter-kit-logo.png',
                iconUrl: iconPathWin,
                loadingGif: './assets/windows-installer-animation.gif',
                name: "Cloud-Starter-Kit",
                overwrite: true,
                authors: 'guymor@amazon.com',
                description: 'Cloud Starter Kit',
            }
        },
        // {
        //     name: "@electron-forge/maker-zip",
        //     platforms: [
        //         "darwin",
        //         "windows"
        //     ],
        //     config: {
        //         // background: 'assets/dmg-background.png',
        //         name: "Cloud-Starter-Kit",
        //         overwrite: true,
        //         authors: 'guymor@amazon.com',
        //         description: 'Cloud Starter Kit',
        //     }
        // },
        {
            name: "@electron-forge/maker-dmg",
            enabled: true,
            platforms: ['darwin'],
            config: {
                icon: iconPathMac,
                background: path.resolve(process.cwd(), 'assets/dmg-background.png'),
                contents: [
                    { x: 430, y: 295, type: 'link', path: '/Applications' },
                    { x: 170, y: 295, type: 'file', path: path.resolve(process.cwd(), 'out/Cloud Starter Kit-darwin-arm64/Cloud Starter Kit.app') },
                ],
                name: "Cloud Starter Kit",
                overwrite: true
            }
        },
        // {
        //     name: '@electron-forge/maker-wix',
        //     config: {
        //         language: 1033,
        //         manufacturer: 'Amazon',
        //         name: "Cloud-Starter-Kit",
        //         overwrite: true,
        //         authors: 'guymor@amazon.com',
        //         description: 'Cloud Starter Kit',
        //     }
        // },
        // {
        //     name: "@electron-forge/maker-rpm",
        //     config: {
        //         // background: './assets/Cloud_Icon_Square.png',
        //         name: "Cloud-Starter-Kit",
        //         overwrite: true,
        //         authors: 'guymor@amazon.com',
        //         description: 'Cloud Starter Kit',
        //     }
        // }
    ]
};