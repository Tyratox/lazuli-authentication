# lazuli-authentication

An authentication module for creating an oauth2 service powered by [oauth2orize](https://github.com/jaredhanson/oauth2orize) combined with [sequelize](https://github.com/sequelize/sequelize) models, [passport](https://github.com/jaredhanson/passport) authentication strategies and [graphql](https://github.com/graphql/graphql-js) endpoints.

#Models

## OauthAccessToken
Model: `lazuli-authentication/models/oauth-access-token`
GraphqlType: `lazuli-authentication/types/oauth-access-token`

The oauth access token is a the token that is needed in order to use the api. An access token is generated at the end the oauth2 process and is related to an `oauth-client` and a `user`. The token is stored as a unsalted hash. Salting isn't possible as the token is the only lookup key on a request. (Yes, hashing also isn't important for the access token as it is random anyways.). `hash` and `expires` are the two only properties of this type.

## OauthClient
Model: `lazuli-authentication/models/oauth-client`
GraphqlType: `lazuli-authentication/types/oauth-client`

The oauth client refers to what service is trying to use the api (e.g. the frontend, the backend or a third party application). Oauth clients has the follwing properties: `name`, `secretHash`, `secretSalt`, `secretAlgorithm` and `trusted`. The 3 properties starting with `secret` together store a hashed secret in order to login authenticate clients. Oauth clients are especially important when scopes are implemented (TODO) as they will be linked to the `oauth-client` and `user` models. (Scopes are the permission to access certain data) In addition the have many `OauthRedirectUri`s that ensure that the access token is not passed to bad locations.

## OauthCode
Model: `lazuli-authentication/models/oauth-code`
GraphqlType: `lazuli-authentication/types/oauth-code`

The oauth code is the code generated when the user accepts a certain oauth client accessing the api on his behalf. This code is passed to an OauthRedirectUri where the OauthClient can retrieve the OauthAccessToken using his `secret`.

## OauthRedirectUri
Model: `lazuli-authentication/models/oauth-redirect-uri`
GraphqlType: `lazuli-authentication/types/oauth-redirect-uri`

This model is belongs to an OauthClient and represents a valid redirect uri where OauthCodes can be passed to.

## User
Model: `lazuli-authentication/models/user`
GraphqlType: `lazuli-authentication/types/user`

The user model has a few properties related to authentication, email verification and password reset. Other than that there are is a `locale` property which can be used to localize the content.

## Permission
Model: `lazuli-authentication/models/permission`
GraphqlType: `lazuli-authentication/types/permission`

The permission belongs to a user and represents the capability to do certain things. Permissions are hierarchical which means a user with the permission `admin` has the permission for every sub permission e.g. `admin.user.list` or `admin.user.updatePermissions`.

## OauthProvider
Model: `lazuli-authentication/models/oauth-provider`
GraphqlType: `lazuli-authentication/types/oauth-provider`

As this module should also work with other oauth apis, this model is capable of storing an access token together with an refresh token for a certain provider and user.

# Setup

This is a small summary of the capabilities of this module. Unnecessary code was stripped, but in production you should always add input validation to prevent surprises. Also it's not mandatory to use the provided functions, you can always swap some of them for custom ones.

## Local registration

`lazuli-authentication/endpoint` also provides an `registration` which accepts the fields `firstName`, `email` and `locale`.

//TODO

## Local login

In order to be able to login with a local account, you'll need to setup an endpoint to render the login, e.g.

    app.get("/views/login", loginView);

This page has to contain a form which posts the fields `username` (email) and `password` to the following endpoint:

    expressServer.post(
        "/auth/local/login",
        authLocal
    );

`authLocal` is already provided in the `lazuli-authentication/endpoint` module and just needs to be imported.

## Email verification

Again, you'll need to render a form with for example

    app.get("/views/verify-email", mailVerificationView);

This form has to pass the fields `email`, `password` and `emailVerificationCode` to the

    app.post(
        "/auth/local/verify-email",
        verifyEmail
    );

endpoint. The `verifyEmail` can also be imported from `lazuli-authentication/endpoint`.

## Password reset

The field `email` needs to be passed from a rendered from to

    app.post(
        "/auth/init-password-reset",
        initPasswordReset
    );

`initPasswordReset` can be imported from `lazuli-authentication/endpoint`.

The actual password reset view should then pass the fields `email`, `password` (The new one), and `resetCode` to an endpoint like

    app.post(
        "/auth/init-password-reset",
        passwordReset
    );

Again, `passwordReset` can be imported from `lazuli-authentication/endpoint`.

## 3-party oauth callbacks

//TODO

## Oauth 2

In order to create an oauth2 dialog you need to setup an endpoint with something like

    app.get(
        "/oauth2/authorize",
        isAuthenticated,
        authenticateOauthClient,
        checkForImmediateApproval,
        oAuthDialog
    );

`isAuthenticated` checks whether the user is logged in, otherwise the oauth2 process can't start. `authenticateOauthClient` should check whether the passed redirect uri matches one of the stored ones. This function is already provided in the `lazuli-authentication/oauth-server` module and just needs to be imported. `checkForImmediateApproval` is an optional convenience feature that could immediately pass `trusted` OauthClients (`trusted` is a field in the database). This function is also provided in `lazuli-authentication/oauth-server` and sets `request.trusted` to the according boolean. In `oAuthDialog` you need to render an html form `POST`ing to the `authorize` endpoint described below. A field called `transaction_id` containing the transaction id from `request.oauth2.transactionID` needs to be passed together with an `allow` field.

In the next, already foreshadowed, endpoint, we have to call the `decision` function in `lazuli-authentication/oauth-server`

    app.post(
        "/oauth2/authorize",
        isAuthenticated,
        oauth2Server.decision()
    );

which will do the rest for us. This generates an OauthCode which will be passed as a url parameter with the name `code` to the redirect uri. The oauth client now has to retrieve the access token by sending a request to

    expressServer.post(
        "/oauth2/token",
        passport.authenticate("client-local", {
            session: false
        }),
        oauth2Server.token()
    );

with the json encoded content

    {
		clientId: CLIENT_ID,
		clientSecret: CLIENT_SECRET,
		code: ==> THE RETRIEVED OAUTH CODE <==,
		grant_type: "authorization_code"
	}

Passport will first try to login the client based on the passed id and secret. `oauth2orize` will respond with an object looking like

    {
		access_token: {
			token: "",
			clientId: 0,
			userId: 0,
			expires: 0
		}
	}
The `token` property is the most important one. This token can now be used in an HTTP Header called `Authorization` with the content `Bearer xxx` where xxx is your access token. This header will bypass `isBearerAuthenticated` middlewares.

# TODO
- modularize passport addons
- move redirect uris to config
- add events for registration/password reset/email verification