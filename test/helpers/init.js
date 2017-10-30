const { GraphQLSchema, GraphQLObjectType } = require("graphql");
const graphqlHTTP = require("express-graphql");

const { toGlobalId, fromGlobalId } = require("graphql-relay");

const lazuli = require("lazuli-core/event-emitter");
const app = require("lazuli-core/express");
const sequelize = require("lazuli-core/sequelize");
const logger = require("lazuli-core/logger");

const Authentication = require("../../src/lazuli-authentication");

const { isBearerAuthenticated } = require("../../src/middleware");
const User = require("../../src/models/user");
const OauthAccessToken = require("../../src/models/oauth-access-token");
const Permission = require("../../src/models/permission");

let adminToken, nonPrivToken;

let adminUserModel, nonPrivUserModel, adminClient, nonPrivClient, anonClient;

process.on("uncaughtException", logger.log.bind(undefined, "error"));

const initPromise = lazuli
	.emit("init")
	.then(() => {
		const models = Object.assign({}, Authentication.models);
		return Authentication.associateModels().then(() => {
			return Promise.resolve(models);
		});
	})
	.then(models => {
		const types = Object.assign(
			{},
			...Object.values(models)
				.map(
					model =>
						model.graphQlType
							? {
									[model.name]: model.graphQlType
								}
							: null
				)
				.filter(e => e)
		);

		sequelize.nodeTypeMapper.mapTypes(types);

		return sequelize.sync({
			force: true
		});
	})
	.then(() => {
		const UserSchema = require("../../src/schemas/user");
		const OauthClientSchema = require("../../src/schemas/oauth-client");

		const schema = new GraphQLSchema({
			query: new GraphQLObjectType({
				name: "RootQuery",
				fields: Object.assign(
					{ node: sequelize.nodeField },
					UserSchema.query,
					OauthClientSchema.query
				)
			}),
			mutation: new GraphQLObjectType({
				name: "RootMutation",
				fields: Object.assign(
					{},
					UserSchema.mutation,
					OauthClientSchema.mutation
				)
			})
		});

		app.use(
			"/graphql",
			isBearerAuthenticated(),
			(error, request, response, next) => next(), //pass anyways
			graphqlHTTP(request => {
				return {
					schema,
					context: { request },
					graphiql: true,
					formatError: error => ({
						message: error.message,
						details: error.stack
					})
				};
			})
		);
	})
	.then(() => {
		return User.create({
			nameDisplay: "R00t",
			nameFirst: "root",
			nameLast: "toor",
			emailVerified: "root@toor.gov"
		})
			.then(userModel => {
				return Permission.create({
					permission: "admin"
				})
					.then(permissionModel => {
						return userModel.addPermission(permissionModel);
					})
					.then(() => {
						return Promise.resolve(userModel);
					});
			})
			.then(userModel => {
				adminUserModel = userModel;
			})
			.then(() => {
				return User.create({
					nameDisplay: "nyan cat",
					nameFirst: "nyan",
					nameLast: "cat",
					emailVerified: "miouu@nyan.cat"
				});
			})
			.then(userModel => {
				nonPrivUserModel = userModel;
			})
			.then(() => {
				return OauthAccessToken.generateToken(
					adminUserModel.get("id"),
					null,
					Date.now() * 2
				);
			})
			.then(({ token }) => {
				adminToken = token;
				return OauthAccessToken.generateToken(
					nonPrivUserModel.get("id"),
					null,
					Date.now() * 2
				);
			})
			.then(({ token }) => {
				nonPrivToken = token;

				adminClient = require("./graphql-client")({
					url: "http://localhost:8100/graphql",
					headers: {
						Authorization: "Bearer " + adminToken
					}
				});
				nonPrivClient = require("./graphql-client")({
					url: "http://localhost:8100/graphql",
					headers: {
						Authorization: "Bearer " + nonPrivToken
					}
				});
				anonClient = require("./graphql-client")({
					url: "http://localhost:8100/graphql"
				});

				return Promise.resolve({
					adminUserModel,
					nonPrivUserModel,
					adminClient,
					nonPrivClient,
					anonClient
				});
			});
	});

module.exports = {
	lazuli,
	initPromise
};
