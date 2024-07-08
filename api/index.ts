import * as aws from "@pulumi/aws";

import commentResource from "./resources/comments";

export default function api() {
  const apigatewayRole = new aws.iam.Role("ApigatewayRole", {
    assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [{
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "apigateway.amazonaws.com",
        },
      }],
    },
  });
  
  const api = new aws.apigateway.RestApi("CommentsApi", {
    name: "CommentsApi",
  });
  
  new aws.apigateway.Deployment("ApiDeployment", {
    restApi: api.id,
    stageName: "v1",
  }, {
    dependsOn: commentResource(api, apigatewayRole),
  });
}
