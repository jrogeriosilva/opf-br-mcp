import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const hooks = fileURLToPath(new URL("../.githooks/", import.meta.url));
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "opf-git-hooks-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("hooks do Git", () => {
  it.each([
    ["feat: adicionar domínio", 0],
    ["fix(parser): corrigir extração", 0],
    ["feat!: alterar contrato", 0],
    ["feat(api)!: alterar contrato\n\nBREAKING CHANGE: novo formato", 0],
    ["DOCS: atualizar documentação", 0],
    ["atualizar documentação", 1],
    ["feat:adicionar domínio", 1],
    ["feat:   ", 1],
    ["feat(): adicionar domínio", 1],
    ["feat( ): adicionar domínio", 1],
    ["", 1],
    ["título inválido\n\nfeat: adicionar domínio", 1],
  ])("valida a mensagem %j", (message, status) => {
    const file = join(dir, "COMMIT_EDITMSG");
    writeFileSync(file, message);
    const result = spawnSync(join(hooks, "commit-msg"), [file]);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(status);
  });

  it.each([0, 7])("executa npm test e propaga o resultado %i", (status) => {
    writeFileSync(join(dir, "npm"), `#!/bin/sh\n[ "$*" = "test" ] || exit 99\nexit ${status}\n`, {
      mode: 0o755,
    });
    const result = spawnSync(join(hooks, "pre-commit"), [], {
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(status);
  });
});
