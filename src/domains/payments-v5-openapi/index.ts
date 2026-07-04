import { createOpenApiDomain } from "../_openapi/domain.js";
import { paymentsV5Config } from "./config.js";

export const paymentsV5Domain = createOpenApiDomain(paymentsV5Config);
