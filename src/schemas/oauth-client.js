const {
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLString,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const Joi = require("joi");

const { attributeFields, resolver } = require("graphql-sequelize");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const { pick } = require("../utilities/object");
const { escapeLikeString } = require("../utilities/sql");

const OauthClient = require("../models/oauth-client");
const OauthRedirectUri = require("../models/oauth-redirect-uri");

const OauthClientInputType = require("../input-types/oauth-client");
const OauthClientInputTypeValidation = require("../graphql-validation/oauth-client");

/**
 * The graphql schema for the oauth client model
 * @module lazuli-authentication/schema/oauth-client
 * 
 * @filterable {object} authentication.graphql.query.oauth-client.list.args The client properties everyone can query
 * @filterable {object} authentication.graphql.mutation.oauth-client.upsert.keys The client properties the owner can update
 * 
 * @see module:lazuli-authentication/types/oauth-client
 * @see module:lazuli-authentication/input-types/oauth-client
 * @see module:lazuli-authentication/models/oauth-client
 */

/**
 * The graphql query schema
 * @type {object}
 */
module.exports.query = {
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
					if (!hasPermission) {
						return Promise.reject(
							new Error(
								"Access Denied! You're not allowed to list oauth clients!"
							)
						);
					}

					return request.user.doesHavePermission("admin.oauth-client.get");
				})
				.then(havePermission => {
					if (!havePermission) {
						//only allow uncritical search keys
						args = pick(
							args,
							valueFilter.filterable(
								"authentication.graphql.query.oauth-client.list.args",
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

							return findOptions;
						}
					})(root, args, context, info);
				});
		}
	}
};

/**
 * The graphql mutation schema
 * @type {object}
 */
module.exports.mutation = {
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

			const { request } = context;

			if (staticValidation.error) {
				return Promise.reject(staticValidation.error);
			}

			let secret = null;

			//If there's no error check what we need to do: update or insert
			return Promise.resolve()
				.then(() => {
					if (oauthClient.id) {
						//if the oauthClient object contains an id it's not sure yet what
						//action should be taken.
						//should a oauth client with the given id exist, it will be
						//updated
						return OauthClient.findById(
							oauthClient.id
						).then(oauthClientModel => {
							if (oauthClientModel) {
								if (!request.user) {
									return Promise.reject(
										new Error(
											"Access Denied! You have to be logged in in order to update this oauth client!"
										)
									);
								}

								return request.user
									.doesHavePermission("admin.oauth-client.update")
									.then(hasPermission => {
										if (
											hasPermission ||
											oauthClientModel.get("userId") === request.user.get("id")
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
								//if not, a new oauth client with the given id will be created
								return request.user
									.doesHavePermission("admin.oauth-client.create")
									.then(hasPermission => {
										if (!hasPermission) {
											return Promise.reject(
												new Error(
													"Access Denied! You're not allowed to create a new oauth client!"
												)
											);
										}

										return OauthClient.create({
											id: oauthClient.id
										}).then(model => {
											secret = oauthClient.generateSecret();

											return oauthClient.updateSecret(secret).then(() => {
												return Promise.resolve(model);
											});
										});
									});
							}
						});
					} else {
						//if the oauth client object doesn't contain an id,
						//a new oauth client will be created
						if (!request.user) {
							return Promise.reject(
								new Error(
									"Access Denied! You have to be logged in in order to create a new oauth client!"
								)
							);
						}

						return request.user
							.doesHavePermission("admin.oauth-client.create")
							.then(hasPermission => {
								if (!hasPermission) {
									return Promise.reject(
										new Error(
											"Access Denied! You're not allowed to create a new oauth client!"
										)
									);
								}
								return OauthClient.create().then(model => {
									secret = OauthClient.generateSecret();

									return model.updateSecret(secret).then(() => {
										return Promise.resolve(model);
									});
								});
							});
					}
				})
				.then(oauthClientModel => {
					//all of the previous possibilities will return a promise returning
					//the oauth client model to update

					//if the user posseses the required permission, all given
					//keys will be updated
					return request.user
						.doesHavePermission("admin.oauth-client.upsert")
						.then(hasPermission => {
							if (hasPermission) {
								oauthClientModel.set(oauthClient);
							} else if (
								request.user.get("id") == oauthClientModel.get("userId")
							) {
								//otherwise we pick a few
								oauthClientModel.set(
									pick(
										user,
										valueFilter.filterable(
											"authentication.graphql.mutation.oauth-client.upsert.keys",
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

									if (!oauthClient.oauthRedirectUris) {
										return Promise.resolve();
									}

									//if the user is allowed to, we update the redirect uris
									return request.user
										.doesHavePermission("admin.oauth-client.upsert")
										.then(havePermission => {
											if (
												!havePermission &&
												request.user.get("id") !== oauthClient.get("userId")
											) {
												return Promise.reject(
													new Error(
														"You're not allowed to update the oauth redirect uris"
													)
												);
											}
											return oauthClientModel.getOauthRedirectUris();
										})
										.then(redirectUriModels => {
											//diff existing and sent
											const toDelete = redirectUriModels.filter(
												redirectUriModel => {
													return (
														oauthClient.oauthRedirectUris.indexOf(
															redirectUriModel.get("uri")
														) === -1
													);
												}
											);

											const existing = redirectUriModels.map(redirectUriModel =>
												redirectUriModel.get("uri")
											);
											const toAdd = oauthClient.oauthRedirectUris.filter(
												redirectUri => {
													return existing.indexOf(redirectUri) === -1;
												}
											);

											return Promise.all([
												...toDelete.map(redirectUriModel => {
													return redirectUriModel.destroy();
												}),
												...toAdd.map(redirectUri =>
													OauthRedirectUri.create({
														uri: redirectUri,
														oauthClientId: oauthClientModel.get("id")
													})
												)
											]);
										});
								})
								.then(() => {
									//in the end, we return the updated oauth client object by
									//using graphql-sequelize's resolver

									return resolver(OauthClient)(
										root,
										{ id: oauthClientModel.get("id") },
										context,
										info
									).then(model => {
										if (secret) {
											model.dataValues.secret = secret;
										}
										return Promise.resolve(model);
									});
								});
						});
				});
		}
	},
	deleteOauthClient: {
		type: GraphQLBoolean,
		args: {
			id: { type: GraphQLInt }
		},
		resolve: (root, { id }, { request }, info) => {
			if (!request.user) {
				return Promise.reject(
					new Error(
						"Access Denied! You have to be logged in to delete this oauth client"
					)
				);
			}
			return OauthClient.findById(id).then(oauthClientModel => {
				if (!oauthClientModel) {
					return Promise.reject(
						new Error("The given oauth client couldn't be found!")
					);
				}
				return request.user
					.doesHavePermission("admin.oauth-client.delete")
					.then(havePermission => {
						if (
							!havePermission &&
							oauthClientModel.get("userId") !== request.user.get("id")
						) {
							return Promise.reject(
								new Error(
									"Access Denied! You're not allowed to delete this oauth client"
								)
							);
						}

						return oauthClientModel.destroy();
					});
			});
		}
	}
};
