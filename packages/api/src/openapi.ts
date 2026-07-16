export interface OpenAPIOptions {
  title: string;
  version: string;
  description?: string;
  servers?: Array<{ url: string; description?: string }>;
  routes: Array<{
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    summary?: string;
    description?: string;
    parameters?: Array<{ name: string; in: 'query' | 'path' | 'header'; required?: boolean; schema: { type: string } }>;
    requestBody?: { content: Record<string, { schema: unknown }>; required?: boolean };
    responses?: Record<string, { description: string }>;
    tags?: string[];
  }>;
}

export interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, Record<string, unknown>>;
}

export function generateOpenAPI(options: OpenAPIOptions): OpenAPISpec {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of options.routes) {
    if (!paths[route.path]) paths[route.path] = {};

    paths[route.path][route.method.toLowerCase()] = {
      summary: route.summary,
      description: route.description,
      tags: route.tags,
      parameters: route.parameters,
      requestBody: route.requestBody,
      responses: route.responses ?? {
        '200': { description: 'Successful response' },
        '400': { description: 'Bad request' },
        '500': { description: 'Internal server error' },
      },
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: options.title,
      version: options.version,
      description: options.description,
    },
    servers: options.servers,
    paths,
  };
}
