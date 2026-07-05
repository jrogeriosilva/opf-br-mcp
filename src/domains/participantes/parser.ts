import type { Item } from "../../core/types.js";

interface ApiResource {
  ApiFamilyType?: string;
  ApiVersion?: string;
}

interface AuthorisationServer {
  CustomerFriendlyName?: string;
  ApiResources?: ApiResource[] | null;
}

interface Organisation {
  OrganisationId: string;
  OrganisationName?: string;
  RegistrationNumber?: string;
  Status?: string;
  AuthorisationServers?: AuthorisationServer[] | null;
}

export interface ParticipantItem extends Item {
  name: string;
  cnpj: string | null;
  status: string | null;
  servers: number;
  serverNames: string[];
  apiFamilies: string[];
  detail: unknown;
}

/** Um item por organização; famílias de API agregadas de todos os authorisation servers. */
export function parseParticipants(jsonText: string): ParticipantItem[] {
  const orgs = JSON.parse(jsonText) as Organisation[];
  return orgs.map((org) => {
    const servers = org.AuthorisationServers ?? [];
    const families = new Set<string>();
    for (const server of servers) {
      for (const resource of server.ApiResources ?? []) {
        if (!resource.ApiFamilyType) continue;
        families.add(
          resource.ApiVersion ? `${resource.ApiFamilyType} ${resource.ApiVersion}` : resource.ApiFamilyType
        );
      }
    }
    return {
      id: org.OrganisationId,
      name: org.OrganisationName ?? "",
      cnpj: org.RegistrationNumber ?? null,
      status: org.Status ?? null,
      servers: servers.length,
      serverNames: servers.map((s) => s.CustomerFriendlyName ?? "").filter(Boolean),
      apiFamilies: [...families].sort(),
      detail: org,
    };
  });
}
