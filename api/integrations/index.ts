import * as aws from "@pulumi/aws";

export const commentsTable = new aws.dynamodb.Table("CommentsTable", {
	attributes: [
		{ name: "slug", type: "S" },
		{ name: "createdAt", type: "N" },
	],
	hashKey: "slug",
	rangeKey: "createdAt",
	billingMode: "PROVISIONED",
	readCapacity: 2,
	writeCapacity: 1,
});
