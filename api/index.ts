import "dotenv/config";
import express from "express";
import serverless from "serverless-http";

import { createApp } from "../src/httpApp";

void express;
export default serverless(createApp(null));
