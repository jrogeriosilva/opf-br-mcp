import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
import { segurancaConfig } from "./config.js";

export const segurancaDomain = createConfluenceSectionsDomain(segurancaConfig);
