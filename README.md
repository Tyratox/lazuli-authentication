# lazuli-authentication

An authentication module for creating an oauth2 service powered by [oauth2orize](https://github.com/jaredhanson/oauth2orize) combined with [sequelize](https://github.com/sequelize/sequelize) models, [passport](https://github.com/jaredhanson/passport) authentication strategies and [graphql](https://github.com/graphql/graphql-js) endpoints.

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