const {
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLString,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const { attributeFields, resolver } = require("graphql-sequelize");

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);
const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);
const sequelize = require("lazuli-require")("lazuli-core/globals/sequelize");

const { pick } = require("../utilities/object");
const { escapeLikeString } = require("../utilities/sql");

const OauthClient = require("../models/oauth-client");
const OauthRedirectUri = require("../models/oauth-redirect-uri");

const OauthClientInputType = require("../input-types/oauth-client");
const OauthClientInputTypeValidation = require("../graphql-validation/oauth-client");

const OauthClientSchema = new GraphQLSchema({
	query: new GraphQLObjectType({
		name: "OauthClientQuery",
		fields: {
			oauthClient: {
				type: OauthClient.graphQlType,
				args: {
					id: {
						description: "The id of the oauth client",
						type: new GraphQLNonNull(GraphQLInt)
					}
				},
				resolve: resolver(OauthClient)
			},
			oauthClients: {
				type: new GraphQLList(OauthClient.graphQlType),
				args: {
					//generally allow to filter all fields
					...attributeFields(OauthClient, { allowNull: true }),
					limit: {
						type: GraphQLInt
					}
				},
				resolve: (root, args, context, info) => {
					const { request } = context;

					if (!request.user) {
						return Promise.reject(
							new Error(
								"Access Denied! You have to be logged in, in order to list users!"
							)
						);
					}

					return request.user
						.doesHavePermission("admin.oauth-client.list")
						.then(hasPermission => {
							if (hasPermission) {
								return request.user.doesHavePermission(
									"admin.oauth-client.get"
								);
							} else {
								return Promise.reject(
									new Error(
										"Access Denied! You're not allowed to list oauth clients!"
									)
								);
							}
						})
						.then(havePermission => {
							if (!havePermission) {
								//only allow uncritical search keys
								args = pick(
									args,
									valueFilter.filterable(
										"graphql.query.oauth-client.list.args",
										["id", "name"]
									)
								);
							}

							return resolver(OauthClient, {
								before: (findOptions, args) => {
									if (findOptions.where) {
										if (findOptions.where.name) {
											findOptions.where.name = {
												$like: `%${escapeLikeString(args.name)}%`
											};
										}
									}

									return valueFilter.filterable(
										"graphql.query.oauth-client.list.find-options",
										findOptions
									);
								}
							})(root, args, context, info);
						});
				}
			}
		}
	}),
	mutation: new GraphQLObjectType({
		name: "OauthClientMutation",
		fields: {
			upsertOauthClient: {
				type: OauthClient.graphQlType,
				args: {
					oauthClient: { type: new GraphQLNonNull(OauthClientInputType) }
				},
				resolve: (root, { oauthClient }, context, info) => {
					//first check if the passed oauthClient object meets all requirements.
					//graphql only checks the input types.
					const staticValidation = Joi.validate(
						oauthClient,
						OauthClientInputTypeValidation
					);

					if (!staticValidation.error) {
						//If there's no error check what we need to do: update or insert
						let promise;

						const { request } = context;

						if (oauthClient.id) {
							//if the oauthClient object contains an id it's not sure yet what
							//action should be taken.
							//should a oauth client with the given id exist, it will be
							//updated
							promise = OauthClient.findById(
								oauthClient.id
							).then(oauthClientModel => {
								if (oauthClientModel) {
									if (request.user) {
										return request.user
											.doesHavePermission("admin.oauth-client.update")
											.then(hasPermission => {
												if (
													hasPermission ||
													oauthClientModel.get("userId") ===
														request.user.get("id")
												) {
													return Promise.resolve(oauthClientModel);
												} else {
													return Promise.reject(
														new Error(
															"Access Denied! You are not allowed to update this oauth client!"
														)
													);
												}
											});
									} else {
										return Promise.reject(
											new Error(
												"Access Denied! You have to be logged in in order to update this oauth client!"
											)
										);
									}
								} else {
									//if not, a new oauth client with the given id will be created
									return request.user
										.doesHavePermission("admin.oauth-client.create")
										.then(hasPermission => {
											if (hasPermission) {
												return OauthClient.create({ id: oauthClient.id });
											} else {
												return Promise.reject(
													new Error(
														"Access Denied! You're not allowed to create a new oauth client!"
													)
												);
											}
										});
								}
							});
						} else {
							//if the oauth client object doesn't contain an id,
							//a new oauth client will be created
							if (request.user) {
								promise = request.user
									.doesHavePermission("admin.oauth-client.create")
									.then(hasPermission => {
										if (hasPermission) {
											return OauthClient.create();
										} else {
											return Promise.reject(
												new Error(
													"Access Denied! You're not allowed to create a new oauth client!"
												)
											);
										}
									});
							} else {
								promise = Promise.reject(
									new Error(
										"Access Denied! You have to be logged in in order to create a new oauth client!"
									)
								);
							}
						}

						//all of the previous possibilities will return a promise returning
						//the oauth client model to update
						return promise.then(oauthClientModel => {
							if (!oauthClientModel) {
								return Promise.reject(
									new Error("Something went terribly wrong!")
								);
							}

							//if the oauth client posseses required permission, all given
							//keys will be updated
							return request.user
								.doesHavePermission("admin.oauth-client.upsert")
								.then(hasPermission => {
									if (hasPermission) {
										oauthClientModel.set(oauthClient);
									} else {
										//otherwise we pick a few. these keys can be changed by using a
										//filter
										oauthClientModel.set(
											pick(
												user,
												valueFilter.filterable(
													"graphql.mutation.oauth-client.upsert.keys",
													["name"]
												)
											)
										);
									}

									//after setting the new values, save the oauth client model to
									//the database
									return oauthClientModel
										.save()
										.then(() => {
											//after saving all columns in the oauth client table we also
											//have to update the associations

											//if the user is allowed to, we update the models permissions
											if (oauthClient.redirectUris) {
												return request.user
													.doesHavePermission("admin.oauth-client.upsert")
													.then(hasPermission => {
														if (
															hasPermission ||
															request.user.get("id") ==
																oauthClient.get("userId")
														) {
															return oauthClientModel
																.getOauthRedirectUris()
																.then(redirectUriModels => {
																	//diff existing and sent
																	const toDelete = redirectUriModels.filter(
																		redirectUriModel => {
																			return (
																				oauthClient.redirectUris.indexOf(
																					redirectUriModel.get("uri")
																				) !== -1
																			);
																		}
																	);
																	const existing = redirectUriModels.map(
																		redirectUriModel =>
																			redirectUriModel.get("uri")
																	);
																	const toAdd = oauthClient.redirectUris.filter(
																		redirectUri => {
																			return (
																				existing.indexOf(redirectUri) === -1
																			);
																		}
																	);

																	return Promise.all([
																		...toDelete.map(redirectUriModel => {
																			return redirectUriModel.destory();
																		}),
																		...toAdd.map(redirectUri =>
																			OauthRedirectUri.create({
																				uri: redirectUri,
																				oauthClientId: oauthClientModel.get(
																					"id"
																				)
																			})
																		)
																	]);
																});
														} else {
															return Promise.reject(
																new Error(
																	"You're not allowed to update the oauth redirect uris"
																)
															);
														}
													});
											} else {
												return Promise.resolve();
											}
										})
										.then(() => {
											//in the end, we return the updated oauth client object by
											//using graphql-sequelize's resolver
											return resolver(OauthClient)(
												root,
												{ id: oauthClientModel.get("id") },
												context,
												info
											);
										});
								});
						});
					} else {
						return Promise.reject(staticValidation.error);
					}
				}
			},
			deleteOauthClient: {
				type: GraphQLBoolean,
				args: {
					oauthClientId: { type: GraphQLInt }
				},
				resolve: (root, { oauthClientId }, context, info) => {
					if (request.user) {
						OauthClient.findById(oauthClientId).then(oauthClientModel => {
							if (oauthClientModel) {
								return request.user
									.doesHavePermission("admin.oauth-client.delete")
									.then(hasPermission => {
										if (
											hasPermission ||
											oauthClientModel.get("userId") == request.user.get("id")
										) {
											return oauthClientModel.destory();
										} else {
											return Promise.reject(
												new Error(
													"Access Denied! You're not allowed to delete this oauth client"
												)
											);
										}
									});
							} else {
								return Promise.reject(
									new Error("The given oauth client couldn't be found!")
								);
							}
						});
					} else {
						return Promise.reject(
							new Error(
								"Access Denied! You're not allowed to delete this oauth client"
							)
						);
					}
				}
			}
		}
	})
});

return OauthClientSchema;
