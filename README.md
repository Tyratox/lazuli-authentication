# lazuli-authentication

An authentication module for creating an oauth2 service powered by [oauth2orize](https://github.com/jaredhanson/oauth2orize) combined with [sequelize](https://github.com/sequelize/sequelize) models, [passport](https://github.com/jaredhanson/passport) authentication strategies and [graphql](https://github.com/graphql/graphql-js) endpoints.

## Models

### OauthAccessToken
Model: `lazuli-authentication/models/oauth-access-token`
GraphqlType: `lazuli-authentication/types/oauth-access-token`

The oauth access token is a the token that is needed in order to use the api. An access token is generated at the end the oauth2 process and is related to an `oauth-client` and a `user`. The token is stored as a unsalted hash. Salting isn't possible as the token is the only lookup key on a request. (Yes, hashing also isn't important for the access token as it is random anyways.). `hash` and `expires` are the two only properties of this type.

### OauthClient
Model: `lazuli-authentication/models/oauth-client`
GraphqlType: `lazuli-authentication/types/oauth-client`

The oauth client refers to what service is trying to use the api (e.g. the frontend, the backend or a third party application). Oauth clients has the follwing properties: `name`, `secretHash`, `secretSalt`, `secretAlgorithm` and `trusted`. The 3 properties starting with `secret` together store a hashed secret in order to login authenticate clients. Oauth clients are especially important when scopes are implemented (TODO) as they will be linked to the `oauth-client` and `user` models. (Scopes are the permission to access certain data) In addition the have many `OauthRedirectUri`s that ensure that the access token is not passed to bad locations.

### OauthCode
Model: `lazuli-authentication/models/oauth-code`
GraphqlType: `lazuli-authentication/types/oauth-code`

The oauth code is the code generated when the user accepts a certain oauth client accessing the api on his behalf. This code is passed to an OauthRedirectUri where the OauthClient can retrieve the OauthAccessToken using his `secret`.

### OauthRedirectUri
Model: `lazuli-authentication/models/oauth-redirect-uri`
GraphqlType: `lazuli-authentication/types/oauth-redirect-uri`

This model is belongs to an OauthClient and represents a valid redirect uri where OauthCodes can be passed to.

### User
Model: `lazuli-authentication/models/user`
GraphqlType: `lazuli-authentication/types/user`

The user model has a few properties related to authentication, email verification and password reset. Other than that there are is a `locale` property which can be used to localize the content.

### Permission
Model: `lazuli-authentication/models/permission`
GraphqlType: `lazuli-authentication/types/permission`

The permission belongs to a user and represents the capability to do certain things. Permissions are hierarchical which means a user with the permission `admin` has the permission for every sub permission e.g. `admin.user.list` or `admin.user.updatePermissions`.

### OauthProvider
Model: `lazuli-authentication/models/oauth-provider`
GraphqlType: `lazuli-authentication/types/oauth-provider`

As this module should also work with other oauth apis, this model is capable of storing an access token together with an refresh token for a certain provider and user.

## Setup

This is a small summary of the capabilities of this module. Unnecessary code was stripped, but in production you should always add input validation to prevent surprises. Also it's not mandatory to use the provided functions, you can always swap some of them for custom ones. All middleware will call the callback function; on error with an error object and on success without.

### Local registration

`lazuli-authentication/middleware` also provides an `registration` which accepts the fields `firstName`, `email` and `locale`.

    app.get("/auth/local/registration",
        registration,
        redirectTo("/login")
    )

### Local login

In order to be able to login with a local account, you'll need to setup an endpoint to render the login, e.g.

    app.get("/views/login", loginView);

This page has to contain a form which posts the fields `email` and `password` to an endpoint like the following:

    app.post(
        "/auth/local/login",
        authLocal,
        redirectTo("/profile")
    );

`authLocal` is already provided in the `lazuli-authentication/middleware` module and just needs to be imported.

### Email verification

Again, you'll need to render a form with for example

    app.get("/views/verify-email", mailVerificationView);

This form has to pass the fields `email`, `password` and `emailVerificationCode` to the

    app.post(
        "/auth/local/verify-email",
        verifyEmail,
        redirectTo("/login")
    );

endpoint. The `verifyEmail` can also be imported from `lazuli-authentication/middleware`.

### Password reset

The field `email` needs to be passed from a rendered from to

    app.post(
        "/auth/init-password-reset",
        initPasswordReset,
        redirectTo("/login")
    );

`initPasswordReset` can be imported from `lazuli-authentication/middleware`.

The actual password reset view should then pass the fields `email`, `password` (The new one), and `resetCode` to an endpoint like

    app.post(
        "/auth/init-password-reset",
        passwordReset,
        redirectTo("/login")
    );

Again, `passwordReset` can be imported from `lazuli-authentication/middleware`.

### 3-party oauth callbacks

`lazuli-authentication/passport` contains the function `initGenericOauthPassportStrategy` which enables, as the name suggests, arbitary passport oauth strategies. The function signature looks like

    initGenericOauthPassportStrategy(
        passport,
        providerUid,
        Strategy,
        strategyProps,
        mapCallbackSignature
    ){...}

where `passport` is the global passport object, `providerUid` is a unique id for this specific oauth provider, `Strategy` is the related passport strategy (e.g. `FacebookStrategy`), `strategyProps` are the props passed to the strategy, e.g.

    {
        clientID: FACEBOOK_APP_ID,
        clientSecret: FACEBOOK_APP_SECRET,
        callbackURL: HOST + FACEBOOK_CALLBACK_PATH,
        profileFields: ["id", "emails", "name", "displayName", "photos"]
    }
(`passReqToCallback` is always added to this object)


and `mapCallbackSignature` is a function which should map the specific strategy callback signature to the following signature:

    (request, accessToken, refreshToken, profile, done) => {...}

This can be done by doing something like

    const mapCallbackSignature = (initStrategy) => {
        return (request, accessToken, refreshToken, extraParams, profile, done) => initStrategy(request, accessToken, refreshToken, profile, done);
    }

Then, as usual, you'll need to route the callback like

    app.get("/auth/google/callback", (request, response, next) => {
        passport.authenticate("google", (err, user, info) => {
            if(err){
                next(err);
            }

            if(!user){
                return new Error();
            }

            request.logIn(user, next)
        })(request, response, next);
    }, redirectTo("/profile"));

In order to initiate the authentication you'll have redirect users to an endpoint like

    expressServer.get(
        "/auth/google/login/",
        passport.authenticate("google", {
            scope: ["openid profile email"]
        })
    );

### Oauth 2

In order to create an oauth2 dialog you need to setup an endpoint with something like

    app.get(
        "/oauth2/authorize",
        isAuthenticated,
        verifyOauthClient,
        oAuthDialog
    );

`isAuthenticated` checks whether the user is logged in, otherwise the oauth2 process can't start. `verifyOauthClient` should check whether the passed redirect uri matches one of the stored ones. This function is already provided in the `lazuli-authentication/oauth-server` module and just needs to be imported. In `oAuthDialog` you need to render an html form `POST`ing to the `authorize` endpoint described below. A field called `transaction_id` containing the transaction id from `request.oauth2.transactionID` needs to be passed together with an `allow` field.

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