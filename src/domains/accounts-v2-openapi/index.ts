import { createOpenApiDomain } from "../_openapi/domain.js";
import { accountsV2Config } from "./config.js";

export const accountsV2Domain = createOpenApiDomain(accountsV2Config);
