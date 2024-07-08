import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import { commentsTable } from "../../integrations";

// ToDo: fetch from `aws.getRegion`
const currentRegion = 'us-east-1';

export default function commentResource(api: aws.apigateway.RestApi, role: aws.iam.Role) {

  new aws.iam.RolePolicy("ApigatewayDynamoDBPolicy", {
    role: role.id,
    policy: commentsTable.arn.apply(arn => JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "BackendDynamoDBAccess",
          Effect: "Allow",
          Action: [
            "dynamodb:Query"
          ],
          Resource: arn
        }
      ]
    })),
  }, {
    dependsOn: [role, commentsTable],
  });

  const commentsResource = new aws.apigateway.Resource("CommentsResource", {
    parentId: api.rootResourceId,
    pathPart: "comments",
    restApi: api.id,
  }, {
    dependsOn: api,
  });

  const commentsMethod = new aws.apigateway.Method("CommentsMethod", {
    restApi: api.id,
    resourceId: commentsResource.id,
    httpMethod: "GET",
    authorization: "NONE",
  }, {
    dependsOn: commentsResource,
  });

  const commentsIntegration = new aws.apigateway.Integration("DynamodbIntegration", {
    restApi: api.id,
    resourceId: commentsResource.id,
    httpMethod: commentsMethod.httpMethod,
    type: "AWS",
    integrationHttpMethod: "POST",
    credentials: role.arn,
    uri: `arn:aws:apigateway:${currentRegion}:dynamodb:action/Query`,
    requestTemplates: {
      "application/json": pulumi.interpolate`{
    "TableName": "${commentsTable.name}",
    "KeyConditionExpression": "#slug = :slug",
    "ExpressionAttributeNames": {
      "#slug": "slug"
    },
    "ExpressionAttributeValues": {
      ":slug": {
        "S": "/tales"
      }
    },
    "ScanIndexForward": false,
    "Limit": 10
  }
  `,
    },
    passthroughBehavior: "WHEN_NO_MATCH",
  }, {
    dependsOn: [commentsMethod, role],
  });

  const commentsMethodResponse = new aws.apigateway.MethodResponse("CommentsMethodResponse", {
    restApi: api.id,
    resourceId: commentsResource.id,
    httpMethod: commentsMethod.httpMethod,
    statusCode: "200",
  }, {
    dependsOn: commentsIntegration,
  });
  
  const integrationResponse = new aws.apigateway.IntegrationResponse("CommentsIntegrationResponse", {
    restApi: api.id,
    resourceId: commentsResource.id,
    httpMethod: commentsMethod.httpMethod,
    statusCode: commentsMethodResponse.statusCode,
    responseTemplates: {
      "application/json": pulumi.interpolate`
  #set($inputRoot = $input.path('$'))
  {
    "Items": $inputRoot.Items,
    "Count": $inputRoot.Count,
    "ScannedCount": $inputRoot.ScannedCount
  }
  `,
    },
  }, {
    dependsOn: commentsMethodResponse,
  });

  return [integrationResponse];
}
