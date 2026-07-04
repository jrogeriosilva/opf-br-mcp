import type { Domain } from "./types.js";
import { pcmDomain } from "../domains/pcm-additional-info/index.js";
import { paymentsDomain } from "../domains/payments-v4-openapi/index.js";
import { paymentsV5Domain } from "../domains/payments-v5-openapi/index.js";
import { enrollmentsV2Domain } from "../domains/enrollments-v2-openapi/index.js";
import { automaticPaymentsV2Domain } from "../domains/automatic-payments-v2-openapi/index.js";

export const domains: Domain[] = [
  pcmDomain,
  paymentsDomain,
  paymentsV5Domain,
  enrollmentsV2Domain,
  automaticPaymentsV2Domain,
];
