import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
import { requisitosNaoFuncionaisConfig } from "./config.js";

export const requisitosNaoFuncionaisDomain = createConfluenceSectionsDomain(
  requisitosNaoFuncionaisConfig
);
