const { Authenticator } = require('cognito-at-edge');

const authenticator = new Authenticator({
    // Replace these parameter values with those of your own environment
    region: 'REGION', // user pool region
    userPoolId: 'USER_POOL_ID', // user pool ID
    userPoolAppId: 'USER_POOL_APP_ID', // user pool app client ID
    userPoolDomain: 'USER_POOL_DOMAIN', // user pool domain
    logoutConfiguration: {
        logoutUri: 'LOGOUT_URI', // logout URI
        redirectUri: 'REDIRECT_URI' // redirect URI
    },
    logLevel: 'debug',
    nonceSigningSecret: 'NONCE_SIGNING_SECRET'
});

exports.handler = async (request) => authenticator.handle(request);