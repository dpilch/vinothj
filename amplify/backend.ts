import { defineBackend, defineFunction } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";
import * as url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
});

const api = new appsync.GraphqlApi(backend.stack, "Api", {
  name: "demo",
  definition: appsync.Definition.fromFile(
    path.join(__dirname, "schema.graphql")
  ),
  authorizationConfig: {
    defaultAuthorization: {
      authorizationType: appsync.AuthorizationType.IAM,
    },
  },
  xrayEnabled: true,
});

const demoTable = new dynamodb.Table(backend.stack, "DemoTable", {
  partitionKey: {
    name: "id",
    type: dynamodb.AttributeType.STRING,
  },
});

const demoDS = api.addDynamoDbDataSource("demoDataSource", demoTable);

demoDS.createResolver("QueryGetDemosResolver", {
  typeName: "Query",
  fieldName: "getDemos",
  requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
  responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
});

demoDS.createResolver("MutationAddDemoResolver", {
  typeName: "Mutation",
  fieldName: "addDemo",
  requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
    appsync.PrimaryKey.partition("id").auto(),
    appsync.Values.projecting("input")
  ),
  responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
});

demoDS.createResolver("QueryGetDemosConsistentResolver", {
  typeName: "Query",
  fieldName: "getDemosConsistent",
  requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(true),
  responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
});

demoDS.createResolver("EchoQueryResolver", {
  typeName: "Query",
  fieldName: "echo",
  runtime: appsync.FunctionRuntime.JS_1_0_0,
  code: appsync.Code.fromAsset(
    path.join(__dirname, "data/resolvers/myFunction.js")
  ),
});
