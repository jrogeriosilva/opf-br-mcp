import { createOpenApiDomain } from "../_openapi/domain.js";
import { automaticPaymentsV2Config } from "./config.js";

export const automaticPaymentsV2Domain = createOpenApiDomain(automaticPaymentsV2Config);
