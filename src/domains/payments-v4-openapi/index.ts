import { createOpenApiDomain } from "../_openapi/domain.js";
import { paymentsConfig } from "./config.js";

export const paymentsDomain = createOpenApiDomain(paymentsConfig);
