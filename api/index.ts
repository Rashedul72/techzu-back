import "dotenv/config";
import serverless from "serverless-http";

import { createApp } from "../src/httpApp";

export default serverless(createApp(null));
