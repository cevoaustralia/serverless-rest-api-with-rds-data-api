const { RDSDataClient, ExecuteStatementCommand } = require("@aws-sdk/client-rds-data"); // CommonJS import

const client = new RDSDataClient({});

const handler = async (event) => {
  const sql = `
        SHOW DATABASES;
    `;

  const params = {
    secretArn: process.env.SECRET_ARN,
    resourceArn: process.env.CLUSTER_ARN,
    sql,
  };

  try {
    const command = new ExecuteStatementCommand(params);
    const response = await client.send(command);
    return { statusCode: 200, body: JSON.stringify({ message: "List Databases", response }) };
  } catch (error) {
    console.error("Error executing SQL:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Error executing SQL:", error }) };
  }
};

exports.handler = handler;
