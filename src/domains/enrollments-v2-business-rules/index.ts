import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
import { enrollmentsV2BusinessRulesConfig } from "./config.js";

export const enrollmentsV2BusinessRulesDomain = createConfluenceSectionsDomain(
  enrollmentsV2BusinessRulesConfig
);
