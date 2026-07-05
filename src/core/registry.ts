import type { Domain } from "./types.js";
import { pcmDomain } from "../domains/pcm-additional-info/index.js";
import { paymentsDomain } from "../domains/payments-v4-openapi/index.js";
import { paymentsV5Domain } from "../domains/payments-v5-openapi/index.js";
import { enrollmentsV2Domain } from "../domains/enrollments-v2-openapi/index.js";
import { automaticPaymentsV2Domain } from "../domains/automatic-payments-v2-openapi/index.js";
import { consentsV3Domain } from "../domains/consents-v3-openapi/index.js";
import { pcmOpenapiDomain } from "../domains/pcm-openapi/index.js";
import { pcmBusinessRulesDomain } from "../domains/pcm-business-rules/index.js";
import { jornadaOtimizadaDomain } from "../domains/jornada-otimizada/index.js";
import { mqdDomain } from "../domains/mqd/index.js";
import { webhookDomain } from "../domains/webhook-v1-openapi/index.js";
import { segurancaDomain } from "../domains/seguranca/index.js";
import { participantesDomain } from "../domains/participantes/index.js";
import { portalDomain } from "../domains/portal/index.js";

export const domains: Domain[] = [
  pcmDomain,
  paymentsDomain,
  paymentsV5Domain,
  enrollmentsV2Domain,
  automaticPaymentsV2Domain,
  consentsV3Domain,
  pcmOpenapiDomain,
  pcmBusinessRulesDomain,
  jornadaOtimizadaDomain,
  mqdDomain,
  webhookDomain,
  segurancaDomain,
  participantesDomain,
  portalDomain,
];
